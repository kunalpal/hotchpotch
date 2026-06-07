'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import type { ComponentType } from 'react';
import type { UIMessage } from 'ai';
import type { WidgetManifest } from '@/lib/widget-manifest';
import { WidgetManifestSchema } from '@/lib/widget-manifest';
import { RuntimeManager } from '@/lib/runtime/runtime-manager';
import type { NativeWidgetHost } from '@/lib/runtime/native-widget-host';
import { NATIVE_MANIFESTS } from '@/lib/widget-manifest-registry';
import { useConversationManager } from '@/lib/chat/use-conversation-manager';
import { TravelMap } from '@/components/widgets/TravelMap';
import { FinanceBudget } from '@/components/widgets/FinanceBudget';
import { DataNotes } from '@/components/widgets/DataNotes';
import { ChevronDown } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { ButtonGroup } from '@/components/ui/button-group';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Textarea } from '@/components/ui/textarea';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ChatSidebar } from '@/components/layout/chat-sidebar';
import { cn } from '@/utils/ui';
import type { MockTrigger } from '@/lib/mock/mock-responses';

const IS_MOCK_MODE = process.env.NEXT_PUBLIC_MOCK_AI === 'true';

const MOCK_TRIGGER_OPTIONS: Array<{
  trigger: MockTrigger;
  label: string;
  message: string;
}> = [
  { trigger: 'travel-itinerary', label: 'Itinerary', message: 'plan a trip to Japan' },
  { trigger: 'travel-map', label: 'Map', message: 'show me a map of Japan' },
  { trigger: 'budget', label: 'Budget', message: 'show me a budget breakdown' },
  { trigger: 'notes', label: 'Notes', message: 'open my notes' },
  { trigger: 'default', label: 'Default', message: 'hello' },
];

const NATIVE_WIDGET_COMPONENTS: Record<
  string,
  ComponentType<{ host: NativeWidgetHost }>
> = {
  'travel.map': TravelMap,
  'finance.budget': FinanceBudget,
  'data.notes': DataNotes,
};

interface PanelEntry {
  panelId: string;
  displayName: string;
  hostType: 'iframe' | 'native';
  /** iframe only — undefined until mountIframeWidget registers, then set to trigger load */
  src: string | undefined;
  /** native only — the NativeWidgetHost instance for this panel */
  nativeHost: NativeWidgetHost | undefined;
  /** true once onRenderWidgetStarted fires — controls visibility */
  hasContent: boolean;
  busy: boolean;
  /** briefly true when a background tool completes — drives the tab pulse animation */
  pulsing: boolean;
  failed: boolean;
}

