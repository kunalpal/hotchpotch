import { v4 as uuidv4 } from 'uuid';
import { z } from 'zod';

export const PROTOCOL_VERSION = 'HOTCHPOTCH_WIDGET_V1';

// ─── Envelope ────────────────────────────────────────────────────────────────

export const EnvelopeSchema = z.object({
  protocol: z.literal(PROTOCOL_VERSION),
  message_id: z.string(),
  reply_to: z.string().nullable(),
  type: z.string(),
  timestamp: z.number(),
  payload: z.record(z.string(), z.unknown()),
});

export type Envelope = z.infer<typeof EnvelopeSchema>;

export type OutboundMessageType =
  | 'MOUNT'
  | 'PATCH'
  | 'REPLACE'
  | 'CONTEXT_UPDATE'
  | 'FOCUS'
  | 'BLUR'
  | 'UNMOUNT'
  | 'TOOL_INVOKE'
  | 'TOOL_TIMEOUT'
  | 'SKILL_INVOKE'
  | 'REQUEST_SNAPSHOT';

// ─── Inbound payload schemas (widget → runtime) ───────────────────────────────

const InboundBase = EnvelopeSchema.omit({ type: true, payload: true });

export const ReadyEnvelopeSchema = InboundBase.extend({
  type: z.literal('READY'),
  payload: z.object({}),
});

export const RegisterToolsEnvelopeSchema = InboundBase.extend({
  type: z.literal('REGISTER_TOOLS'),
  payload: z.object({
    tools: z.array(
      z.object({
        name: z.string(),
        description: z.string().optional(),
        timeout_ms: z.number().optional(),
      })
    ),
  }),
});

export const RegisterSkillsEnvelopeSchema = InboundBase.extend({
  type: z.literal('REGISTER_SKILLS'),
  payload: z.object({
    skills: z.array(z.object({ skill_id: z.string(), type: z.string() })),
  }),
});

export const ActionEnvelopeSchema = InboundBase.extend({
  type: z.literal('ACTION'),
  payload: z.object({
    action_type: z.string(),
    data: z.record(z.string(), z.string()),
    urgency: z.enum(['active', 'passive']),
  }),
});

export const ToolResultEnvelopeSchema = InboundBase.extend({
  type: z.literal('TOOL_RESULT'),
  payload: z.object({
    tool_use_id: z.string(),
    result: z.unknown(),
    is_error: z.boolean(),
    active_view: z.string().optional(),
  }),
});

export const SkillResultEnvelopeSchema = InboundBase.extend({
  type: z.literal('SKILL_RESULT'),
  payload: z.object({
    skill_id: z.string(),
    type: z.string(),
    result: z.unknown(),
  }),
});

export const StateSnapshotEnvelopeSchema = InboundBase.extend({
  type: z.literal('STATE_SNAPSHOT'),
  payload: z.object({ state: z.record(z.string(), z.unknown()) }),
});

export const HeightChangedEnvelopeSchema = InboundBase.extend({
  type: z.literal('HEIGHT_CHANGED'),
  payload: z.object({ height: z.number() }),
});

export const WidgetErrorEnvelopeSchema = InboundBase.extend({
  type: z.literal('ERROR'),
  payload: z.object({ code: z.string(), message: z.string() }),
});

export const InboundEnvelopeSchema = z.discriminatedUnion('type', [
  ReadyEnvelopeSchema,
  RegisterToolsEnvelopeSchema,
  RegisterSkillsEnvelopeSchema,
  ActionEnvelopeSchema,
  ToolResultEnvelopeSchema,
  SkillResultEnvelopeSchema,
  StateSnapshotEnvelopeSchema,
  HeightChangedEnvelopeSchema,
  WidgetErrorEnvelopeSchema,
]);

export type InboundEnvelope = z.infer<typeof InboundEnvelopeSchema>;
export type ActionPayload = z.infer<typeof ActionEnvelopeSchema>['payload'];

// ─── Widget payload schemas (Task 9) ─────────────────────────────────────────

export const TravelItineraryPayloadSchema = z.object({
  days: z.array(
    z.object({
      date: z.string(),
      location: z.string(),
      activities: z.array(z.string()),
    })
  ),
});

export type TravelItineraryPayload = z.infer<
  typeof TravelItineraryPayloadSchema
>;

export const NoteItemSchema = z.object({
  id: z.string(),
  title: z.string(),
  body: z.string().default(''),
  pinned: z.boolean().default(false),
});

export const NotesPayloadSchema = z.object({
  notes: z.array(NoteItemSchema).default([]),
});

export type NotesPayload = z.infer<typeof NotesPayloadSchema>;

export const WIDGET_PAYLOAD_SCHEMAS: Record<string, z.ZodTypeAny> = {
  'travel.itinerary': TravelItineraryPayloadSchema,
  'data.notes': NotesPayloadSchema,
};

// ─── Helper ───────────────────────────────────────────────────────────────────

export function createEnvelope(
  type: OutboundMessageType,
  payload: Record<string, unknown>
): Envelope {
  return {
    protocol: PROTOCOL_VERSION,
    message_id: uuidv4(),
    reply_to: null,
    type,
    timestamp: Date.now(),
    payload,
  };
}
