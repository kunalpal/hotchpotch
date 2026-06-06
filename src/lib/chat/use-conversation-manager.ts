'use client';

import { type MutableRefObject, useCallback, useRef, useState } from 'react';
import { useChat } from '@ai-sdk/react';
import { generateId } from 'ai';
import type { UIMessage } from 'ai';
import type { RuntimeManager } from '@/lib/runtime/runtime-manager';

const INJECTED_PREFIX = '__injected__';

// Accepts a ref so the hook never reads runtimeManager.current during render —
// only inside callbacks (onToolCall, handleSubmit), satisfying react-hooks/immutability.
export function useConversationManager(
  runtimeManagerRef: MutableRefObject<RuntimeManager>
) {
  const [input, setInput] = useState('');
  const activePanelId = useRef<string | null>(null);

  const { messages, sendMessage, status } = useChat({
    onToolCall({ toolCall }) {
      if (toolCall.toolName !== 'render_widget') return;
      const { widget_id, update_strategy, payload } = toolCall.input as {
        widget_id: string;
        update_strategy?: 'mount' | 'replace';
        payload: unknown;
      };
      activePanelId.current = widget_id;
      runtimeManagerRef.current.onRenderWidget(
        widget_id,
        payload,
        update_strategy ?? 'mount'
      );
    },
  });

  // Filter out render_widget tool parts and injected synthetic turns from display
  const displayMessages = messages
    .filter((m) => !m.id.startsWith(INJECTED_PREFIX))
    .map((m) => ({
      ...m,
      parts: m.parts.filter(
        (p) => p.type !== 'tool-render_widget' && p.type !== 'step-start'
      ),
    }))
    .filter((m) => m.parts.length > 0);

  const handleInputChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
      setInput(e.target.value);
    },
    []
  );

  const handleSubmit = useCallback(
    (e: React.FormEvent<HTMLFormElement>) => {
      e.preventDefault();
      const trimmed = input.trim();
      if (!trimmed || status !== 'ready') return;

      let text = trimmed;

      if (activePanelId.current) {
        const buffered = runtimeManagerRef.current.flushPassiveBuffer(
          activePanelId.current
        );
        if (buffered.length > 0) {
          const context = buffered
            .map((t) => `[Widget context: ${t}]`)
            .join('\n');
          text = `${context}\n\n${text}`;
        }
      }

      setInput('');
      sendMessage({ text });
    },
    [input, status, sendMessage, runtimeManagerRef]
  );

  const injectTurn = useCallback(
    (content: string) => {
      const messageId = `${INJECTED_PREFIX}${generateId()}`;
      sendMessage({ text: content, messageId });
    },
    [sendMessage]
  );

  return {
    messages: displayMessages as UIMessage[],
    input,
    handleInputChange,
    handleSubmit,
    isLoading: status === 'submitted' || status === 'streaming',
    injectTurn,
  };
}
