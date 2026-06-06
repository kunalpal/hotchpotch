import { v4 as uuidv4 } from 'uuid';
import type { Envelope, InboundEnvelope } from '@/lib/widget-protocol';
import { PROTOCOL_VERSION } from '@/lib/widget-protocol';
import type { WidgetManifest } from '@/lib/widget-manifest';
import type { HostStatus, WidgetHost } from '@/lib/runtime/widget-host';

export class NativeWidgetHost implements WidgetHost {
  readonly panelId: string;
  readonly manifest: WidgetManifest;

  status: HostStatus = 'loading';
  pendingOutbound: Envelope[] = [];
  registeredTools: string[] = [];

  private messageHandler: ((envelope: InboundEnvelope) => void) | null = null;
  private widgetHandler: ((envelope: Envelope) => void) | null = null;

  constructor(panelId: string, manifest: WidgetManifest) {
    this.panelId = panelId;
    this.manifest = manifest;
  }

  /**
   * Called by useWidgetHost on component mount. Immediately emits READY
   * (no timeout needed for native widgets) and flushes any queued outbound
   * envelopes to the widget handler.
   */
  bind(widgetHandler: (envelope: Envelope) => void): void {
    this.widgetHandler = widgetHandler;
    this.status = 'ready';

    // Synthesise READY → runtime treats native widgets as immediately ready
    const readyEnvelope: InboundEnvelope = {
      protocol: PROTOCOL_VERSION,
      message_id: uuidv4(),
      reply_to: null,
      type: 'READY',
      timestamp: Date.now(),
      payload: {},
    };
    this.messageHandler?.(readyEnvelope);

    // Flush any envelopes that arrived before the widget component mounted
    for (const envelope of this.pendingOutbound) {
      widgetHandler(envelope);
    }
    this.pendingOutbound = [];
  }

  send(envelope: Envelope): void {
    if (this.widgetHandler) {
      this.widgetHandler(envelope);
    } else {
      this.pendingOutbound.push(envelope);
    }
  }

  onMessage(handler: (envelope: InboundEnvelope) => void): void {
    this.messageHandler = handler;
  }

  /**
   * Called by useWidgetHost when the widget sends an inbound message (e.g. ACTION).
   * Routes through the same messageHandler as IframeWidgetHost, so RuntimeManager
   * processes it identically regardless of host type.
   */
  receiveFromWidget(envelope: InboundEnvelope): void {
    this.messageHandler?.(envelope);
  }

  dispose(): void {
    this.widgetHandler = null;
    this.messageHandler = null;
    this.pendingOutbound = [];
  }
}
