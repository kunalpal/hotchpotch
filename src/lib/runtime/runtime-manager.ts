import {
  createEnvelope,
  InboundEnvelopeSchema,
  WIDGET_PAYLOAD_SCHEMAS,
} from '@/lib/widget-protocol';
import type { Envelope, InboundEnvelope } from '@/lib/widget-protocol';
import type { WidgetManifest } from '@/lib/widget-manifest';
import type { WidgetHost } from '@/lib/runtime/widget-host';
import { IframeWidgetHost } from '@/lib/runtime/iframe-widget-host';
import { NativeWidgetHost } from '@/lib/runtime/native-widget-host';
import { PendingContextBuffer } from '@/lib/runtime/pending-context-buffer';
import { ToolDispatcher } from '@/lib/runtime/tool-dispatcher';
import { SkillRouter } from '@/lib/runtime/skill-router';
import { MessageBus } from '@/lib/runtime/message-bus';
import { validateAction } from '@/lib/runtime/injection-guard';
import { renderTemplate } from '@/lib/runtime/template-renderer';

interface RuntimeCallbacks {
  onWidgetFailed: ((panelId: string) => void) | null;
  onPanelUnmounted: ((panelId: string) => void) | null;
  onToolComplete: ((panelId: string) => void) | null;
  onToolRegistryUpdate: ((add: string[], remove: string[]) => void) | null;
  onInjectTurn: ((content: string) => void) | null;
  onRenderWidgetStarted: ((panelId: string) => void) | null;
  onStateSnapshot:
    | ((panelId: string, state: Record<string, unknown>) => void)
    | null;
  onHeightChanged: ((panelId: string, height: number) => void) | null;
}

export class RuntimeManager {
  private hosts = new Map<string, WidgetHost>();
  private passiveBuffers = new Map<string, PendingContextBuffer>();
  private pendingRenders = new Map<
    string,
    Array<{ payload: unknown; updateStrategy: 'mount' | 'replace' }>
  >();
  // Outbound envelopes queued while a host is registered but not yet ready.
  // Owned here rather than on WidgetHost so handleReady can flush via bus.send()
  // for both iframe and native hosts symmetrically.
  private pendingOutbound = new Map<string, Envelope[]>();
  // Last known state for each widget, seeded from DB on load and updated on
  // every STATE_SNAPSHOT. Used to send RESTORE_STATE after READY.
  private snapshots = new Map<string, Record<string, unknown>>();
  private messageListener: ((event: MessageEvent) => void) | null = null;
  private busUnsub: (() => void) | null = null;
  private callbacks: RuntimeCallbacks = {
    onWidgetFailed: null,
    onPanelUnmounted: null,
    onToolComplete: null,
    onToolRegistryUpdate: null,
    onInjectTurn: null,
    onRenderWidgetStarted: null,
    onStateSnapshot: null,
    onHeightChanged: null,
  };

  readonly bus = new MessageBus();
  readonly toolDispatcher = new ToolDispatcher();
  readonly skillRouter = new SkillRouter(this.hosts);

  setCallbacks(cb: Partial<RuntimeCallbacks>): void {
    Object.assign(this.callbacks, cb);
  }

  start(): void {
    this.busUnsub = this.bus.on('inbound', (panelId, envelope) =>
      this.handleInbound(panelId, envelope)
    );

    const sendFn = (host: WidgetHost, envelope: Envelope) =>
      this.bus.send(host, envelope);
    this.toolDispatcher.setSendFn(sendFn);
    this.skillRouter.setSendFn(sendFn);

    this.messageListener = this.handleMessage.bind(this);
    window.addEventListener('message', this.messageListener);

    this.toolDispatcher.onToolComplete = (panelId) => {
      this.callbacks.onToolComplete?.(panelId);
    };
  }

  stop(): void {
    this.busUnsub?.();
    this.busUnsub = null;
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
    const pending = this.pendingRenders.get(panelId);
    this.bus.lifecycle('iframe-host-registered', panelId, {
      widgetId: manifest.widget_id,
      hasPendingRenders: !!pending,
      pendingCount: pending?.length ?? 0,
    });

    const origin = new URL(widgetSrc, window.location.href).origin;
    const host = new IframeWidgetHost(panelId, iframeEl, manifest, origin);

    host.startReadyTimeout(() => {
      host.status = 'failed';
      this.bus.lifecycle('widget-failed', panelId, { reason: 'ready-timeout' });
      this.callbacks.onWidgetFailed?.(panelId);
    });

    host.onMessage((envelope) => this.bus.receive(panelId, envelope));
    this.hosts.set(panelId, host);
    this.passiveBuffers.set(panelId, new PendingContextBuffer());

    if (pending) {
      this.pendingRenders.delete(panelId);
      this.bus.lifecycle('pending-render-flushed', panelId, {
        count: pending.length,
      });
      for (const { payload, updateStrategy } of pending) {
        void this.onRenderWidget(panelId, payload, updateStrategy);
      }
    }
  }

