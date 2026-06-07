'use client';

import 'react-split-pane/styles.css';

import { useCallback, useEffect, useRef, useState } from 'react';
import { SplitPane, Pane } from 'react-split-pane';
import type { UIMessage } from 'ai';
import type { WidgetManifest } from '@/lib/widget-manifest';
import { WidgetManifestSchema } from '@/lib/widget-manifest';
import { RuntimeManager } from '@/lib/runtime/runtime-manager';
import { NATIVE_MANIFESTS } from '@/lib/widget-manifest-registry';
import { useConversationManager } from '@/lib/chat/use-conversation-manager';
import { ChatSidebar } from '@/components/layout/chat-sidebar';
import { ChatPane } from '@/components/chat/chat-pane';
import { WidgetPanel } from '@/components/chat/widget-panel';
import type { PanelEntry } from '@/components/chat/widget-panel';

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
    pendingMountsRef.current.set(widgetId, {
      manifest,
      widgetSrc: manifest.entry!,
    });
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

  const hasWidgets = panels.length > 0;

  return (
    <div className="flex h-screen w-full overflow-hidden">
      <ChatSidebar />
      <div className="min-w-0 flex-1 overflow-hidden">
        {hasWidgets ? (
          <SplitPane direction="horizontal">
            <Pane minSize="280px" defaultSize="50%">
              <ChatPane
                messages={messages as UIMessage[]}
                input={input}
                handleInputChange={handleInputChange}
                handleSubmit={handleSubmit}
                isLoading={isLoading}
                sendDirectMessage={sendDirectMessage}
              />
            </Pane>
            <Pane minSize="280px">
              <WidgetPanel
                panels={panels}
                activePanelId={activePanelId}
                setActivePanelId={setActivePanelId}
                splitMode={splitMode}
                setSplitMode={setSplitMode}
                closePanel={closePanel}
                getIframeRefCallback={getIframeRefCallback}
              />
            </Pane>
          </SplitPane>
        ) : (
          <ChatPane
            messages={messages as UIMessage[]}
            input={input}
            handleInputChange={handleInputChange}
            handleSubmit={handleSubmit}
            isLoading={isLoading}
            sendDirectMessage={sendDirectMessage}
            className="h-full border-r-0"
          />
        )}
      </div>
    </div>
  );
}
