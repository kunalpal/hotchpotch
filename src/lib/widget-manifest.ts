import { z } from 'zod';

// ─── Types ────────────────────────────────────────────────────────────────────

export const ActionTemplateSchema = z.object({
  action_type: z.string(),
  template: z.string(),
  urgency: z.enum(['active', 'passive']),
  schema: z.record(
    z.string(),
    z.object({
      type: z.literal('string'),
      max_length: z.number().optional(),
    })
  ),
});

export const WidgetManifestSchema = z.object({
  widget_id: z.string(),
  name: z.string(),
  entry: z.string(),
  payload_schema: z.string().optional(),
  views: z.array(z.string()),
  tools: z
    .array(z.object({ name: z.string(), timeout_ms: z.number().optional() }))
    .default([]),
  skills: z
    .array(
      z.object({
        type: z.string(),
        triggers: z.object({ intents: z.array(z.string()) }).optional(),
      })
    )
    .default([]),
  input_events: z.array(z.string()).default([]),
  action_templates: z.record(z.string(), ActionTemplateSchema).default({}),
});

export type ActionTemplate = z.infer<typeof ActionTemplateSchema>;
export type WidgetManifest = z.infer<typeof WidgetManifestSchema>;

// ─── ManifestLoader ───────────────────────────────────────────────────────────

export class ManifestLoader {
  private cache = new Map<string, WidgetManifest>();

  async load(manifestUrl: string): Promise<WidgetManifest> {
    const cached = this.cache.get(manifestUrl);
    if (cached) return cached;

    const response = await fetch(manifestUrl);
    if (!response.ok) {
      throw new Error(
        `Failed to fetch manifest at ${manifestUrl}: ${response.status}`
      );
    }

    const raw = await response.json();
    const manifest = WidgetManifestSchema.parse(raw);
    this.cache.set(manifestUrl, manifest);
    return manifest;
  }

  invalidate(manifestUrl: string): void {
    this.cache.delete(manifestUrl);
  }
}
