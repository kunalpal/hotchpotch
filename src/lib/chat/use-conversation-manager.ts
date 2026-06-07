'use client';

import {
  type MutableRefObject,
  useCallback,
  useEffect,
  useRef,
  useState,
} from 'react';
import { useChat } from '@ai-sdk/react';
import { generateId } from 'ai';
import type { UIMessage } from 'ai';
import type { RuntimeManager } from '@/lib/runtime/runtime-manager';
import { ToolDispatcher } from '@/lib/runtime/tool-dispatcher';

const INJECTED_PREFIX = '__injected__';

// Accepts a ref so the hook never reads runtimeManager.current during render —
// only inside callbacks (onToolCall, handleSubmit), satisfying react-hooks/immutability.
export function useConversationManager(
  runtimeManagerRef: MutableRefObject<RuntimeManager>,
  onBeforeSend?: (message: string) => Promise<string[]>
) {
  const [input, setInput] = useState('');
  const lastRenderedWidgetIdRef = useRef<string | null>(null);
  // Stable ref for addToolResult so the onToolCall closure can call it without
  // capturing a stale value. Typed as `any` to avoid the SDK's complex generic.
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const addToolResultRef = useRef<((params: any) => void) | null>(null);

  const { messages, sendMessage, status, addToolResult, setMessages } = useChat(
    {
      onToolCall({ toolCall }) {
        if (toolCall.toolName === 'render_widget') {
          const { widget_id, update_strategy, payload } = toolCall.input as {
            widget_id: string;
            update_strategy?: 'mount' | 'replace';
            payload: unknown;
          };
          lastRenderedWidgetIdRef.current = widget_id;
          void runtimeManagerRef.current.onRenderWidget(
            widget_id,
            payload,
            update_strategy ?? 'mount'
          );
          addToolResultRef.current?.({
            toolCallId: toolCall.toolCallId,
            output: 'rendered',
          });
          return;
        }

        // Widget-registered tool call — dispatch and resolve via addToolResult
        const parsed = ToolDispatcher.parseNamespace(toolCall.toolName);
        if (!parsed) return;

        const rm = runtimeManagerRef.current;
        const host = rm.getHost(parsed.panelId);
        if (!host) return;

        const toolDef = host.manifest.tools.find(
          (t) => t.name === parsed.toolName
        );
        const timeoutMs = toolDef?.timeout_ms ?? 30000;
        const toolName = toolCall.toolName;
        const toolCallId = toolCall.toolCallId;

        rm.toolDispatcher
          .dispatch(
            toolCallId,
            parsed.panelId,
            parsed.toolName,
            toolCall.input,
            timeoutMs,
            host
          )
          .then((output) => {
            addToolResultRef.current?.({ tool: toolName, toolCallId, output });
          })
          .catch((err: unknown) => {
            addToolResultRef.current?.({
              tool: toolName,
              toolCallId,
              state: 'output-error',
              errorText: String(err),
            });
          });
      },
    }
  );

  useEffect(() => {
    addToolResultRef.current = addToolResult;
  });

  // Filter out render_widget tool parts and injected synthetic turns from display
  const displayMessages = messages
    .filter((m) => !m.id.startsWith(INJECTED_PREFIX))
    .map((m) => ({
      ...m,
      parts: m.parts.filter((p) => {
        if (p.type === 'step-start') return false;
        // Hide render_widget and all widget tool calls (panelId__toolName)
        if (p.type.startsWith('tool-')) {
          const toolName = p.type.slice('tool-'.length);
          if (toolName === 'render_widget' || toolName.includes('__'))
            return false;
        }
        return true;
      }),
    }))
    .filter((m) => m.parts.length > 0);

  const handleInputChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
      setInput(e.target.value);
    },
    []
  );

  const doSend = useCallback(
    async (trimmed: string) => {
      const rm = runtimeManagerRef.current;
      const intercepted = await rm.skillRouter.runInterceptors(trimmed);
      if (intercepted) {
        const userMsg = {
          id: generateId(),
          role: 'user' as const,
          content: trimmed,
          parts: [{ type: 'text' as const, text: trimmed }],
        };
        const assistantMsg = {
          id: generateId(),
          role: 'assistant' as const,
          content: intercepted.response,
          parts: [{ type: 'text' as const, text: intercepted.response }],
        };
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        setMessages((prev: any[]) => [...prev, userMsg, assistantMsg]);
        if (intercepted.widgetPayload !== null) {
          void rm.onRenderWidget(
            intercepted.panelId,
            intercepted.widgetPayload,
            'replace'
          );
        }
        return;
      }

      const contextLines = onBeforeSend ? await onBeforeSend(trimmed) : [];

      let text = trimmed;

      if (lastRenderedWidgetIdRef.current) {
        const buffered = runtimeManagerRef.current.flushPassiveBuffer(
          lastRenderedWidgetIdRef.current
        );
        if (buffered.length > 0) {
          const context = buffered
            .map((t) => `[Widget context: ${t}]`)
            .join('\n');
          text = `${context}\n\n${text}`;
        }
      }

      if (contextLines.length > 0) {
        const injected = contextLines.map((l) => `[Context: ${l}]`).join('\n');
        text = `${injected}\n\n${text}`;
      }
      sendMessage({ text });
    },
    [sendMessage, setMessages, runtimeManagerRef, onBeforeSend]
  );

  const handleSubmit = useCallback(
    (e: React.FormEvent<HTMLFormElement>) => {
      e.preventDefault();
      const trimmed = input.trim();
      if (!trimmed || status !== 'ready') return;
      setInput('');
      void doSend(trimmed);
    },
    [input, status, doSend]
  );

  const sendDirectMessage = useCallback(
    (text: string) => {
      const trimmed = text.trim();
      if (!trimmed || status !== 'ready') return;
      void doSend(trimmed);
    },
    [status, doSend]
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
    sendDirectMessage,
    isLoading: status === 'submitted' || status === 'streaming',
    injectTurn,
  };
}
