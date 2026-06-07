'use client';

import { cn } from '@/utils/ui';
import type { ComponentType } from 'react';
import type { NativeWidgetHost } from '@/lib/runtime/native-widget-host';
import { Button } from '@/components/ui/button';
import type { PanelEntry } from './widget-panel';
import { X } from 'lucide-react';

interface WidgetCardProps {
  panel: PanelEntry;
  NativeComponent: ComponentType<{ host: NativeWidgetHost }> | null;
  iframeRef: (el: HTMLIFrameElement | null) => void;
  onClose: () => void;
  className?: string;
}

export function WidgetCard({
  panel,
  NativeComponent,
  iframeRef,
  onClose,
  className,
}: WidgetCardProps) {
  return (
    <div
      className={cn(
        'group bg-card relative overflow-hidden rounded-xl border shadow-md transition-colors duration-300',
        panel.pulsing ? 'border-emerald-500' : 'border-border',
        className
      )}
    >
      {/* Close button — rectangular, anchored to top-left corner of card.
          top-right and bottom-left corners are rounded to match the card radius;
          top-left is clipped naturally by the card's overflow-hidden. */}
      <Button
        variant="muted"
        size="icon"
        onClick={onClose}
        title={`Close ${panel.displayName}`}
        className={cn(
          'absolute top-0 right-0 z-20 h-auto rounded-none py-2 text-xs leading-none',
          'rounded-tr-xl rounded-bl-xl',
          'opacity-0 transition-opacity duration-150 group-hover:opacity-100',
          'hover:bg-destructive hover:text-background cursor-pointer'
        )}
        icon={X}
      ></Button>

      {panel.busy && (
        <div className="absolute top-2.5 right-2.5 z-10 size-1.5 animate-pulse rounded-full bg-yellow-400" />
      )}
      {panel.failed && (
        <div className="bg-destructive text-destructive-foreground absolute top-2 right-2 z-10 rounded px-1 py-0.5 text-[9px] font-medium">
          ⚠
        </div>
      )}

      {!panel.hasContent && (
        <div className="text-muted-foreground absolute inset-0 flex items-center justify-center text-xs">
          {panel.failed ? 'Widget failed to load' : 'Waiting for widget…'}
        </div>
      )}

      {panel.hostType === 'native' && NativeComponent && panel.nativeHost ? (
        <div className="h-full w-full overflow-auto">
          <NativeComponent host={panel.nativeHost} />
        </div>
      ) : (
        <iframe
          ref={iframeRef}
          src={panel.src}
          title={panel.displayName}
          sandbox="allow-scripts allow-forms"
          className={cn(
            'h-full w-full border-none',
            !panel.hasContent && 'invisible'
          )}
        />
      )}
    </div>
  );
}
