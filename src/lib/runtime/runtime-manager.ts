import {
  createEnvelope,
  InboundEnvelopeSchema,
  WIDGET_PAYLOAD_SCHEMAS,
} from '@/lib/widget-protocol';
import type { InboundEnvelope } from '@/lib/widget-protocol';
import type { WidgetManifest } from '@/lib/widget-manifest';
import type { WidgetHost } from '@/lib/runtime/widget-host';
import { IframeWidgetHost } from '@/lib/runtime/iframe-widget-host';
import { NativeWidgetHost } from '@/lib/runtime/native-widget-host';
import { PendingContextBuffer } from '@/lib/runtime/pending-context-buffer';
import { validateAction } from '@/lib/runtime/injection-guard';
import { renderTemplate } from '@/lib/runtime/template-renderer';

export class RuntimeManager {
  private hosts = new Map<string, WidgetHost>();
  private passiveBuffers = new Map<string, PendingContextBuffer>();
  private messageListener: ((event: MessageEvent) => void) | null = null;

  onWidgetReady: ((panelId: string) => void) | null = null;
  onWidgetFailed: ((panelId: string) => void) | null = null;
  onPanelUnmounted: ((panelId: string) => void) | null = null;
  onBackgroundToolComplete: ((panelId: string) => void) | null = null;
  onInjectTurn: ((content: string) => void) | null = null;
  onRenderWidgetStarted: ((panelId: string) => void) | null = null;

  start(): void {
    this.messageListener = this.handleMessage.bind(this);
    window.addEventListener('message', this.messageListener);
  }

  stop(): void {
    if (this.messageListener) {
      window.removeEventListener('message', this.messageListener);
      this.messageListener = null;
    }
  }

  mountIframeWidget(
    panelId: string,
    iframeEl: HTMLIFrameElement,
    manifest: WidgetManifest,
    widgetSrc: string
  ): void {
    const origin = new URL(widgetSrc, window.location.href).origin;
    const host = new IframeWidgetHost(panelId, iframeEl, manifest, origin);

    host.startReadyTimeout(() => {
      host.status = 'failed';
      this.onWidgetFailed?.(panelId);
    });

    host.onMessage((envelope) => this.handleInbound(panelId, envelope));
    this.hosts.set(panelId, host);
    this.passiveBuffers.set(panelId, new PendingContextBuffer());
  }

  mountNativeWidget(
    panelId: string,
    manifest: WidgetManifest
  ): NativeWidgetHost {
    const host = new NativeWidgetHost(panelId, manifest);

    host.onMessage((envelope) => this.handleInbound(panelId, envelope));
    this.hosts.set(panelId, host);
    this.passiveBuffers.set(panelId, new PendingContextBuffer());

    return host;
  }

  onRenderWidget(
    panelId: string,
    payload: unknown,
    updateStrategy: 'mount' | 'replace'
  ): void {
    const host = this.hosts.get(panelId);
    if (!host) return;
    this.onRenderWidgetStarted?.(panelId);

    // Validate payload against the widget's registered schema
    const schema = WIDGET_PAYLOAD_SCHEMAS[host.manifest.widget_id];
    if (schema) {
      const result = schema.safeParse(payload);
      if (!result.success) {
        console.error(
          `[RuntimeManager] Payload schema mismatch for ${panelId}:`,
          result.error
        );
        return;
      }
    }

    const type = updateStrategy === 'replace' ? 'REPLACE' : 'MOUNT';
    const envelope = createEnvelope(type, { payload });

    if (host.status === 'ready') {
      host.send(envelope);
    } else if (host.status === 'loading') {
      host.pendingOutbound.push(envelope);
    }
  }

  unmountWidget(panelId: string): void {
    const host = this.hosts.get(panelId);
    if (!host) return;
    host.dispose();
    this.hosts.delete(panelId);
    this.passiveBuffers.delete(panelId);
    this.onPanelUnmounted?.(panelId);
  }

  flushPassiveBuffer(panelId: string): string[] {
    return this.passiveBuffers.get(panelId)?.flush() ?? [];
  }

  /** Global window.message handler — routes to the matching IframeWidgetHost */
  handleMessage(event: MessageEvent): void {
    if (
      !event.data ||
      typeof event.data !== 'object' ||
      event.data.protocol !== 'HOTCHPOTCH_WIDGET_V1'
    )
      return;

    // Find the IframeWidgetHost whose iframe's contentWindow matches the sender
    const source = event.source as Window | null;
    let matchedHost: IframeWidgetHost | null = null;
    for (const host of this.hosts.values()) {
      if (
        host instanceof IframeWidgetHost &&
        host.iframeRef.contentWindow === source
      ) {
        matchedHost = host;
        break;
      }
    }
    if (!matchedHost) return;

    // Validate origin before parsing the envelope
    if (!matchedHost.validateOrigin(event)) return;

    const parsed = InboundEnvelopeSchema.safeParse(event.data);
    if (!parsed.success) {
      console.warn('[RuntimeManager] Invalid envelope:', parsed.error.issues);
      return;
    }

    matchedHost.deliverToHost(parsed.data);
  }

  /** Unified inbound handler called by both iframe and native hosts */
  private handleInbound(panelId: string, envelope: InboundEnvelope): void {
    switch (envelope.type) {
      case 'READY':
        this.handleReady(panelId);
        break;
      case 'ACTION':
        this.handleAction(panelId, envelope);
        break;
      case 'REGISTER_TOOLS':
      case 'REGISTER_SKILLS':
        // Phase 3+ — no-op until Task 25
        break;
    }
  }

  private handleReady(panelId: string): void {
    const host = this.hosts.get(panelId);
    if (!host || host.status !== 'loading') return;

    if (host instanceof IframeWidgetHost) {
      host.clearReadyTimeout();
    }
    host.status = 'ready';
    this.onWidgetReady?.(panelId);

    for (const envelope of host.pendingOutbound) {
      host.send(envelope);
    }
    host.pendingOutbound = [];
  }

  private handleAction(panelId: string, envelope: InboundEnvelope): void {
    if (envelope.type !== 'ACTION') return;

    const validated = validateAction(panelId, envelope, this.hosts);
    if (!validated) return;

    let rendered: string;
    try {
      rendered = renderTemplate(
        validated.template.template,
        validated.sanitisedData
      );
    } catch (err) {
      console.error('[RuntimeManager] Template rendering failed:', err);
      return;
    }

    if (validated.urgency === 'active') {
      this.onInjectTurn?.(`[Widget] ${rendered}`);
    } else {
      this.passiveBuffers.get(panelId)?.push(rendered);
    }
  }
}