  mountNativeWidget(
    panelId: string,
    manifest: WidgetManifest
  ): NativeWidgetHost {
    const pending = this.pendingRenders.get(panelId);
    this.bus.lifecycle('native-host-registered', panelId, {
      widgetId: manifest.widget_id,
      toolCount: manifest.tools.length,
      hasPendingRenders: !!pending,
      pendingCount: pending?.length ?? 0,
    });

    const host = new NativeWidgetHost(panelId, manifest);

    host.onMessage((envelope) => this.bus.receive(panelId, envelope));
    this.hosts.set(panelId, host);
    this.passiveBuffers.set(panelId, new PendingContextBuffer());

    // Native widgets are trusted — register manifest tools immediately without
    // a REGISTER_TOOLS handshake (the manifest IS the authority for native widgets)
    if (manifest.tools.length > 0) {
      const namespaced = manifest.tools.map((t) => `${panelId}__${t.name}`);
      host.registeredTools = namespaced;
      this.callbacks.onToolRegistryUpdate?.(namespaced, []);
    }

    if (pending) {
      this.pendingRenders.delete(panelId);
      this.bus.lifecycle('pending-render-flushed', panelId, {
        count: pending.length,
      });
      for (const { payload, updateStrategy } of pending) {
        void this.onRenderWidget(panelId, payload, updateStrategy);
      }
    }

    return host;
  }

  async onRenderWidget(
    panelId: string,
    payload: unknown,
    updateStrategy: 'mount' | 'replace'
  ): Promise<void> {
    const host = this.hosts.get(panelId);
    if (!host) {
      const queue = this.pendingRenders.get(panelId) ?? [];
      queue.push({ payload, updateStrategy });
      this.pendingRenders.set(panelId, queue);
      this.bus.lifecycle('outbound-queued-pending-renders', panelId, {
        updateStrategy,
        queueLength: queue.length,
        reason: 'no-host-yet',
      });
      return;
    }
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
      this.bus.send(host, envelope);
    } else if (host.status === 'loading') {
      this.bus.lifecycle('outbound-queued-loading', panelId, {
        type: envelope.type,
        reason: 'host-not-ready',
      });
      const queue = this.pendingOutbound.get(panelId) ?? [];
      queue.push(envelope);
      this.pendingOutbound.set(panelId, queue);
    }
  }

  unmountWidget(panelId: string): void {
    const host = this.hosts.get(panelId);
    this.bus.lifecycle('widget-unmounting', panelId, {
      hadHost: !!host,
      hostStatus: host?.status ?? 'none',
      hasPendingRenders: this.pendingRenders.has(panelId),
      pendingRenderCount: this.pendingRenders.get(panelId)?.length ?? 0,
    });
    if (host) {
      host.dispose();
      this.hosts.delete(panelId);
      this.passiveBuffers.delete(panelId);
    }
    // Always clean up all queues and notify the UI, even if the iframe host
    // never registered (panel closed before the element was bound to the DOM).
    this.pendingRenders.delete(panelId);
    this.pendingOutbound.delete(panelId);
    this.callbacks.onPanelUnmounted?.(panelId);
    this.bus.lifecycle('widget-unmounted', panelId, {});
  }

  getHost(panelId: string): WidgetHost | undefined {
    return this.hosts.get(panelId);
  }

  flushAllPassiveBuffers(): string[] {
    const all: string[] = [];
    for (const buffer of this.passiveBuffers.values()) {
      all.push(...buffer.flush());
    }
    return all;
  }

  /** Seed a widget's snapshot from DB at page load, before the widget mounts. */
  loadSnapshot(widgetId: string, state: Record<string, unknown>): void {
    this.snapshots.set(widgetId, state);
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

    const parsed = InboundEnvelopeSchema.safeParse(event.data);
    if (!parsed.success) {
      console.warn('[RuntimeManager] Invalid envelope:', parsed.error.issues);
      return;
    }

    matchedHost.deliverToHost(parsed.data);
  }

  /** Unified inbound handler — called by the bus 'inbound' event for both iframe and native hosts */
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
      case 'STATE_SNAPSHOT': {
        const { state } = envelope.payload;
        this.snapshots.set(panelId, state);
        this.bus.lifecycle('state-snapshot-received', panelId, {
          keys: Object.keys(state),
        });
        this.callbacks.onStateSnapshot?.(panelId, state);
        break;
      }
      case 'HEIGHT_CHANGED':
        this.bus.lifecycle('height-changed', panelId, {
          height: envelope.payload.height,
        });
        this.callbacks.onHeightChanged?.(panelId, envelope.payload.height);
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

    const queued = this.pendingOutbound.get(panelId) ?? [];
    this.pendingOutbound.delete(panelId);
    this.bus.lifecycle('widget-ready', panelId, {
      pendingOutboundCount: queued.length,
    });

    for (const envelope of queued) {
      this.bus.send(host, envelope);
    }

    const snapshot = this.snapshots.get(panelId);
    if (snapshot) {
      this.bus.lifecycle('restoring-snapshot', panelId, {
        keys: Object.keys(snapshot),
      });
      this.bus.send(host, createEnvelope('RESTORE_STATE', { state: snapshot }));
    }
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
