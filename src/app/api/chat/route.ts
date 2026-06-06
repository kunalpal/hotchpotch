import {
  convertToModelMessages,
  gateway,
  simulateReadableStream,
  streamText,
  tool,
  UIMessage,
} from 'ai';
import type { LanguageModelV3StreamPart } from '@ai-sdk/provider';
import { MockLanguageModelV3 } from 'ai/test';
import { z } from 'zod';
import { env } from '@/lib/env';

// Triggers env validation at startup so misconfiguration fails fast
void env;

const MOCK_ITINERARY_PAYLOAD = {
  days: [
    {
      date: '2025-08-01',
      location: 'Tokyo, Japan',
      activities: [
        'Tsukiji fish market',
        'Senso-ji temple',
        'Shinjuku evening walk',
      ],
    },
    {
      date: '2025-08-02',
      location: 'Kyoto, Japan',
      activities: [
        'Fushimi Inari shrine',
        'Arashiyama bamboo grove',
        'Gion district dinner',
      ],
    },
    {
      date: '2025-08-03',
      location: 'Osaka, Japan',
      activities: [
        'Dotonbori street food tour',
        'Osaka Castle',
        'Namba shopping',
      ],
    },
  ],
};

function buildMockModel() {
  return new MockLanguageModelV3({
    doStream: async () => ({
      stream: simulateReadableStream({
        initialDelayInMs: 0,
        chunkDelayInMs: 0,
        chunks: [
          { type: 'text-start', id: 'text-1' },
          {
            type: 'text-delta',
            id: 'text-1',
            delta: '[MOCK] Here is a sample travel itinerary!',
          },
          { type: 'text-end', id: 'text-1' },
          {
            type: 'tool-call',
            toolCallId: 'mock-call-1',
            toolName: 'render_widget',
            input: JSON.stringify({
              widget_id: 'travel.itinerary',
              update_strategy: 'mount',
              payload: MOCK_ITINERARY_PAYLOAD,
            }),
          },
          {
            type: 'finish',
            finishReason: { unified: 'tool-calls', raw: undefined },
            usage: {
              inputTokens: {
                total: 0,
                noCache: 0,
                cacheRead: 0,
                cacheWrite: 0,
              },
              outputTokens: { total: 0, text: 0 },
            },
          },
        ] as LanguageModelV3StreamPart[],
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
    system: `You are HotchPotch, an AI assistant with access to interactive widgets.
When the user asks about travel planning, trips, or itineraries, call render_widget with widget_id "travel.itinerary" and a fully populated payload.
Always include specific dates, locations, and concrete activities — never use placeholders.`,
    messages: await convertToModelMessages(messages),
    tools: {
      render_widget: tool({
        description:
          'Render an interactive widget in the side panel to display structured data alongside the chat.',
        inputSchema: z.object({
          widget_id: z
            .enum(['travel.itinerary'])
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
    },
  });

  return result.toUIMessageStreamResponse();
}
