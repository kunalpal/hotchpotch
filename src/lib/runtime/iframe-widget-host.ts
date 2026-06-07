import type { Envelope, InboundEnvelope } from '@/lib/widget-protocol';
import { createEnvelope } from '@/lib/widget-protocol';
import type { WidgetManifest } from '@/lib/widget-manifest';
import type { HostStatus, WidgetHost } from '@/lib/runtime/widget-host';

export class IframeWidgetHost implements WidgetHost {
  readonly panelId: string;
  readonly manifest: WidgetManifest;
  readonly iframeRef: HTMLIFrameElement;
  readonly origin: string;

  status: HostStatus = 'loading';
  pendingOutbound: Envelope[] = [];
  registeredTools: string[] = [];

  private messageHandler: ((envelope: InboundEnvelope) => void) | null = null;
  private readyTimeout: ReturnType<typeof setTimeout> | null = null;

  constructor(
    panelId: string,
    iframeEl: HTMLIFrameElement,
    manifest: WidgetManifest,
    origin: string
  ) {
    this.panelId = panelId;
    this.iframeRef = iframeEl;
    this.manifest = manifest;
    this.origin = origin;
  }

  startReadyTimeout(onTimeout: () => void, ms = 3000): void {
    this.readyTimeout = setTimeout(onTimeout, ms);
  }

  clearReadyTimeout(): void {
    if (this.readyTimeout) {
      clearTimeout(this.readyTimeout);
      this.readyTimeout = null;
    }
  }

  /** Validates that an inbound message event came from this iframe's origin */
  validateOrigin(event: MessageEvent): boolean {
    return event.origin === this.origin;
  }

  send(envelope: Envelope): void {
    this.iframeRef.contentWindow?.postMessage(envelope, '*');
  }

  onMessage(handler: (envelope: InboundEnvelope) => void): void {
    this.messageHandler = handler;
  }

  /** Called by RuntimeManager when it routes a window message event to this host */
  deliverToHost(envelope: InboundEnvelope): void {
    this.messageHandler?.(envelope);
  }

  dispose(): void {
    this.clearReadyTimeout();
    if (this.status === 'ready') {
      this.send(createEnvelope('UNMOUNT', { reason: 'user_closed' }));
    }
    this.messageHandler = null;
    this.pendingOutbound = [];
  }
}
