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
import { ToolDispatcher } from '@/lib/runtime/tool-dispatcher';
import { SkillRouter } from '@/lib/runtime/skill-router';
import { validateAction } from '@/lib/runtime/injection-guard';
import { renderTemplate } from '@/lib/runtime/template-renderer';

interface RuntimeCallbacks {
  onWidgetFailed: ((panelId: string) => void) | null;
  onPanelUnmounted: ((panelId: string) => void) | null;
  onBackgroundToolComplete: ((panelId: string) => void) | null;
  onToolRegistryUpdate: ((add: string[], remove: string[]) => void) | null;
  onInjectTurn: ((content: string) => void) | null;
  onRenderWidgetStarted: ((panelId: string) => void) | null;
}

export class RuntimeManager {
  private hosts = new Map<string, WidgetHost>();
  private passiveBuffers = new Map<string, PendingContextBuffer>();
  private messageListener: ((event: MessageEvent) => void) | null = null;
  private callbacks: RuntimeCallbacks = {
    onWidgetFailed: null,
    onPanelUnmounted: null,
    onBackgroundToolComplete: null,
    onToolRegistryUpdate: null,
    onInjectTurn: null,
    onRenderWidgetStarted: null,
  };

  readonly toolDispatcher = new ToolDispatcher();
  readonly skillRouter = new SkillRouter(this.hosts);

  setCallbacks(cb: Partial<RuntimeCallbacks>): void {
    Object.assign(this.callbacks, cb);
  }

  start(): void {
    this.messageListener = this.handleMessage.bind(this);
    window.addEventListener('message', this.messageListener);

    this.toolDispatcher.onBackgroundComplete = (panelId) => {
      this.callbacks.onBackgroundToolComplete?.(panelId);
    };
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
      this.callbacks.onWidgetFailed?.(panelId);
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

    // Native widgets are trusted — register manifest tools immediately without
    // a REGISTER_TOOLS handshake (the manifest IS the authority for native widgets)
    if (manifest.tools.length > 0) {
      const namespaced = manifest.tools.map((t) => `${panelId}__${t.name}`);
      host.registeredTools = namespaced;
      this.callbacks.onToolRegistryUpdate?.(namespaced, []);
    }

    return host;
  }

  async onRenderWidget(
    panelId: string,
    payload: unknown,
    updateStrategy: 'mount' | 'replace'
  ): Promise<void> {
    const host = this.hosts.get(panelId);
    if (!host) return;
    this.callbacks.onRenderWidgetStarted?.(panelId);

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

    // Allow the widget's output_processor skill to enrich the payload before delivery
    const enrichedPayload = await this.skillRouter.runOutputProcessor(
      panelId,
      payload
    );

    const type = updateStrategy === 'replace' ? 'REPLACE' : 'MOUNT';
    const envelope = createEnvelope(type, { payload: enrichedPayload });

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
    this.callbacks.onPanelUnmounted?.(panelId);
  }

  getHost(panelId: string): WidgetHost | undefined {
    return this.hosts.get(panelId);
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
        this.handleRegisterTools(panelId, envelope);
        break;
      case 'TOOL_RESULT':
        this.toolDispatcher.handleToolResult(envelope);
        break;
      case 'SKILL_RESULT':
        this.skillRouter.handleSkillResult(envelope);
        break;
      case 'REGISTER_SKILLS':
        // Skills are declared in the manifest; REGISTER_SKILLS is informational only
        break;
    }
  }

  private handleRegisterTools(
    panelId: string,
    envelope: InboundEnvelope
  ): void {
    if (envelope.type !== 'REGISTER_TOOLS') return;
    const host = this.hosts.get(panelId);
    if (!host) return;

    const { tools } = envelope.payload;
    const declaredNames = new Set(host.manifest.tools.map((t) => t.name));

    // Reject entire registration if any tool is not declared in the manifest
    for (const tool of tools) {
      if (!declaredNames.has(tool.name)) {
        console.warn(
          `[RuntimeManager] Undeclared tool "${tool.name}" from panel ${panelId} — rejecting registration`
        );
        host.status = 'failed';
        this.callbacks.onWidgetFailed?.(panelId);
        return;
      }
    }

    const namespaced = tools.map((t) => `${panelId}__${t.name}`);
    host.registeredTools = namespaced;
    this.callbacks.onToolRegistryUpdate?.(namespaced, []);
  }

  private handleReady(panelId: string): void {
    const host = this.hosts.get(panelId);
    if (!host || host.status !== 'loading') return;

    if (host instanceof IframeWidgetHost) {
      host.clearReadyTimeout();
    }
    host.status = 'ready';

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
      this.callbacks.onInjectTurn?.(`[Widget] ${rendered}`);
    } else {
      this.passiveBuffers.get(panelId)?.push(rendered);
    }
  }
}
