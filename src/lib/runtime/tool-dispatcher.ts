import { createEnvelope } from '@/lib/widget-protocol';
import type { Envelope, InboundEnvelope } from '@/lib/widget-protocol';
import type { WidgetHost } from '@/lib/runtime/widget-host';
import { RequestBroker } from '@/lib/runtime/request-broker';

/**
 * Manages in-flight widget tool calls.
 *
 * When the model emits a tool_use block for a widget-registered tool,
 * dispatch() sends TOOL_INVOKE to the widget and returns a Promise that
 * resolves when TOOL_RESULT arrives, or rejects on timeout.
 */
export class ToolDispatcher extends RequestBroker {
  private sendFn: (host: WidgetHost, envelope: Envelope) => void = (h, e) =>
    h.send(e);
  onToolComplete: ((panelId: string) => void) | null = null;

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
    const promise = this.track(toolUseId, panelId, timeoutMs, (id) => {
      this.sendFn(host, createEnvelope('TOOL_TIMEOUT', { tool_use_id: id }));
      this.fail(id, new Error(`Tool call ${id} timed out`));
    });

    this.sendFn(
      host,
      createEnvelope('TOOL_INVOKE', {
        tool_use_id: toolUseId,
        name: toolName,
        input,
        timeout_ms: timeoutMs,
      })
    );

    return promise;
  }

  /** Called by RuntimeManager when a TOOL_RESULT envelope arrives */
  handleToolResult(envelope: InboundEnvelope): void {
    if (envelope.type !== 'TOOL_RESULT') return;
    const { tool_use_id, result, is_error } = envelope.payload;
    const panelId = is_error
      ? this.fail(tool_use_id, new Error(String(result)))
      : this.settle(tool_use_id, result);
    if (panelId) this.onToolComplete?.(panelId);
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
