'use client';

import * as React from 'react';
import { useIsMobile } from '@/lib/hooks/use-mobile';
import { Sheet, SheetContent } from '@/components/ui/sheet';
import { Drawer, DrawerContent } from '@/components/ui/drawer';
import { cn } from '@/utils/ui';

type ResponsiveSheetMode = 'sheet' | 'drawer';

const ResponsiveSheetContext = React.createContext<{
  mode: ResponsiveSheetMode;
}>({ mode: 'sheet' });

export function useResponsiveSheetMode() {
  return React.useContext(ResponsiveSheetContext);
}

interface ResponsiveSheetProps {
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
  modal?: boolean;
  children: React.ReactNode;
}

function ResponsiveSheet({
  open,
  onOpenChange,
  modal = true,
  children,
}: ResponsiveSheetProps) {
  const isMobile = useIsMobile();

  if (isMobile) {
    return (
      <ResponsiveSheetContext.Provider value={{ mode: 'drawer' }}>
        <Drawer
          open={open}
          onOpenChange={onOpenChange}
          direction="bottom"
          shouldScaleBackground={false}
          modal={modal}
        >
          {children}
        </Drawer>
      </ResponsiveSheetContext.Provider>
    );
  }

  return (
    <ResponsiveSheetContext.Provider value={{ mode: 'sheet' }}>
      <Sheet open={open} onOpenChange={onOpenChange} modal={modal}>
        {children}
      </Sheet>
    </ResponsiveSheetContext.Provider>
  );
}

interface ResponsiveSheetContentProps extends React.HTMLAttributes<HTMLDivElement> {
  children: React.ReactNode;
  className?: string;
  hideCloseButton?: boolean;
}

function ResponsiveSheetContent({
  children,
  className,
  hideCloseButton,
  ...props
}: ResponsiveSheetContentProps) {
  const { mode } = React.useContext(ResponsiveSheetContext);

  if (mode === 'drawer') {
    return (
      <DrawerContent
        className={cn(
          'bg-card fixed inset-x-0 bottom-0 z-50 flex h-[calc(100vh-88px)] flex-col rounded-t-xl border pb-6',
          className
        )}
        {...props}
      >
        {/* Drag handle indicator */}
        <div className="bg-muted-foreground/20 mx-auto mt-3 h-1.5 w-12 shrink-0 rounded-full" />
        <div className="flex flex-1 flex-col overflow-hidden">{children}</div>
      </DrawerContent>
    );
  }

  return (
    <SheetContent
      hideCloseButton={hideCloseButton}
      className={cn(
        'bg-card flex flex-col gap-0 p-0 sm:max-w-[420px]',
        className
      )}
      {...props}
    >
      {children}
    </SheetContent>
  );
}

export { ResponsiveSheet, ResponsiveSheetContent };
