import { desc, eq } from 'drizzle-orm';
import { redirect } from 'next/navigation';
import { ensureAuth } from '@/utils/auth';
import { db } from '@/utils/db';
import { conversation } from '@/db/index';

export default async function ChatPage() {
  const { userId } = await ensureAuth();

  const [recent] = await db
    .select({ id: conversation.id })
    .from(conversation)
    .where(eq(conversation.userId, userId))
    .orderBy(desc(conversation.updatedAt))
    .limit(1);

  const targetId = recent?.id ?? crypto.randomUUID();
  redirect(`/chat/${targetId}`);
}
