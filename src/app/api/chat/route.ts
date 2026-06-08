import {
  convertToModelMessages,
  gateway,
  simulateReadableStream,
  streamText,
  tool,
  UIMessage,
} from 'ai';
import type { LanguageModelV3Prompt } from '@ai-sdk/provider';
import { bedrock } from '@ai-sdk/amazon-bedrock';
import { MockLanguageModelV3 } from 'ai/test';
import { eq } from 'drizzle-orm';
import { z } from 'zod';
import { env } from '@/lib/env';
import { DEFAULT_MODEL } from '@/lib/ai/models';
import type { AiProvider } from '@/lib/ai/models';
import {
  buildMockChunks,
  detectTrigger,
  lastUserText,
} from '@/lib/mock/mock-responses';
import { getAuthenticatedUser } from '@/utils/auth';
import { db } from '@/utils/db';
import { conversation, message } from '@/db/index';

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

function buildModel(requestModel?: string) {
  const provider = (env.NEXT_PUBLIC_AI_PROVIDER ?? 'gateway') as AiProvider;
  if (provider === 'mock') return buildMockModel();
  const modelId = requestModel || env.AI_MODEL || DEFAULT_MODEL[provider];
  if (provider === 'bedrock') return bedrock(modelId);
  return gateway(modelId);
}

const RequestBodySchema = z.object({
  messages: z.array(z.unknown()),
  conversationId: z.string().optional(),
  model: z.string().optional(),
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
  const conversationId = parsed.data.conversationId;
  const requestModel = parsed.data.model;

  // Resolve the authenticated user (non-fatal — skip persistence if unauthenticated)
  let userId: number | null = null;
  try {
    const user = await getAuthenticatedUser();
    userId = user.id;
  } catch {
    // unauthenticated or not allowlisted — allow the stream but skip DB writes
  }

  // Persist the last user message and upsert the conversation before streaming
  if (conversationId && userId !== null) {
    const lastUserMsg = [...messages].reverse().find((m) => m.role === 'user');
    if (lastUserMsg) {
      const titleText =
        lastUserMsg.parts
          .filter((p): p is { type: 'text'; text: string } => p.type === 'text')
          .map((p) => p.text)
          .join(' ')
          .slice(0, 60) || null;

      await db
        .insert(conversation)
        .values({ id: conversationId, userId, title: titleText })
        .onConflictDoNothing();

      await db
        .insert(message)
        .values({
          id: lastUserMsg.id,
          conversationId,
          role: 'user',
          parts: lastUserMsg.parts,
        })
        .onConflictDoNothing();
    }
  }

  const model = buildModel(requestModel);

  const result = streamText({
    model,
    system:
      'You are HotchPotch, an AI assistant with access to interactive widgets.\n' +
      'When the user asks about travel planning, trips, or itineraries, call render_widget with widget_id "travel.itinerary" and a fully populated payload.\n' +
      'When the user asks to take notes or remember something, call render_widget with widget_id "data.notes" and a payload of the form { notes: [{ id, title, body, pinned }] }. Pre-populate notes relevant to the user\'s request.\n' +
      'Always include specific, concrete content — never use placeholders.',
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

  return result.toUIMessageStreamResponse({
    generateMessageId: () => crypto.randomUUID(),
    onFinish: async ({ responseMessage }) => {
      if (!conversationId || userId === null) return;

      await db
        .insert(message)
        .values({
          id: responseMessage.id,
          conversationId,
          role: responseMessage.role,
          parts: responseMessage.parts,
        })
        .onConflictDoUpdate({
          target: message.id,
          set: { parts: responseMessage.parts },
        });

      await db
        .update(conversation)
        .set({ updatedAt: new Date() })
        .where(eq(conversation.id, conversationId));
    },
  });
}
