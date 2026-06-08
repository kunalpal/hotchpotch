import { v4 as uuidv4 } from 'uuid';
import type { Envelope, InboundEnvelope } from '@/lib/widget-protocol';
import { PROTOCOL_VERSION } from '@/lib/widget-protocol';
import type { WidgetManifest } from '@/lib/widget-manifest';
import type { HostStatus, WidgetHost } from '@/lib/runtime/widget-host';

export class NativeWidgetHost implements WidgetHost {
  readonly panelId: string;
  readonly manifest: WidgetManifest;

  status: HostStatus = 'loading';
  registeredTools: string[] = [];

  private messageHandler: ((envelope: InboundEnvelope) => void) | null = null;
  private widgetHandler: ((envelope: Envelope) => void) | null = null;

  constructor(panelId: string, manifest: WidgetManifest) {
    this.panelId = panelId;
    this.manifest = manifest;
  }

  /**
   * Called by useWidgetHost on component mount. Emits READY through the bus
   * (via messageHandler, wired to bus.receive in mountNativeWidget), which
   * triggers RuntimeManager.handleReady to set status='ready' and flush any
   * queued outbound envelopes through bus.send().
   */
  bind(widgetHandler: (envelope: Envelope) => void): void {
    this.widgetHandler = widgetHandler;
    // Emit READY while still 'loading' so handleReady processes it normally.
    // RuntimeManager.handleReady sets status='ready' and flushes pendingOutbound.
    this.messageHandler?.({
      protocol: PROTOCOL_VERSION,
      message_id: uuidv4(),
      reply_to: null,
      type: 'READY',
      timestamp: Date.now(),
      payload: {},
    });
  }

  send(envelope: Envelope): void {
    if (this.widgetHandler) {
      this.widgetHandler(envelope);
    } else {
      console.warn(
        '[NativeWidgetHost] send() called before bind() — dropping',
        envelope.type
      );
    }
  }

  onMessage(handler: (envelope: InboundEnvelope) => void): void {
    this.messageHandler = handler;
  }

  /**
   * Called by useWidgetHost when the widget sends an inbound message (e.g. ACTION).
   * Routes through messageHandler (wired to bus.receive), so RuntimeManager
   * processes it identically to iframe widget messages.
   */
  receiveFromWidget(envelope: InboundEnvelope): void {
    this.messageHandler?.(envelope);
  }

  dispose(): void {
    this.widgetHandler = null;
    this.messageHandler = null;
  }
}
