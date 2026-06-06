import { ActionEnvelopeSchema } from '@/lib/widget-protocol';
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

export function validateAction(
  event: MessageEvent,
  registry: WidgetRegistry
): ValidatedAction | null {
  const record = registry
    .getAll()
    .find((r) => r.origin === event.origin && r.status === 'ready');
  if (!record) return null;

  const parsed = ActionEnvelopeSchema.safeParse(event.data);
  if (!parsed.success) return null;

  const { action_type, data } = parsed.data.payload;

  if (!record.manifest.input_events.includes(action_type)) {
    console.warn(
      `[InjectionGuard] Unknown action_type "${action_type}" from panel ${record.panelId}`
    );
    return null;
  }

  const template = record.manifest.action_templates[action_type];
  if (!template) return null;

  const sanitisedData: Record<string, string> = {};
  for (const [key, fieldSchema] of Object.entries(template.schema)) {
    const value = data[key];
    if (value === undefined || value === null) return null;
    const sanitised = sanitiseString(String(value), fieldSchema.max_length);
    if (sanitised === null) {
      console.warn(
        `[InjectionGuard] Injection attempt detected in field "${key}"`
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
  };
}
