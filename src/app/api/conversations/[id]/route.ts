import type { NextRequest } from 'next/server';
import { NextResponse } from 'next/server';
import { asc, eq } from 'drizzle-orm';
import { ensureAuthApi } from '@/utils/auth';
import { db } from '@/utils/db';
import { conversation, message } from '@/db/index';
import { z } from 'zod';

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const authResult = await ensureAuthApi();
  if (authResult instanceof NextResponse) return authResult;

  const { userId } = authResult;
  const { id } = await params;

  const [conv] = await db
    .select()
    .from(conversation)
    .where(eq(conversation.id, id))
    .limit(1);

  if (!conv) {
    return NextResponse.json({ error: 'Not found' }, { status: 404 });
  }
  if (conv.userId !== userId) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  const messages = await db
    .select()
    .from(message)
    .where(eq(message.conversationId, id))
    .orderBy(asc(message.createdAt));

  return NextResponse.json({ ...conv, messages });
}

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const authResult = await ensureAuthApi();
  if (authResult instanceof NextResponse) return authResult;

  const { userId } = authResult;
  const { id } = await params;

  const [conv] = await db
    .select()
    .from(conversation)
    .where(eq(conversation.id, id))
    .limit(1);

  if (!conv) return NextResponse.json({ error: 'Not found' }, { status: 404 });
  if (conv.userId !== userId)
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

  const body = await req.json();
  const { title } = z.object({ title: z.string().min(1).max(255) }).parse(body);

  const [updated] = await db
    .update(conversation)
    .set({ title, updatedAt: new Date() })
    .where(eq(conversation.id, id))
    .returning();

  return NextResponse.json(updated);
}

export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const authResult = await ensureAuthApi();
  if (authResult instanceof NextResponse) return authResult;

  const { userId } = authResult;
  const { id } = await params;

  const [conv] = await db
    .select()
    .from(conversation)
    .where(eq(conversation.id, id))
    .limit(1);

  if (!conv) return NextResponse.json({ error: 'Not found' }, { status: 404 });
  if (conv.userId !== userId)
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

  await db.delete(conversation).where(eq(conversation.id, id));

  return new NextResponse(null, { status: 204 });
}
