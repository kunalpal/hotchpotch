import type { Envelope, InboundEnvelope } from '@/lib/widget-protocol';
import type { WidgetHost } from '@/lib/runtime/widget-host';

export type LifecycleEvent =
  | 'iframe-host-registered'
  | 'native-host-registered'
  | 'widget-ready'
  | 'widget-failed'
  | 'widget-unmounting'
  | 'widget-unmounted'
  | 'pending-render-queued'
  | 'pending-render-flushed'
  | 'outbound-queued-loading'
  | 'outbound-queued-pending-renders';

const OUT_STYLE = 'color:#4CAF50;font-weight:bold';
const IN_STYLE = 'color:#2196F3;font-weight:bold';
const LFE_STYLE = 'color:#FF9800;font-weight:bold';

export class MessageBus {
  private seq = 0;
  private startTime = Date.now();
  private inboundHandler:
    | ((panelId: string, envelope: InboundEnvelope) => void)
    | null = null;

  onInbound(
    handler: (panelId: string, envelope: InboundEnvelope) => void
  ): void {
    this.inboundHandler = handler;
  }

  /** Send an outbound envelope from RuntimeManager/ToolDispatcher/SkillRouter to a widget host. */
  send(host: WidgetHost, envelope: Envelope): void {
    const n = ++this.seq;
    const t = Date.now() - this.startTime;
    console.log(
      `%c[Bus +${t}ms] OUT #${n}`,
      OUT_STYLE,
      `panelId=${host.panelId}`,
      `type=${envelope.type}`,
      `host-status=${host.status}`,
      envelope.payload
    );
    host.send(envelope);
  }

  /** Receive an inbound envelope from a widget and route it to the handler registered via onInbound. */
  receive(panelId: string, envelope: InboundEnvelope): void {
    const n = ++this.seq;
    const t = Date.now() - this.startTime;
    console.log(
      `%c[Bus +${t}ms] IN  #${n}`,
      IN_STYLE,
      `panelId=${panelId}`,
      `type=${envelope.type}`,
      envelope.payload
    );
    this.inboundHandler?.(panelId, envelope);
  }

  /** Log a widget/panel lifecycle event (no message routing — informational only). */
  lifecycle(
    event: LifecycleEvent,
    panelId: string,
    detail?: Record<string, unknown>
  ): void {
    const n = ++this.seq;
    const t = Date.now() - this.startTime;
    console.log(
      `%c[Bus +${t}ms] LFE #${n}`,
      LFE_STYLE,
      event,
      `panelId=${panelId}`,
      detail ?? ''
    );
  }
}
