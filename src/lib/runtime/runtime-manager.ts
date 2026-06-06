import {
  createEnvelope,
  InboundEnvelopeSchema,
  WIDGET_PAYLOAD_SCHEMAS,
} from '@/lib/widget-protocol';
import type { WidgetManifest } from '@/lib/widget-manifest';
import { WidgetRegistry } from '@/lib/runtime/widget-registry';
import { PendingContextBuffer } from '@/lib/runtime/pending-context-buffer';
import { validateAction } from '@/lib/runtime/injection-guard';
import { renderTemplate } from '@/lib/runtime/template-renderer';

const READY_TIMEOUT_MS = 3000;

export class RuntimeManager {
  private registry = new WidgetRegistry();
  private passiveBuffers = new Map<string, PendingContextBuffer>();
  private messageListener: ((event: MessageEvent) => void) | null = null;

  onWidgetReady: ((panelId: string) => void) | null = null;
  onWidgetFailed: ((panelId: string) => void) | null = null;
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

  mountWidget(
    panelId: string,
    iframeEl: HTMLIFrameElement,
    manifest: WidgetManifest,
    initialPayload: unknown
  ): void {
    const origin = new URL(iframeEl.src, window.location.href).origin;

    const timeout = setTimeout(() => {
      this.registry.setFailed(panelId);
      this.onWidgetFailed?.(panelId);
    }, READY_TIMEOUT_MS);

    this.registry.register(panelId, iframeEl, origin, manifest, timeout);
    this.passiveBuffers.set(panelId, new PendingContextBuffer());

    // Only pre-queue a MOUNT when a real initial payload is supplied. When
    // null, the widget stays in its placeholder state until onRenderWidget
    // fires with actual data, avoiding a double-render flash.
    if (initialPayload !== null && initialPayload !== undefined) {
      const record = this.registry.get(panelId)!;
      record.pendingOutbound.push(
        createEnvelope('MOUNT', {
          widget_id: manifest.widget_id,
          version: '1.0.0',
          initial_payload: initialPayload,
          context: {},
        })
      );
    }
  }

  onRenderWidget(
    panelId: string,
    payload: unknown,
    updateStrategy: 'mount' | 'replace'
  ): void {
    const record = this.registry.get(panelId);
    if (!record) return;
    this.onRenderWidgetStarted?.(panelId);

    // Validate payload against the widget's registered schema
    const schema = WIDGET_PAYLOAD_SCHEMAS[record.manifest.widget_id];
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

    if (record.status === 'ready') {
      const type = updateStrategy === 'replace' ? 'REPLACE' : 'MOUNT';
      this.sendToWidget(panelId, createEnvelope(type, { payload }));
    } else if (record.status === 'loading') {
      const type = updateStrategy === 'replace' ? 'REPLACE' : 'MOUNT';
      record.pendingOutbound.push(createEnvelope(type, { payload }));
    }
  }

  flushPassiveBuffer(panelId: string): string[] {
    return this.passiveBuffers.get(panelId)?.flush() ?? [];
  }

  sendToWidget(
    panelId: string,
    envelope: ReturnType<typeof createEnvelope>
  ): void {
    const record = this.registry.get(panelId);
    if (!record?.iframeRef.contentWindow) return;
    record.iframeRef.contentWindow.postMessage(envelope, record.origin);
  }

  handleMessage(event: MessageEvent): void {
    if (
      !event.data ||
      typeof event.data !== 'object' ||
      event.data.protocol !== 'HOTCHPOTCH_WIDGET_V1'
    )
      return;

    // Reject messages not originating from a registered iframe window.
    // This prevents any same-origin script from spoofing widget events.
    const source = event.source as Window | null;
    const isKnownSource = this.registry
      .getAll()
      .some((r) => r.iframeRef.contentWindow === source);
    if (!isKnownSource) return;

    const parsed = InboundEnvelopeSchema.safeParse(event.data);
    if (!parsed.success) {
      console.warn('[RuntimeManager] Invalid envelope:', parsed.error.issues);
      return;
    }

    const envelope = parsed.data;

    switch (envelope.type) {
      case 'READY':
        this.handleReady(source);
        break;
      case 'ACTION':
        this.handleAction(event);
        break;
      case 'REGISTER_TOOLS':
      case 'REGISTER_SKILLS':
        // Phase 3+ — no-op for MVP
        break;
    }
  }

  private handleReady(source: Window | null): void {
    const record = this.registry
      .getAll()
      .find(
        (r) => r.iframeRef.contentWindow === source && r.status === 'loading'
      );
    if (!record) return;

    this.registry.setReady(record.panelId);
    this.onWidgetReady?.(record.panelId);

    for (const envelope of record.pendingOutbound) {
      this.sendToWidget(
        record.panelId,
        envelope as ReturnType<typeof createEnvelope>
      );
    }
    record.pendingOutbound = [];
  }

  private handleAction(event: MessageEvent): void {
    const validated = validateAction(event, this.registry);
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

    if (validated.template.urgency === 'active') {
      this.onInjectTurn?.(`[Widget] ${rendered}`);
    } else {
      this.passiveBuffers.get(validated.panelId)?.push(rendered);
    }
  }
}
