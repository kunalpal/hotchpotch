import { ActionEnvelopeSchema, PROTOCOL_VERSION } from '@/lib/widget-protocol';
import type { WidgetRegistry } from '@/lib/runtime/widget-registry';
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

function sendError(
  win: Window,
  origin: string,
  code: string,
  message: string
): void {
  win.postMessage(
    {
      protocol: PROTOCOL_VERSION,
      message_id: crypto.randomUUID(),
      reply_to: null,
      type: 'ERROR',
      timestamp: Date.now(),
      payload: { code, message },
    },
    origin
  );
}

export function validateAction(
  event: MessageEvent,
  registry: WidgetRegistry
): ValidatedAction | null {
  const source = event.source as Window | null;
  const record = registry
    .getAll()
    .find((r) => r.iframeRef.contentWindow === source && r.status === 'ready');
  if (!record) return null;

  // Step 1: origin must match the registered iframe origin
  if (event.origin !== record.origin) return null;

  // Step 2: protocol check is enforced by ActionEnvelopeSchema (protocol: literal)
  const parsed = ActionEnvelopeSchema.safeParse(event.data);
  if (!parsed.success) return null;

  const { action_type, data } = parsed.data.payload;

  // Step 3: action_type must be declared in the manifest
  if (!record.manifest.input_events.includes(action_type)) {
    console.warn(
      `[InjectionGuard] Unknown action_type "${action_type}" from panel ${record.panelId}`
    );
    return null;
  }

  const template = record.manifest.action_templates[action_type];
  if (!template) return null;

  // Steps 4–6: schema validation, sanitisation, injection-prefix check
  const sanitisedData: Record<string, string> = {};
  for (const [key, fieldSchema] of Object.entries(template.schema)) {
    const value = data[key];
    if (value === undefined || value === null) {
      // Step 4: notify widget of schema mismatch rather than silently dropping
      if (source) {
        sendError(
          source,
          record.origin,
          'SCHEMA_ERROR',
          `Missing required field: ${key}`
        );
      }
      return null;
    }

    // Step 5: strip HTML, strip newlines, truncate
    const sanitised = sanitiseString(String(value), fieldSchema.max_length);

    // Step 6: injection-prefix heuristic — silent drop, no error sent to widget
    if (sanitised === null) {
      console.warn(
        `[InjectionGuard] Injection attempt detected in field "${key}" from panel ${record.panelId}`
      );
      return null;
    }

    sanitisedData[key] = sanitised;
  }

  return {
    panelId: record.panelId,
    actionType: action_type,
    sanitisedData,
    template,
    urgency: template.urgency,
  };
}
