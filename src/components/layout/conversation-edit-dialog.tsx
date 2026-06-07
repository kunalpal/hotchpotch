'use client';

import { useRef, useState } from 'react';
import { Trash } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Dialog, DialogContent } from '@/components/ui/dialog';
import { Drawer, DrawerContent, DrawerTitle } from '@/components/ui/drawer';
import { ConfirmDialog } from '@/components/layout/confirm-dialog';
import { useIsMobile } from '@/lib/hooks/use-mobile';
import SectionHeading from '@/components/ui/section-heading';

interface ConversationEditDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  conversationId: string;
  currentTitle: string | null;
  onRename: (title: string) => void;
  onDelete: () => void;
}

export function ConversationEditDialog({
  open,
  onOpenChange,
  conversationId,
  currentTitle,
  onRename,
  onDelete,
}: ConversationEditDialogProps) {
  const [renameValue, setRenameValue] = useState(currentTitle ?? 'New Chat');
  const [isSaving, setIsSaving] = useState(false);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const isMobile = useIsMobile();

  function handleOpenAutoFocus(e: Event) {
    e.preventDefault();
    setRenameValue(currentTitle ?? 'New Chat');
    inputRef.current?.focus();
  }

  async function handleSave() {
    if (!renameValue.trim()) return;
    setIsSaving(true);
    try {
      await fetch(`/api/conversations/${conversationId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ title: renameValue.trim() }),
      });
      onRename(renameValue.trim());
      onOpenChange(false);
    } finally {
      setIsSaving(false);
    }
  }

  async function handleDelete() {
    await fetch(`/api/conversations/${conversationId}`, { method: 'DELETE' });
    onDelete();
    setConfirmOpen(false);
  }

  const body = (
    <div className="bg-card relative flex flex-col gap-3 p-4">
      <button
        onClick={() => {
          onOpenChange(false);
          setConfirmOpen(true);
        }}
        className="text-destructive absolute top-4 right-4 flex size-7 items-center justify-center rounded-md transition-colors hover:opacity-80"
      >
        <Trash className="size-4" />
      </button>
      <div>
        <SectionHeading title="Rename conversation" />
        <p className="text-muted-foreground mt-4 text-sm">
          Update the name of this conversation.
        </p>
      </div>
      <Input
        ref={inputRef}
        value={renameValue}
        onChange={(e) => setRenameValue(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === 'Enter') handleSave();
          if (e.key === 'Escape') onOpenChange(false);
        }}
      />
    </div>
  );

  const footer = (
    <div className="flex gap-2 border-t p-3">
      <Button
        variant="muted"
        className="flex-1"
        onClick={() => onOpenChange(false)}
      >
        Cancel
      </Button>
      <Button
        className="flex-1"
        disabled={isSaving || !renameValue.trim()}
        onClick={handleSave}
      >
        Save
      </Button>
    </div>
  );

  return (
    <>
      {isMobile ? (
        <Drawer
          open={open}
          onOpenChange={onOpenChange}
          direction="bottom"
          shouldScaleBackground={false}
        >
          <DrawerContent
            className="bg-card fixed inset-x-0 bottom-0 z-50 flex flex-col rounded-t-xl border"
            onOpenAutoFocus={handleOpenAutoFocus}
          >
            <DrawerTitle className="sr-only">Rename conversation</DrawerTitle>
            <div className="bg-muted-foreground/20 mx-auto mt-3 h-1.5 w-12 shrink-0 rounded-full" />
            <div className="flex flex-col pb-8">
              {body}
              {footer}
            </div>
          </DrawerContent>
        </Drawer>
      ) : (
        <Dialog open={open} onOpenChange={onOpenChange}>
          <DialogContent
            hideCloseButton
            className="max-w-md gap-0 p-0"
            onOpenAutoFocus={handleOpenAutoFocus}
          >
            {body}
            {footer}
          </DialogContent>
        </Dialog>
      )}

      <ConfirmDialog
        open={confirmOpen}
        onOpenChange={setConfirmOpen}
        title="Delete conversation"
        description="This will permanently delete this conversation and all its messages."
        confirmText="Delete"
        variant="destructive"
        icon={Trash}
        onConfirm={handleDelete}
      />
    </>
  );
}
