import { PROTOCOL_VERSION } from '@/lib/widget-protocol';
import type { InboundEnvelope } from '@/lib/widget-protocol';
import type { WidgetHost } from '@/lib/runtime/widget-host';
import { IframeWidgetHost } from '@/lib/runtime/iframe-widget-host';
import type { ActionTemplate } from '@/lib/widget-manifest';

const INJECTION_PREFIXES = [
  'ignore',
  'you are',
  'disregard',
  'as an ai',
  'assistant:',
  'system:',
];

export interface ValidatedAction {
  panelId: string;
  actionType: string;
  sanitisedData: Record<string, string>;
  template: ActionTemplate;
  urgency: 'active' | 'passive';
}

function sanitiseString(value: string, maxLength?: number): string | null {
  let s = value.replace(/<[^>]*>/g, '');
  s = s.replace(/[\r\n]/g, ' ');
  if (maxLength !== undefined) s = s.slice(0, maxLength);
  const lower = s.trim().toLowerCase();
  for (const prefix of INJECTION_PREFIXES) {
    if (lower.startsWith(prefix)) return null;
  }
  return s;
}

function sendIframeError(
  host: IframeWidgetHost,
  code: string,
  message: string
): void {
  host.iframeRef.contentWindow?.postMessage(
    {
      protocol: PROTOCOL_VERSION,
      message_id: crypto.randomUUID(),
      reply_to: null,
      type: 'ERROR',
      timestamp: Date.now(),
      payload: { code, message },
    },
    host.origin
  );
}

/**
 * Validates and sanitises an inbound ACTION envelope.
 *
 * Steps 1–2 (origin + protocol) are enforced upstream:
 * - IframeWidgetHost.validateOrigin() checked before delivery
 * - ActionEnvelopeSchema enforces protocol via discriminated union
 *
 * Steps 3–6 (manifest membership, schema, sanitisation, injection-prefix)
 * apply to both iframe and native hosts.
 */
export function validateAction(
  panelId: string,
  envelope: InboundEnvelope,
  hosts: Map<string, WidgetHost>
): ValidatedAction | null {
  if (envelope.type !== 'ACTION') return null;

  const host = hosts.get(panelId);
  if (!host || host.status !== 'ready') return null;

  const { action_type, data } = envelope.payload;

  // Step 3: action_type must be declared in the manifest
  if (!host.manifest.input_events.includes(action_type)) {
    console.warn(
      `[InjectionGuard] Unknown action_type "${action_type}" from panel ${panelId}`
    );
    return null;
  }

  const template = host.manifest.action_templates[action_type];
  if (!template) return null;

  // Steps 4–6: schema validation, sanitisation, injection-prefix check
  const sanitisedData: Record<string, string> = {};
  for (const [key, fieldSchema] of Object.entries(template.schema)) {
    const value = data[key];
    if (value === undefined || value === null) {
      // Step 4: notify iframe widgets of schema errors; native errors are in-process
      if (host instanceof IframeWidgetHost) {
        sendIframeError(host, 'SCHEMA_ERROR', `Missing required field: ${key}`);
      }
      return null;
    }

    // Step 5: strip HTML, strip newlines, truncate
    const sanitised = sanitiseString(String(value), fieldSchema.max_length);

    // Step 6: injection-prefix heuristic — silent drop
    if (sanitised === null) {
      console.warn(
        `[InjectionGuard] Injection attempt detected in field "${key}" from panel ${panelId}`
      );
      return null;
    }

    sanitisedData[key] = sanitised;
  }

  return {
    panelId,
    actionType: action_type,
    sanitisedData,
    template,
    urgency: template.urgency,
  };
}
