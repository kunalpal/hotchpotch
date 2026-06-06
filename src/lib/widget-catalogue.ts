import { generateObject } from 'ai';
import { gateway } from 'ai';
import { z } from 'zod';

export interface WidgetCatalogueEntry {
  widget_id: string;
  name: string;
  description: string;
  host_type: 'iframe' | 'native';
}

/**
 * All built-in widgets available to the selection pre-call.
 * Travel Itinerary is pre-warmed on session start; the others are selected
 * on-demand based on the user's first message.
 */
export const BUILT_IN_CATALOGUE: WidgetCatalogueEntry[] = [
  {
    widget_id: 'travel.itinerary',
    host_type: 'iframe',
    name: 'Travel Itinerary',
    description:
      'Day-by-day travel itinerary with activities and locations. Activate when the user asks about trip planning, travel, or itineraries.',
  },
  {
    widget_id: 'travel.map',
    host_type: 'native',
    name: 'Travel Map',
    description:
      'Interactive map showing itinerary locations. Always activate alongside travel.itinerary.',
  },
  {
    widget_id: 'finance.budget',
    host_type: 'native',
    name: 'Trip Budget',
    description:
      'Trip cost tracker with editable line items and currency conversion. Activate when the user asks about budget, cost, or expenses.',
  },
  {
    widget_id: 'data.notes',
    host_type: 'native',
    name: 'Notes',
    description:
      'Freeform scratchpad. Activate when the user wants to note something down, make a list, or save reminders.',
  },
];

/**
 * Calls the model to select relevant widgets for a given user message.
 * Uses generateObject with an enum constraint to prevent hallucinated IDs.
 *
 * Falls back to an empty array on error (graceful degradation — the pre-warmed
 * travel.itinerary is always mounted regardless of this call's result).
 */
export async function selectWidgets(
  userMessage: string,
  catalogue: WidgetCatalogueEntry[] = BUILT_IN_CATALOGUE
): Promise<string[]> {
  if (catalogue.length === 0) return [];

  const widgetIds = catalogue.map((e) => e.widget_id) as [string, ...string[]];
  const catalogueSummary = catalogue
    .map((e) => `- ${e.widget_id}: ${e.description}`)
    .join('\n');

  try {
    const { object } = await generateObject({
      model: gateway('deepseek/deepseek-v4-flash'),
      schema: z.object({
        widget_ids: z
          .array(z.enum(widgetIds))
          .describe('Widget IDs to activate for this message'),
      }),
      prompt: `You are a widget router. Given a user message, select which widgets from the catalogue are relevant.
Return ONLY the widget_ids that should be activated. If no widgets are relevant, return an empty array.

Catalogue:
${catalogueSummary}

User message: "${userMessage}"`,
      maxOutputTokens: 200,
    });

    return object.widget_ids;
  } catch {
    return [];
  }
}
