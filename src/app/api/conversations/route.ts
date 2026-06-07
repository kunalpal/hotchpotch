import { NextResponse } from 'next/server';
import { desc, eq } from 'drizzle-orm';
import { ensureAuthApi } from '@/utils/auth';
import { db } from '@/utils/db';
import { conversation } from '@/db/index';

export async function GET() {
  const authResult = await ensureAuthApi();
  if (authResult instanceof NextResponse) return authResult;

  const { userId } = authResult;
  const rows = await db
    .select({
      id: conversation.id,
      title: conversation.title,
      createdAt: conversation.createdAt,
      updatedAt: conversation.updatedAt,
    })
    .from(conversation)
    .where(eq(conversation.userId, userId))
    .orderBy(desc(conversation.updatedAt));

  return NextResponse.json(rows);
}

export async function POST() {
  const authResult = await ensureAuthApi();
  if (authResult instanceof NextResponse) return authResult;

  const { userId } = authResult;
  const [newConv] = await db
    .insert(conversation)
    .values({ userId })
    .returning({ id: conversation.id });

  return NextResponse.json(newConv, { status: 201 });
}
