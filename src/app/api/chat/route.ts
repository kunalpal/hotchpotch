import {
  convertToModelMessages,
  gateway,
  simulateReadableStream,
  streamText,
  tool,
  UIMessage,
} from 'ai';
import type { LanguageModelV3Prompt } from '@ai-sdk/provider';
import { MockLanguageModelV3 } from 'ai/test';
import { z } from 'zod';
import { env } from '@/lib/env';
import {
  buildMockChunks,
  detectTrigger,
  lastUserText,
} from '@/lib/mock/mock-responses';

// Triggers env validation at startup so misconfiguration fails fast
void env;

function buildMockModel() {
  return new MockLanguageModelV3({
    doStream: async ({ prompt }: { prompt: LanguageModelV3Prompt }) => ({
      stream: simulateReadableStream({
        initialDelayInMs: 0,
        chunkDelayInMs: 10,
        chunks: buildMockChunks(detectTrigger(lastUserText(prompt))),
      }),
    }),
  });
}

const RequestBodySchema = z.object({
  messages: z.array(z.unknown()),
});

export async function POST(request: Request) {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return new Response('Invalid JSON', { status: 400 });
  }

  const parsed = RequestBodySchema.safeParse(body);
  if (!parsed.success) {
    return new Response('messages must be an array', { status: 400 });
  }

  const messages = parsed.data.messages as UIMessage[];

  const model =
    process.env.MOCK_AI === 'true'
      ? buildMockModel()
      : gateway('deepseek/deepseek-v4-flash');

  const result = streamText({
    model,
    system:
      'You are HotchPotch, an AI assistant with access to interactive widgets.\n' +
      'When the user asks about travel planning, trips, or itineraries, call render_widget with widget_id "travel.itinerary" and a fully populated payload.\n' +
      'Always include specific dates, locations, and concrete activities — never use placeholders.',
    messages: await convertToModelMessages(messages),
    tools: {
      render_widget: tool({
        description:
          'Render an interactive widget in the side panel to display structured data alongside the chat.',
        inputSchema: z.object({
          widget_id: z
            .enum([
              'travel.itinerary',
              'travel.map',
              'finance.budget',
              'data.notes',
            ])
            .describe('Widget type to render'),
          update_strategy: z
            .enum(['mount', 'replace'])
            .default('mount')
            .describe(
              'mount for first render, replace to update an existing widget'
            ),
          payload: z
            .record(z.string(), z.unknown())
            .describe('Data payload conforming to the widget schema'),
        }),
        execute: async ({ widget_id, update_strategy }) => {
          // No-op: the client-side Runtime Manager intercepts this tool call
          // and routes the payload to the widget iframe directly.
          return { ok: true, widget_id, update_strategy };
        },
      }),
      // Widget-registered tool: finance.budget → fetch_exchange_rate
      // The execute here is a server-side stub; real execution happens in the
      // widget via TOOL_INVOKE/TOOL_RESULT (client intercepts in onToolCall).
      'finance.budget__fetch_exchange_rate': tool({
        description: 'Fetch the current exchange rate between two currencies.',
        inputSchema: z.object({
          from: z.string().describe('Source currency code (e.g. USD)'),
          to: z.string().describe('Target currency code (e.g. EUR)'),
        }),
        execute: async () => ({ rate: 1.0 }),
      }),
    },
  });

  return result.toUIMessageStreamResponse();
}
