import type { UIMessage } from 'ai';
import { asc, eq } from 'drizzle-orm';
import { redirect } from 'next/navigation';
import { ensureAuth } from '@/utils/auth';
import { db } from '@/utils/db';
import { conversation, message } from '@/db/index';
import { ChatClient } from './chat-client';

export default async function ConversationPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { userId } = await ensureAuth();
  const { id } = await params;

  // Check if conversation exists — new conversations (UUID not yet in DB) are allowed
  const [existingConv] = await db
    .select({ id: conversation.id, userId: conversation.userId })
    .from(conversation)
    .where(eq(conversation.id, id))
    .limit(1);

  if (existingConv && existingConv.userId !== userId) {
    redirect('/chat');
  }

  let initialMessages: UIMessage[] = [];
  if (existingConv) {
    const rows = await db
      .select()
      .from(message)
      .where(eq(message.conversationId, id))
      .orderBy(asc(message.createdAt));

    initialMessages = rows.map((m) => ({
      id: m.id,
      role: m.role as UIMessage['role'],
      parts: m.parts as UIMessage['parts'],
    }));
  }

  return (
    <ChatClient
      key={id}
      conversationId={id}
      initialMessages={initialMessages}
    />
  );
}
