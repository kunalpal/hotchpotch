import type { NextRequest } from 'next/server';
import { NextResponse } from 'next/server';
import { asc, eq } from 'drizzle-orm';
import { ensureAuthApi } from '@/utils/auth';
import { db } from '@/utils/db';
import { conversation, message } from '@/db/index';

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
