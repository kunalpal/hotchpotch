import type { Envelope, InboundEnvelope } from '@/lib/widget-protocol';
import type { WidgetManifest } from '@/lib/widget-manifest';

export type HostStatus = 'loading' | 'ready' | 'failed';

export interface WidgetHost {
  readonly panelId: string;
  readonly manifest: WidgetManifest;
  status: HostStatus;
  pendingOutbound: Envelope[];
  /** Registered tools after REGISTER_TOOLS handshake, namespaced by panelId */
  registeredTools: string[];
  send(envelope: Envelope): void;
  onMessage(handler: (envelope: InboundEnvelope) => void): void;
  dispose(): void;
}
