'use client';

import { useEffect, useRef, useState } from 'react';
import type { UIMessage } from 'ai';
import { RuntimeManager } from '@/lib/runtime/runtime-manager';
import { ManifestLoader } from '@/lib/widget-manifest';
import { useConversationManager } from '@/lib/chat/use-conversation-manager';

const PANEL_ID = 'travel.itinerary';
const MANIFEST_URL = '/widgets/travel-itinerary/manifest.json';
const WIDGET_SRC = '/widgets/travel-itinerary/index.html';

export default function ChatPage() {
  // useRef — not useState — so mutation in effects doesn't trigger immutability rule
  const runtimeManagerRef = useRef(new RuntimeManager());
  const manifestLoaderRef = useRef(new ManifestLoader());
  const iframeRef = useRef<HTMLIFrameElement>(null);
  const injectTurnRef = useRef<((content: string) => void) | null>(null);
  const [widgetVisible, setWidgetVisible] = useState(false);

  const {
    messages,
    input,
    handleInputChange,
    handleSubmit,
    isLoading,
    injectTurn,
  } = useConversationManager(runtimeManagerRef);

  // Keep injectTurnRef in sync so the RuntimeManager callback always has the latest closure
  useEffect(() => {
    injectTurnRef.current = injectTurn;
  }, [injectTurn]);

  // Wire callbacks, start listener, and pre-mount the widget
  useEffect(() => {
    const rm = runtimeManagerRef.current;

    rm.onInjectTurn = (content) => injectTurnRef.current?.(content);
    rm.onRenderWidgetStarted = () => setWidgetVisible(true);
    rm.onWidgetFailed = () =>
      console.warn('[ChatPage] Widget failed to handshake within 3 s');

    rm.start();

    manifestLoaderRef.current.load(MANIFEST_URL).then((manifest) => {
      if (iframeRef.current) {
        rm.mountWidget(PANEL_ID, iframeRef.current, manifest, null);
      }
    });

    return () => rm.stop();
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

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

      {/* Right pane — widget */}
      <div style={{ flex: 1, position: 'relative' }}>
        <iframe
          ref={iframeRef}
          src={WIDGET_SRC}
          title="Widget panel"
          style={{
            width: '100%',
            height: '100%',
            border: 'none',
            display: widgetVisible ? 'block' : 'none',
          }}
        />
        {!widgetVisible && (
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
      </div>
    </div>
  );
}
