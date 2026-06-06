'use client';

import { useId, useRef, useState } from 'react';
import { useWidgetHost } from '@/lib/hooks/use-widget-host';
import type { NativeWidgetHost } from '@/lib/runtime/native-widget-host';

interface Props {
  host: NativeWidgetHost;
}

interface Note {
  id: string;
  title: string;
  body: string;
  pinned: boolean;
}

let noteCounter = 0;

export function DataNotes({ host }: Props) {
  // Notes doesn't receive a payload from the model — it manages its own state
  const { sendAction } = useWidgetHost(host);
  const [notes, setNotes] = useState<Note[]>([]);
  const formId = useId();
  const titleRef = useRef<HTMLInputElement>(null);
  const bodyRef = useRef<HTMLTextAreaElement>(null);

  const addNote = () => {
    const title = titleRef.current?.value.trim();
    const body = bodyRef.current?.value.trim();
    if (!title) return;
    setNotes((prev) => [
      ...prev,
      { id: String(++noteCounter), title, body: body ?? '', pinned: false },
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
    <div
      style={{
        padding: '16px',
        fontFamily: 'system-ui, sans-serif',
        fontSize: '14px',
        display: 'flex',
        flexDirection: 'column',
        height: '100%',
        gap: '12px',
      }}
    >
      {/* Add note form */}
      <div
        style={{
          border: '1px solid #e0e0e0',
          borderRadius: '6px',
          padding: '12px',
          display: 'flex',
          flexDirection: 'column',
          gap: '8px',
          flexShrink: 0,
        }}
      >
        <input
          id={`${formId}-title`}
          ref={titleRef}
          placeholder="Note title…"
          style={{
            border: '1px solid #d0d0d0',
            borderRadius: '4px',
            padding: '6px 8px',
            fontSize: '14px',
            width: '100%',
          }}
          onKeyDown={(e) => {
            if (e.key === 'Enter') addNote();
          }}
        />
        <textarea
          id={`${formId}-body`}
          ref={bodyRef}
          placeholder="Note body (optional)…"
          rows={2}
          style={{
            border: '1px solid #d0d0d0',
            borderRadius: '4px',
            padding: '6px 8px',
            fontSize: '13px',
            resize: 'none',
            width: '100%',
          }}
        />
        <button
          onClick={addNote}
          style={{
            alignSelf: 'flex-end',
            padding: '4px 12px',
            background: '#0070f3',
            color: '#fff',
            border: 'none',
            borderRadius: '4px',
            cursor: 'pointer',
            fontSize: '13px',
          }}
        >
          Add note
        </button>
      </div>

      {/* Note list */}
      <div
        style={{
          flex: 1,
          overflowY: 'auto',
          display: 'flex',
          flexDirection: 'column',
          gap: '8px',
        }}
      >
        {sorted.length === 0 && (
          <p style={{ color: '#aaa', textAlign: 'center', marginTop: '24px' }}>
            No notes yet.
          </p>
        )}
        {sorted.map((note) => (
          <div
            key={note.id}
            style={{
              border: `1px solid ${note.pinned ? '#0070f3' : '#e0e0e0'}`,
              borderRadius: '6px',
              padding: '10px 12px',
              background: note.pinned ? '#f0f6ff' : '#fff',
            }}
          >
            <div
              style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'flex-start',
                gap: '8px',
              }}
            >
              <span style={{ fontWeight: 600 }}>{note.title}</span>
              <div style={{ display: 'flex', gap: '6px', flexShrink: 0 }}>
                <button
                  onClick={() => togglePin(note)}
                  title={note.pinned ? 'Unpin' : 'Pin'}
                  style={{
                    background: 'none',
                    border: '1px solid #d0d0d0',
                    borderRadius: '4px',
                    padding: '2px 6px',
                    cursor: 'pointer',
                    fontSize: '12px',
                    color: note.pinned ? '#0070f3' : '#888',
                  }}
                >
                  {note.pinned ? '📌' : '📍'}
                </button>
                <button
                  onClick={() => deleteNote(note)}
                  title="Delete note"
                  style={{
                    background: 'none',
                    border: '1px solid #d0d0d0',
                    borderRadius: '4px',
                    padding: '2px 6px',
                    cursor: 'pointer',
                    fontSize: '12px',
                    color: '#ea4335',
                  }}
                >
                  ×
                </button>
              </div>
            </div>
            {note.body && (
              <p style={{ margin: '6px 0 0', color: '#555', fontSize: '13px' }}>
                {note.body}
              </p>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
