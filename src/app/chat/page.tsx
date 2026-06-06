'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import type { ComponentType } from 'react';
import type { UIMessage } from 'ai';
import type { WidgetManifest } from '@/lib/widget-manifest';
import { RuntimeManager } from '@/lib/runtime/runtime-manager';
import { ManifestLoader } from '@/lib/widget-manifest';
import type { NativeWidgetHost } from '@/lib/runtime/native-widget-host';
import { useConversationManager } from '@/lib/chat/use-conversation-manager';
import { TravelMap } from '@/components/widgets/TravelMap';

const PANEL_ID = 'travel.itinerary';
const MANIFEST_URL = '/widgets/travel-itinerary/manifest.json';
const WIDGET_SRC = '/widgets/travel-itinerary/index.html';

/**
 * Registry of native widget React components, keyed by widget_id.
 * Populated incrementally as each native widget is implemented (Tasks 22–24).
 */
const NATIVE_WIDGET_COMPONENTS: Record<
  string,
  ComponentType<{ host: NativeWidgetHost }>
> = {
  'travel.map': TravelMap,
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
  const manifestLoaderRef = useRef(new ManifestLoader());
  const injectTurnRef = useRef<((content: string) => void) | null>(null);

  // Iframe DOM elements keyed by panelId
  const iframeRefs = useRef(new Map<string, HTMLIFrameElement>());
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

  const [panels, setPanels] = useState<PanelEntry[]>([]);
  const [activePanelId, setActivePanelId] = useState<string | null>(null);
  const [splitMode, setSplitMode] = useState(false);

  const {
    messages,
    input,
    handleInputChange,
    handleSubmit,
    isLoading,
    injectTurn,
  } = useConversationManager(runtimeManagerRef);

  useEffect(() => {
    injectTurnRef.current = injectTurn;
  }, [injectTurn]);

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
            iframeRefs.current.set(panelId, el);
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
            iframeRefs.current.delete(panelId);
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
    let unmounted = false;

    rm.onInjectTurn = (content) => injectTurnRef.current?.(content);

    rm.onWidgetFailed = (panelId) => {
      setPanels((prev) =>
        prev.map((p) => (p.panelId === panelId ? { ...p, failed: true } : p))
      );
    };

    rm.onRenderWidgetStarted = (panelId) => {
      setPanels((prev) =>
        prev.map((p) =>
          p.panelId === panelId ? { ...p, hasContent: true } : p
        )
      );
      setActivePanelId(panelId);
    };

    rm.onPanelUnmounted = (panelId) => {
      setPanels((prev) => prev.filter((p) => p.panelId !== panelId));
    };

    rm.onBackgroundToolComplete = (panelId) => {
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
    };

    rm.start();

    manifestLoaderRef.current
      .load(MANIFEST_URL)
      .then((manifest) => {
        if (unmounted) return;
        // Queue mount before adding the panel to state. The iframe callback ref
        // fires after the element appears in the DOM and drains this queue.
        pendingMountsRef.current.set(PANEL_ID, {
          manifest,
          widgetSrc: WIDGET_SRC,
        });
        setPanels((prev) => [
          ...prev,
          {
            panelId: PANEL_ID,
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
        setActivePanelId(PANEL_ID);
      })
      .catch((err: unknown) => {
        if (!unmounted)
          console.error('[ChatPage] Failed to load widget manifest:', err);
      });

    return () => {
      unmounted = true;
      rm.stop();
    };
  }, []);

  return (
    <div
      style={{
        display: 'flex',
        height: '100vh',
        fontFamily: 'system-ui, sans-serif',
      }}
    >
      {/* Left pane — chat */}
      <div
        style={{
          flex: '0 0 50%',
          display: 'flex',
          flexDirection: 'column',
          borderRight: '1px solid #e0e0e0',
        }}
      >
        <ul
          style={{
            flex: 1,
            overflowY: 'auto',
            listStyle: 'none',
            margin: 0,
            padding: '16px',
            display: 'flex',
            flexDirection: 'column',
            gap: '12px',
          }}
        >
          {messages.map((message: UIMessage) => (
            <li
              key={message.id}
              style={{
                alignSelf: message.role === 'user' ? 'flex-end' : 'flex-start',
                maxWidth: '80%',
                background: message.role === 'user' ? '#0070f3' : '#f0f0f0',
                color: message.role === 'user' ? '#fff' : '#111',
                borderRadius: '8px',
                padding: '8px 12px',
                whiteSpace: 'pre-wrap',
                wordBreak: 'break-word',
              }}
            >
              {message.parts
                .filter((p) => p.type === 'text')
                .map((p, i) => (
                  <span key={i}>{p.text}</span>
                ))}
            </li>
          ))}
          {isLoading && (
            <li
              style={{
                alignSelf: 'flex-start',
                color: '#888',
                fontSize: '13px',
              }}
            >
              thinking…
            </li>
          )}
        </ul>

        <form
          onSubmit={handleSubmit}
          style={{
            display: 'flex',
            gap: '8px',
            padding: '12px 16px',
            borderTop: '1px solid #e0e0e0',
          }}
        >
          <textarea
            value={input}
            onChange={handleInputChange}
            placeholder="Ask anything…"
            rows={2}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault();
                e.currentTarget.form?.requestSubmit();
              }
            }}
            style={{
              flex: 1,
              resize: 'none',
              padding: '8px',
              borderRadius: '6px',
              border: '1px solid #ccc',
              fontSize: '14px',
            }}
          />
          <button
            type="submit"
            disabled={isLoading || !input.trim()}
            style={{
              padding: '0 16px',
              borderRadius: '6px',
              border: 'none',
              background: '#0070f3',
              color: '#fff',
              cursor: 'pointer',
              fontSize: '14px',
            }}
          >
            Send
          </button>
        </form>
      </div>

      {/* Right pane — widgets */}
      <div
        style={{
          flex: 1,
          display: 'flex',
          flexDirection: 'column',
          minWidth: 0,
        }}
      >
        {/* Tab bar */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '4px',
            padding: '0 8px',
            borderBottom: '1px solid #e0e0e0',
            height: '36px',
            background: '#fafafa',
            flexShrink: 0,
          }}
        >
          {panels.map((panel) => (
            <div
              key={panel.panelId}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '4px',
                padding: '0 6px 0 8px',
                height: '26px',
                border: '1px solid',
                borderColor:
                  effectiveActivePanelId === panel.panelId
                    ? '#0070f3'
                    : panel.pulsing
                      ? '#34a853'
                      : '#d0d0d0',
                borderRadius: '4px',
                background:
                  effectiveActivePanelId === panel.panelId ? '#e8f0fe' : '#fff',
                fontSize: '13px',
              }}
            >
              {panel.busy && (
                <span
                  style={{
                    width: '6px',
                    height: '6px',
                    borderRadius: '50%',
                    background: '#fbbc04',
                    flexShrink: 0,
                  }}
                />
              )}
              {panel.failed && (
                <span style={{ fontSize: '11px', color: '#ea4335' }}>⚠</span>
              )}
              <button
                onClick={() => setActivePanelId(panel.panelId)}
                style={{
                  background: 'none',
                  border: 'none',
                  padding: 0,
                  cursor: 'pointer',
                  fontSize: '13px',
                  color: panel.failed ? '#ea4335' : '#111',
                  whiteSpace: 'nowrap',
                }}
              >
                {panel.displayName}
              </button>
              <button
                onClick={() => closePanel(panel.panelId)}
                title="Close panel"
                style={{
                  background: 'none',
                  border: 'none',
                  padding: '0 2px',
                  cursor: 'pointer',
                  fontSize: '14px',
                  color: '#999',
                  lineHeight: 1,
                  flexShrink: 0,
                }}
              >
                ×
              </button>
            </div>
          ))}

          {/* Split mode toggle — only when ≥2 panels have content */}
          {panelsWithContent >= 2 && (
            <button
              onClick={() => setSplitMode((m) => !m)}
              style={{
                marginLeft: 'auto',
                padding: '2px 8px',
                border: '1px solid #d0d0d0',
                borderRadius: '4px',
                background: effectiveSplitMode ? '#e8f0fe' : '#fff',
                cursor: 'pointer',
                fontSize: '12px',
                color: '#555',
                whiteSpace: 'nowrap',
              }}
            >
              {effectiveSplitMode ? '⊟ Single' : '⊞ Split'}
            </button>
          )}
        </div>

        {/* Panel area */}
        <div style={{ flex: 1, position: 'relative', overflow: 'hidden' }}>
          {/* Empty state */}
          {panels.length === 0 && (
            <div
              style={{
                position: 'absolute',
                inset: 0,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: '#aaa',
                fontSize: '14px',
              }}
            >
              Widget panel
            </div>
          )}

          {/* Loading / failed placeholder for the active panel before it has content */}
          {(() => {
            const active = panels.find(
              (p) => p.panelId === effectiveActivePanelId
            );
            if (!active || active.hasContent) return null;
            return (
              <div
                style={{
                  position: 'absolute',
                  inset: 0,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  color: '#aaa',
                  fontSize: '14px',
                }}
              >
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

            let left = '0';
            let width = '100%';
            let borderLeft = 'none';

            if (effectiveSplitMode && secondaryPanelId) {
              if (isActive) {
                width = '50%';
              } else if (isSecondary) {
                left = '50%';
                width = '50%';
                borderLeft = '1px solid #e0e0e0';
              }
            }

            const positionStyle = {
              position: 'absolute' as const,
              top: 0,
              bottom: 0,
              left,
              width,
              border: 'none',
              borderLeft,
              display: show ? 'block' : 'none',
            };

            if (panel.hostType === 'native' && panel.nativeHost) {
              const NativeComponent =
                NATIVE_WIDGET_COMPONENTS[panel.panelId] ??
                NATIVE_WIDGET_COMPONENTS[panel.nativeHost.manifest.widget_id];
              if (!NativeComponent) return null;
              return (
                <div
                  key={panel.panelId}
                  style={{ ...positionStyle, overflow: 'auto' }}
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
                style={positionStyle}
              />
            );
          })}
          {/* eslint-enable react-hooks/refs */}
        </div>
      </div>
    </div>
  );
}
