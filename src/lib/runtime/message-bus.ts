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
  | 'outbound-queued-pending-renders'
  | 'state-snapshot-received'
  | 'restoring-snapshot'
  | 'height-changed';

type BusEvents = {
  inbound: [panelId: string, envelope: InboundEnvelope];
};

const OUT_STYLE = 'color:#4CAF50;font-weight:bold';
const IN_STYLE = 'color:#2196F3;font-weight:bold';
const LFE_STYLE = 'color:#FF9800;font-weight:bold';

export class MessageBus {
  private seq = 0;
  private startTime = Date.now();
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  private listeners = new Map<string, Set<(...args: any[]) => void>>();

  on<K extends keyof BusEvents>(
    event: K,
    handler: (...args: BusEvents[K]) => void
  ): () => void {
    let set = this.listeners.get(event);
    if (!set) {
      set = new Set();
      this.listeners.set(event, set);
    }
    set.add(handler);
    return () => set!.delete(handler);
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

  /** Receive an inbound envelope from a widget and emit it to all 'inbound' subscribers. */
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
    this.emit('inbound', panelId, envelope);
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

  private emit<K extends keyof BusEvents>(
    event: K,
    ...args: BusEvents[K]
  ): void {
    this.listeners.get(event)?.forEach((h) => h(...args));
  }
}
