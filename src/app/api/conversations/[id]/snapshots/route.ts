import type { NextRequest } from 'next/server';
import { NextResponse } from 'next/server';
import { eq } from 'drizzle-orm';
import { z } from 'zod';
import { ensureAuthApi } from '@/utils/auth';
import { db } from '@/utils/db';
import { conversation, widgetSnapshot } from '@/db/index';

async function resolveConversation(id: string, userId: number) {
  const [conv] = await db
    .select()
    .from(conversation)
    .where(eq(conversation.id, id))
    .limit(1);
  if (!conv) return 'not_found';
  if (conv.userId !== userId) return 'forbidden';
  return conv;
}

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const authResult = await ensureAuthApi();
  if (authResult instanceof NextResponse) return authResult;

  const { userId } = authResult;
  const { id } = await params;

  const conv = await resolveConversation(id, userId);
  if (conv === 'not_found')
    return NextResponse.json({ error: 'Not found' }, { status: 404 });
  if (conv === 'forbidden')
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

  const rows = await db
    .select()
    .from(widgetSnapshot)
    .where(eq(widgetSnapshot.conversationId, id));

  const result: Record<string, Record<string, unknown>> = {};
  for (const row of rows) {
    result[row.widgetId] = row.state as Record<string, unknown>;
  }

  return NextResponse.json(result);
}

const PatchBodySchema = z.object({
  widgetId: z.string().min(1),
  state: z.record(z.string(), z.unknown()),
});

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const authResult = await ensureAuthApi();
  if (authResult instanceof NextResponse) return authResult;

  const { userId } = authResult;
  const { id } = await params;

  const conv = await resolveConversation(id, userId);
  if (conv === 'not_found')
    return NextResponse.json({ error: 'Not found' }, { status: 404 });
  if (conv === 'forbidden')
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

  const body = PatchBodySchema.parse(await req.json());

  await db
    .insert(widgetSnapshot)
    .values({
      conversationId: id,
      widgetId: body.widgetId,
      state: body.state,
      updatedAt: new Date(),
    })
    .onConflictDoUpdate({
      target: [widgetSnapshot.conversationId, widgetSnapshot.widgetId],
      set: { state: body.state, updatedAt: new Date() },
    });

  return new NextResponse(null, { status: 204 });
}