export default function ChatPage() {
  const runtimeManagerRef = useRef(new RuntimeManager());

  // Stable callback-ref functions per panelId — must not be recreated on each render
  // so React doesn't call null/element unnecessarily. This is the React-recommended
  // pattern for dynamic ref lists (https://react.dev/learn/manipulating-the-dom-with-refs).
  const iframeRefCallbacks = useRef(
    new Map<string, (el: HTMLIFrameElement | null) => void>()
  );
  // Pending mount data queued before the iframe element exists in the DOM
  const pendingMountsRef = useRef(
    new Map<string, { manifest: WidgetManifest; widgetSrc: string }>()
  );
  // Tracks which widget IDs are already mounted (for add-only selection logic)
  const mountedWidgetIdsRef = useRef(new Set<string>());

  const [panels, setPanels] = useState<PanelEntry[]>([]);
  const [activePanelId, setActivePanelId] = useState<string | null>(null);
  const [splitMode, setSplitMode] = useState(false);

  const mountIframePanel = useCallback(async (widgetId: string) => {
    if (mountedWidgetIdsRef.current.has(widgetId)) return;
    const slug = widgetId.replace(/\./g, '-');
    let manifest: WidgetManifest;
    try {
      const res = await fetch(`/widgets/${slug}/manifest.json`);
      if (!res.ok) return;
      manifest = WidgetManifestSchema.parse(await res.json());
    } catch {
      return;
    }
    mountedWidgetIdsRef.current.add(widgetId);
    pendingMountsRef.current.set(widgetId, { manifest, widgetSrc: manifest.entry! });
    setPanels((prev) => [
      ...prev,
      {
        panelId: widgetId,
        displayName: manifest.name,
        hostType: 'iframe',
        src: undefined,
        nativeHost: undefined,
        hasContent: false,
        busy: false,
        pulsing: false,
        failed: false,
      },
    ]);
  }, []);

  // Mounts a native widget panel and registers it with the runtime
  const mountNativePanel = useCallback((widgetId: string) => {
    if (mountedWidgetIdsRef.current.has(widgetId)) return;
    const manifest = NATIVE_MANIFESTS[widgetId];
    if (!manifest) return;

    mountedWidgetIdsRef.current.add(widgetId);
    const nativeHost = runtimeManagerRef.current.mountNativeWidget(
      widgetId,
      manifest
    );
    // Native widgets become ready immediately on bind (no async handshake)
    setPanels((prev) => [
      ...prev,
      {
        panelId: widgetId,
        displayName: manifest.name,
        hostType: 'native',
        src: undefined,
        nativeHost,
        hasContent: true,
        busy: false,
        pulsing: false,
        failed: false,
      },
    ]);
  }, []);

  // Pre-send hook: widget selection + context injectors.
  // Returns context lines to include in the system prompt for this turn.
  const onBeforeSend = useCallback(
    async (message: string): Promise<string[]> => {
      // Widget selection (add-only; failures are non-fatal)
      try {
        const res = await fetch('/api/select-widgets', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ message }),
        });
        if (res.ok) {
          const { widget_ids } = (await res.json()) as { widget_ids: string[] };
          for (const id of widget_ids) {
            if (NATIVE_MANIFESTS[id]) {
              mountNativePanel(id);
            } else {
              await mountIframePanel(id);
            }
          }
        }
      } catch {
        // non-fatal
      }

      // Context injectors (skill-based; failures are non-fatal)
      try {
        return await runtimeManagerRef.current.skillRouter.runContextInjectors(
          message
        );
      } catch {
        return [];
      }
    },
    [mountNativePanel, mountIframePanel]
  );

  const {
    messages,
    input,
    handleInputChange,
    handleSubmit,
    sendDirectMessage,
    isLoading,
    injectTurn,
  } = useConversationManager(runtimeManagerRef, onBeforeSend);

  // When the active panel is removed, fall back to the last remaining panel.
  // Derived during render rather than via a setState-in-effect to avoid a
  // cascading render cycle.
  const effectiveActivePanelId =
    panels.find((p) => p.panelId === activePanelId) !== undefined
      ? activePanelId
      : (panels[panels.length - 1]?.panelId ?? null);

  // Split is only meaningful when ≥2 panels have content. Derive rather than
  // resetting via an effect so the flag resets without an extra render.
  const panelsWithContent = panels.filter((p) => p.hasContent).length;
  const effectiveSplitMode = splitMode && panelsWithContent >= 2;

  // In split mode, secondary is the first panel with content that isn't active
  const secondaryPanelId = effectiveSplitMode
    ? (panels.find((p) => p.panelId !== effectiveActivePanelId && p.hasContent)
        ?.panelId ?? null)
    : null;

  // Returns a stable ref callback for a given panelId. Only creates a new
  // function on the first call for each panelId, so React doesn't call the
  // null/element cycle on re-renders. Follows the React docs pattern for
  // managing a list of refs with a Map (ref callback inside ref.current).
  const getIframeRefCallback = useCallback((panelId: string) => {
    if (!iframeRefCallbacks.current.has(panelId)) {
      iframeRefCallbacks.current.set(
        panelId,
        (el: HTMLIFrameElement | null) => {
          if (el) {
            const pending = pendingMountsRef.current.get(panelId);
            if (pending) {
              pendingMountsRef.current.delete(panelId);
              // mountIframeWidget registers BEFORE src is set, so READY arrives
              // to an already-registered entry — no handshake race condition.
              runtimeManagerRef.current.mountIframeWidget(
                panelId,
                el,
                pending.manifest,
                pending.widgetSrc
              );
              setPanels((prev) =>
                prev.map((p) =>
                  p.panelId === panelId ? { ...p, src: pending.widgetSrc } : p
                )
              );
            }
          } else {
            iframeRefCallbacks.current.delete(panelId);
          }
        }
      );
    }
    return iframeRefCallbacks.current.get(panelId)!;
  }, []);

  const closePanel = useCallback((panelId: string) => {
    runtimeManagerRef.current.unmountWidget(panelId);
  }, []);

  useEffect(() => {
    const rm = runtimeManagerRef.current;
    rm.setCallbacks({
      onInjectTurn: injectTurn,
      onWidgetFailed: (panelId) =>
        setPanels((prev) =>
          prev.map((p) => (p.panelId === panelId ? { ...p, failed: true } : p))
        ),
      onRenderWidgetStarted: (panelId) => {
        setPanels((prev) =>
          prev.map((p) =>
            p.panelId === panelId ? { ...p, hasContent: true } : p
          )
        );
        setActivePanelId(panelId);
      },
      onPanelUnmounted: (panelId) => {
        mountedWidgetIdsRef.current.delete(panelId);
        setPanels((prev) => prev.filter((p) => p.panelId !== panelId));
      },
      onBackgroundToolComplete: (panelId) => {
        setPanels((prev) =>
          prev.map((p) => (p.panelId === panelId ? { ...p, pulsing: true } : p))
        );
        setTimeout(() => {
          setPanels((prev) =>
            prev.map((p) =>
              p.panelId === panelId ? { ...p, pulsing: false } : p
            )
          );
        }, 1000);
      },
    });
    rm.start();
    return () => rm.stop();
  }, [injectTurn]);

  return (
    <div className="flex h-screen w-full overflow-hidden">
      <ChatSidebar />
      <div className="flex min-w-0 flex-1 overflow-hidden">
        {/* Left pane — chat */}
        <div className="border-border flex w-1/2 flex-none flex-col overflow-hidden border-r">
          <ul className="m-0 flex flex-1 list-none flex-col gap-3 overflow-y-auto p-4">
            {messages.map((message: UIMessage) => (
              <li
                key={message.id}
                className={cn(
                  'max-w-[80%] rounded-lg px-3 py-2 text-sm break-words whitespace-pre-wrap',
                  message.role === 'user'
                    ? 'bg-primary text-primary-foreground self-end'
                    : 'bg-muted text-foreground self-start'
                )}
              >
                {message.parts
                  .filter((p) => p.type === 'text')
                  .map((p, i) => (
                    <span key={i}>{p.text}</span>
                  ))}
              </li>
            ))}
            {isLoading && (
              <li className="text-muted-foreground self-start text-xs">
                thinking…
              </li>
            )}
          </ul>

          <form
            onSubmit={handleSubmit}
            className="border-border flex shrink-0 gap-2 border-t p-3"
          >
            <Textarea
              value={input}
              onChange={handleInputChange}
              placeholder="Ask anything…"
              rows={2}
              className="flex-1 resize-none"
              onKeyDown={(e) => {
                if (e.key === 'Enter' && !e.shiftKey) {
                  e.preventDefault();
                  e.currentTarget.form?.requestSubmit();
                }
              }}
            />
            {IS_MOCK_MODE ? (
              <ButtonGroup>
                <Button type="submit" disabled={isLoading || !input.trim()}>
                  Send
                </Button>
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button type="button" disabled={isLoading} className="px-2">
                      <ChevronDown className="h-4 w-4" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end">
                    {MOCK_TRIGGER_OPTIONS.map(({ trigger, label, message }) => (
                      <DropdownMenuItem
                        key={trigger}
                        onClick={() => {
                          panels.forEach((p) => closePanel(p.panelId));
                          sendDirectMessage(message);
                        }}
                      >
                        {label}
                      </DropdownMenuItem>
                    ))}
                  </DropdownMenuContent>
                </DropdownMenu>
              </ButtonGroup>
            ) : (
              <Button type="submit" disabled={isLoading || !input.trim()}>
                Send
              </Button>
            )}
          </form>
        </div>

        {/* Right pane — widgets */}
        <Tabs
          value={effectiveActivePanelId ?? ''}
          onValueChange={setActivePanelId}
          className="flex min-w-0 flex-1 flex-col"
        >
          {/* Tab bar using shadcn TabsList + TabsTrigger */}
          <TabsList className="border-border bg-muted/30 h-auto w-full justify-start gap-1 rounded-none border-b px-2 py-1">
            {panels.map((panel) => (
              <div key={panel.panelId} className="flex items-center">
                <TabsTrigger
                  value={panel.panelId}
                  className={cn(
                    'h-7 gap-1 px-2 text-xs data-[state=active]:shadow-none',
                    panel.pulsing && 'text-emerald-500'
                  )}
                >
                  {panel.busy && (
                    <span className="size-1.5 shrink-0 rounded-full bg-yellow-400" />
                  )}
                  {panel.failed && <span className="text-destructive">⚠</span>}
                  {panel.displayName}
                </TabsTrigger>
                <button
                  onClick={() => closePanel(panel.panelId)}
                  title="Close panel"
                  className="text-muted-foreground hover:text-foreground px-1 text-sm leading-none"
                >
                  ×
                </button>
              </div>
            ))}

            {panelsWithContent >= 2 && (
              <Button
                variant="outline"
                size="xs"
                onClick={() => setSplitMode((m) => !m)}
                className={cn('ml-auto', effectiveSplitMode && 'bg-primary/10')}
              >
                {effectiveSplitMode ? '⊟ Single' : '⊞ Split'}
              </Button>
            )}
          </TabsList>

          {/* Panel area — content lifecycle managed manually so all panels
                  stay in the DOM (iframes would lose state if unmounted).
                  TabsContent is intentionally omitted; Tabs only drives selection. */}
          <div className="relative flex-1 overflow-hidden">
            {panels.length === 0 && (
              <div className="text-muted-foreground absolute inset-0 flex items-center justify-center text-sm">
                Widget panel
              </div>
            )}

            {/* Loading / failed placeholder for the active panel */}
            {(() => {
              const active = panels.find(
                (p) => p.panelId === effectiveActivePanelId
              );
              if (!active || active.hasContent) return null;
              return (
                <div className="text-muted-foreground absolute inset-0 flex items-center justify-center text-sm">
                  {active.failed
                    ? 'Widget failed to load'
                    : 'Waiting for widget…'}
                </div>
              );
            })()}

            {/* All panels kept in DOM to preserve state; shown/hidden via display.
                    Iframe panels use a stable callback-ref pattern (React-recommended for
                    dynamic ref lists). Native panels render their component directly. */}
            {/* eslint-disable react-hooks/refs */}
            {panels.map((panel) => {
              const isActive = panel.panelId === effectiveActivePanelId;
              const isSecondary = panel.panelId === secondaryPanelId;
              const show = (isActive || isSecondary) && panel.hasContent;

              // Only the computed position values stay as inline styles
              const left = effectiveSplitMode && isSecondary ? '50%' : '0';
              const width =
                effectiveSplitMode && secondaryPanelId ? '50%' : '100%';

              if (panel.hostType === 'native' && panel.nativeHost) {
                const NativeComponent =
                  NATIVE_WIDGET_COMPONENTS[panel.panelId] ??
                  NATIVE_WIDGET_COMPONENTS[panel.nativeHost.manifest.widget_id];
                if (!NativeComponent) return null;
                return (
                  <div
                    key={panel.panelId}
                    className={cn(
                      'absolute top-0 bottom-0 overflow-auto',
                      !show && 'hidden',
                      effectiveSplitMode &&
                        isSecondary &&
                        'border-border border-l'
                    )}
                    style={{ left, width }}
                  >
                    <NativeComponent host={panel.nativeHost} />
                  </div>
                );
              }

              return (
                <iframe
                  key={panel.panelId}
                  ref={getIframeRefCallback(panel.panelId)}
                  src={panel.src}
                  title={panel.displayName}
                  sandbox="allow-scripts allow-forms"
                  className={cn(
                    'absolute top-0 bottom-0 border-none',
                    !show && 'hidden',
                    effectiveSplitMode &&
                      isSecondary &&
                      'border-border border-l'
                  )}
                  style={{ left, width }}
                />
              );
            })}
            {/* eslint-enable react-hooks/refs */}
          </div>
        </Tabs>
      </div>
    </div>
  );
}
