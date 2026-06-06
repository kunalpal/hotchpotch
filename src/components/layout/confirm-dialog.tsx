import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogFooter,
} from '@/components/ui/alert-dialog';
import { cn } from '@/utils/ui';
import { Diamond, TriangleAlert } from 'lucide-react';
import React from 'react';
import { Spinner } from '@/components/ui/shadcn-io/spinner';
import { useIsMobile } from '@/lib/hooks/use-mobile';
import { Drawer, DrawerContent, DrawerTitle } from '@/components/ui/drawer';
import { Button } from '@/components/ui/button';

interface ConfirmDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: React.ReactNode;
  description: React.ReactNode;
  onConfirm: () => void;
  confirmText?: string;
  cancelText?: string;
  variant?: 'default' | 'destructive';
  icon?: React.ElementType;
  isLoading?: boolean;
}

export function ConfirmDialog({
  open,
  onOpenChange,
  title,
  description,
  onConfirm,
  confirmText = 'Confirm',
  cancelText = 'Cancel',
  variant = 'default',
  icon: Icon = TriangleAlert,
  isLoading = false,
}: ConfirmDialogProps) {
  const isMobile = useIsMobile();

  const content = (
    <>
      <div className="relative mx-auto mt-8 flex h-24 w-24 items-center justify-center sm:mt-12 sm:h-32 sm:w-32">
        <Diamond className="fill-muted absolute h-24 w-24 stroke-none stroke-[1.5] sm:h-32 sm:w-32" />
        <Icon
          className={cn(
            'z-[100] -mb-2 h-6 w-6 animate-bounce stroke-[1.5] sm:-mb-3 sm:h-8 sm:w-8',
            variant === 'destructive' ? 'text-destructive' : ''
          )}
        />
      </div>
      <div className="flex flex-col items-center px-4 text-center">
        <h3 className="font-serif text-lg font-medium sm:text-xl">{title}</h3>
        <p className="text-muted-foreground mt-2 text-sm">{description}</p>
      </div>
    </>
  );

  if (isMobile) {
    return (
      <Drawer
        open={open}
        onOpenChange={onOpenChange}
        direction="bottom"
        shouldScaleBackground={false}
      >
        <DrawerContent className="bg-card fixed inset-x-0 bottom-0 z-50 flex flex-col rounded-t-xl border">
          <DrawerTitle className="sr-only">{title}</DrawerTitle>
          <div className="bg-muted-foreground/20 mx-auto mt-3 h-1.5 w-12 shrink-0 rounded-full" />
          <div className="flex flex-col gap-5 pt-4 pb-8">
            {content}
            <div className="mt-4 flex gap-2 border-t px-4 pt-4">
              <Button
                variant="outline"
                className="flex-1"
                disabled={isLoading}
                onClick={() => onOpenChange(false)}
                data-test-id="confirm-dialog-cancel"
              >
                {cancelText}
              </Button>
              <Button
                className={cn(
                  'flex-1',
                  variant === 'destructive'
                    ? 'bg-destructive text-destructive-foreground hover:bg-destructive/90'
                    : ''
                )}
                disabled={isLoading}
                onClick={() => {
                  if (!isLoading) onConfirm();
                }}
                data-test-id="confirm-dialog-confirm"
              >
                {isLoading ? (
                  <Spinner variant="ring" className="h-4 w-4" />
                ) : (
                  confirmText
                )}
              </Button>
            </div>
          </div>
        </DrawerContent>
      </Drawer>
    );
  }

  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent className="max-w-xs gap-8 p-0">
        {content}
        <AlertDialogFooter className="bg-card gap-1 rounded-b-lg border-t p-3">
          <AlertDialogCancel
            className="flex-1"
            disabled={isLoading}
            data-test-id="confirm-dialog-cancel"
          >
            {cancelText}
          </AlertDialogCancel>
          <AlertDialogAction
            onClick={(e) => {
              if (isLoading) {
                e.preventDefault();
                return;
              }
              onConfirm();
            }}
            className={cn(
              'flex-1',
              variant === 'destructive'
                ? 'bg-destructive text-destructive-foreground hover:bg-destructive/90'
                : ''
            )}
            disabled={isLoading}
            data-test-id="confirm-dialog-confirm"
          >
            {isLoading ? (
              <Spinner variant="ring" className="h-4 w-4" />
            ) : (
              confirmText
            )}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
