'use client';

import { useId, useLayoutEffect, useRef, useState } from 'react';
import { useWidgetHost } from '@/lib/hooks/use-widget-host';
import { PROTOCOL_VERSION } from '@/lib/widget-protocol';
import type { NativeWidgetHost } from '@/lib/runtime/native-widget-host';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { cn } from '@/utils/ui';

interface Props {
  host: NativeWidgetHost;
}

interface Note {
  id: string;
  title: string;
  body: string;
  pinned: boolean;
}

export function DataNotes({ host }: Props) {
  const noteCounterRef = useRef(0);
  const [notes, setNotes] = useState<Note[]>([]);
  // Keep a ref so the SKILL_INVOKE handler can always read the latest notes
  const notesRef = useRef(notes);
  // Updated outside render (react-hooks/refs)
  useLayoutEffect(() => {
    notesRef.current = notes;
  });

  // Notes doesn't receive a payload from the model — it manages its own state.
  // The host is also used to receive SKILL_INVOKE for context_injector and intent_interceptor.
  const { sendAction } = useWidgetHost(host, (envelope) => {
    if (envelope.type !== 'SKILL_INVOKE') return;
    const { skill_id, type, query } = envelope.payload as {
      skill_id: string;
      type: string;
      query: unknown;
    };

    if (type === 'context_injector') {
      const pinnedNotes = notesRef.current.filter((n) => n.pinned);
      const summary =
        pinnedNotes.length > 0
          ? `Pinned notes: ${pinnedNotes.map((n) => `"${n.title}"${n.body ? ` — ${n.body}` : ''}`).join('; ')}`
          : '';
      host.receiveFromWidget({
        protocol: PROTOCOL_VERSION,
        message_id: crypto.randomUUID(),
        reply_to: null,
        type: 'SKILL_RESULT',
        timestamp: Date.now(),
        payload: { skill_id, type: 'context_injector', result: summary },
      });
    } else if (type === 'intent_interceptor') {
      const queryText = typeof query === 'string' ? query : '';
      // Strip common imperative prefixes to extract just the note content
      const content =
        queryText
          .replace(
            /^(note this|add a note|add note|jot down|write this down|save this|remember this|add to notes)[:\s]*/i,
            ''
          )
          .trim() || queryText.trim();

      const noteTitle = content.slice(0, 80) || 'Note';
      const noteBody = content.length > 80 ? content.slice(80).trim() : '';
      setNotes((prev) => [
        ...prev,
        {
          id: String(++noteCounterRef.current),
          title: noteTitle,
          body: noteBody,
          pinned: false,
        },
      ]);

      host.receiveFromWidget({
        protocol: PROTOCOL_VERSION,
        message_id: crypto.randomUUID(),
        reply_to: null,
        type: 'SKILL_RESULT',
        timestamp: Date.now(),
        payload: {
          skill_id,
          type: 'intent_interceptor',
          result: {
            response: `Got it — I've added a note: "${noteTitle}"`,
            payload: null,
          },
        },
      });
    }
  });

  const formId = useId();
  const titleRef = useRef<HTMLInputElement>(null);
  const bodyRef = useRef<HTMLTextAreaElement>(null);

  const addNote = () => {
    const title = titleRef.current?.value.trim();
    const body = bodyRef.current?.value.trim();
    if (!title) return;
    setNotes((prev) => [
      ...prev,
      {
        id: String(++noteCounterRef.current),
        title,
        body: body ?? '',
        pinned: false,
      },
    ]);
    if (titleRef.current) titleRef.current.value = '';
    if (bodyRef.current) bodyRef.current.value = '';
  };

  const deleteNote = (note: Note) => {
    setNotes((prev) => prev.filter((n) => n.id !== note.id));
    sendAction('NOTE_DELETED', { title: note.title });
  };

  const togglePin = (note: Note) => {
    setNotes((prev) =>
      prev.map((n) => (n.id === note.id ? { ...n, pinned: !n.pinned } : n))
    );
    if (!note.pinned) {
      sendAction('NOTE_PINNED', { title: note.title });
    }
  };

  const sorted = [...notes].sort((a, b) => Number(b.pinned) - Number(a.pinned));

  return (
    <div className="flex h-full flex-col gap-3 p-4 text-sm">
      {/* Add note form */}
      <div className="border-border flex shrink-0 flex-col gap-2 rounded-lg border p-3">
        <Input
          id={`${formId}-title`}
          ref={titleRef}
          placeholder="Note title…"
          onKeyDown={(e) => {
            if (e.key === 'Enter') addNote();
          }}
        />
        <Textarea
          id={`${formId}-body`}
          ref={bodyRef}
          placeholder="Note body (optional)…"
          rows={2}
          className="resize-none text-sm"
        />
        <Button size="sm" onClick={addNote} className="self-end">
          Add note
        </Button>
      </div>

      {/* Note list */}
      <div className="flex flex-1 flex-col gap-2 overflow-y-auto">
        {sorted.length === 0 && (
          <p className="text-muted-foreground mt-6 text-center">
            No notes yet.
          </p>
        )}
        {sorted.map((note) => (
          <div
            key={note.id}
            className={cn(
              'rounded-lg border px-3 py-2.5',
              note.pinned
                ? 'border-primary bg-primary/5'
                : 'border-border bg-card'
            )}
          >
            <div className="flex items-start justify-between gap-2">
              <span className="font-semibold">{note.title}</span>
              <div className="flex shrink-0 gap-1.5">
                <Button
                  variant="outline"
                  size="xs"
                  className={cn(note.pinned && 'text-primary border-primary')}
                  onClick={() => togglePin(note)}
                  title={note.pinned ? 'Unpin' : 'Pin'}
                >
                  {note.pinned ? '📌' : '📍'}
                </Button>
                <Button
                  variant="outline"
                  size="xs"
                  className="text-destructive hover:text-destructive"
                  onClick={() => deleteNote(note)}
                  title="Delete note"
                >
                  ×
                </Button>
              </div>
            </div>
            {note.body && (
              <p className="text-muted-foreground mt-1.5 text-sm">
                {note.body}
              </p>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
