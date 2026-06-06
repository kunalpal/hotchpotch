import { convertToModelMessages, gateway, streamText, tool, UIMessage } from 'ai';
import { z } from 'zod';
import { env } from '@/lib/env';

// Silence the unused import warning — env is accessed for side-effect validation
void env;

export async function POST(request: Request) {
  const { messages }: { messages: UIMessage[] } = await request.json();

  const result = streamText({
    model: gateway('deepseek/deepseek-v4-flash'),
    system: `You are HotchPotch, an AI assistant with access to interactive widgets.
When the user asks about travel planning, trips, or itineraries, call render_widget with widget_id "travel.itinerary" and a fully populated payload.
Always include specific dates, locations, and concrete activities — never use placeholders.`,
    messages: convertToModelMessages(messages),
    tools: {
      render_widget: tool({
        description:
          'Render an interactive widget in the side panel to display structured data alongside the chat.',
        inputSchema: z.object({
          widget_id: z
            .string()
            .describe('Widget type to render, e.g. "travel.itinerary"'),
          update_strategy: z
            .enum(['mount', 'replace'])
            .default('mount')
            .describe('mount for first render, replace to update an existing widget'),
          payload: z
            .record(z.unknown())
            .describe('Data payload conforming to the widget schema'),
        }),
        execute: async ({ widget_id, update_strategy }) => {
          // No-op: the client-side Runtime Manager intercepts this tool call
          // and routes the payload to the widget iframe directly.
          return { ok: true, widget_id, update_strategy };
        },
      }),
    },
  });

  return result.toUIMessageStreamResponse();
}
