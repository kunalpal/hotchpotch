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

type ChatClientProps = {
  conversationId: string;
  initialMessages: UIMessage[];
};

export function ChatClient({
  conversationId,
  initialMessages,
}: ChatClientProps) {
  const runtimeManagerRef = useRef(new RuntimeManager());

  const iframeRefCallbacks = useRef(
    new Map<string, (el: HTMLIFrameElement | null) => void>()
  );
  const pendingMountsRef = useRef(
    new Map<string, { manifest: WidgetManifest; widgetSrc: string }>()
  );
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

  const onBeforeSend = useCallback(
    async (userMessage: string): Promise<string[]> => {
      try {
        const res = await fetch('/api/select-widgets', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ message: userMessage }),
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

      try {
        return await runtimeManagerRef.current.skillRouter.runContextInjectors(
          userMessage
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
  } = useConversationManager(runtimeManagerRef, onBeforeSend, {
    conversationId,
    initialMessages,
  });

  const getIframeRefCallback = useCallback((panelId: string) => {
    if (!iframeRefCallbacks.current.has(panelId)) {
      iframeRefCallbacks.current.set(
        panelId,
        (el: HTMLIFrameElement | null) => {
          if (el) {
            const pending = pendingMountsRef.current.get(panelId);
            if (pending) {
              pendingMountsRef.current.delete(panelId);
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

  // Replay render_widget calls from history loaded at page load.
  // onToolCall only fires for live stream events, not for initialMessages.
  useEffect(() => {
    if (!initialMessages.length) return;

    const widgetRenders = new Map<
      string,
      { payload: unknown; updateStrategy: 'mount' | 'replace' }
    >();

    for (const msg of initialMessages) {
      if (msg.role !== 'assistant') continue;
      for (const part of msg.parts) {
        if (part.type === 'tool-render_widget' && 'input' in part) {
          const { widget_id, payload, update_strategy } = part.input as {
            widget_id: string;
            payload: unknown;
            update_strategy?: 'mount' | 'replace';
          };
          widgetRenders.set(widget_id, {
            payload,
            updateStrategy: update_strategy ?? 'mount',
          });
        }
      }
    }

    for (const [widgetId, { payload, updateStrategy }] of widgetRenders) {
      void runtimeManagerRef.current.onRenderWidget(
        widgetId,
        payload,
        updateStrategy
      );
      if (NATIVE_MANIFESTS[widgetId]) {
        mountNativePanel(widgetId);
      } else {
        // eslint-disable-next-line react-hooks/set-state-in-effect
        void mountIframePanel(widgetId);
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
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
      <ChatSidebar activeConversationId={conversationId} />
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
