import { createEnvelope } from '@/lib/widget-protocol';
import type { Envelope, InboundEnvelope } from '@/lib/widget-protocol';
import type { WidgetHost } from '@/lib/runtime/widget-host';

interface PendingCall {
  resolve: (result: unknown) => void;
  reject: (err: Error) => void;
  panelId: string;
  timer: ReturnType<typeof setTimeout>;
}

/**
 * Manages in-flight widget tool calls.
 *
 * When the model emits a tool_use block for a widget-registered tool,
 * dispatch() sends TOOL_INVOKE to the widget and returns a Promise that
 * resolves when TOOL_RESULT arrives, or rejects on timeout.
 */
export class ToolDispatcher {
  private pending = new Map<string, PendingCall>();
  private sendFn: (host: WidgetHost, envelope: Envelope) => void = (h, e) =>
    h.send(e);
  /** Callback fired when a background tool completes while a different panel is active */
  onBackgroundComplete: ((panelId: string) => void) | null = null;

  setSendFn(fn: (host: WidgetHost, envelope: Envelope) => void): void {
    this.sendFn = fn;
  }

  dispatch(
    toolUseId: string,
    panelId: string,
    toolName: string,
    input: unknown,
    timeoutMs: number,
    host: WidgetHost
  ): Promise<unknown> {
    return new Promise((resolve, reject) => {
      const timer = setTimeout(() => {
        this.handleTimeout(toolUseId, host);
      }, timeoutMs);

      this.pending.set(toolUseId, { resolve, reject, panelId, timer });

      this.sendFn(
        host,
        createEnvelope('TOOL_INVOKE', {
          tool_use_id: toolUseId,
          name: toolName,
          input,
          timeout_ms: timeoutMs,
        })
      );
    });
  }

  /** Called by RuntimeManager when a TOOL_RESULT envelope arrives */
  handleToolResult(envelope: InboundEnvelope): void {
    if (envelope.type !== 'TOOL_RESULT') return;
    const { tool_use_id, result, is_error } = envelope.payload;
    const pending = this.pending.get(tool_use_id);
    if (!pending) return;

    clearTimeout(pending.timer);
    this.pending.delete(tool_use_id);
    this.onBackgroundComplete?.(pending.panelId);

    if (is_error) {
      pending.reject(new Error(String(result)));
    } else {
      pending.resolve(result);
    }
  }

  private handleTimeout(toolUseId: string, host: WidgetHost): void {
    const pending = this.pending.get(toolUseId);
    if (!pending) return;

    this.pending.delete(toolUseId);

    this.sendFn(
      host,
      createEnvelope('TOOL_TIMEOUT', { tool_use_id: toolUseId })
    );
    pending.reject(new Error(`Tool call ${toolUseId} timed out`));
  }

  /** Returns the panelId owning a given namespaced tool name, or null */
  static parseNamespace(
    namespacedName: string
  ): { panelId: string; toolName: string } | null {
    const idx = namespacedName.indexOf('__');
    if (idx === -1) return null;
    return {
      panelId: namespacedName.slice(0, idx),
      toolName: namespacedName.slice(idx + 2),
    };
  }
}
