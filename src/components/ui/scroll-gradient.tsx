'use client';

import * as React from 'react';
import { cn } from '@/utils/ui';

interface ScrollGradientProps extends React.HTMLAttributes<HTMLDivElement> {
  overlayText?: string;
  overlayClassName?: string;
  children: React.ReactNode;
}

const ScrollGradient = React.forwardRef<HTMLDivElement, ScrollGradientProps>(
  ({ className, children, overlayText, overlayClassName, ...props }, ref) => {
    const [showOverlay, setShowOverlay] = React.useState(false);
    const viewportRef = React.useRef<HTMLDivElement>(null);

    // Combine forwarded ref and local ref
    React.useImperativeHandle(ref, () => viewportRef.current as HTMLDivElement);

    const checkScroll = React.useCallback(() => {
      const viewport = viewportRef.current;
      if (!viewport) return;

      const { scrollTop, scrollHeight, clientHeight } = viewport;
      // Show overlay if there is more content to scroll to (with a small buffer)
      const isAtBottom = Math.abs(scrollHeight - clientHeight - scrollTop) < 5;
      const hasScroll = scrollHeight > clientHeight;

      setShowOverlay(hasScroll && !isAtBottom);
    }, []);

    React.useEffect(() => {
      const viewport = viewportRef.current;
      if (!viewport) return;

      checkScroll();

      // Check again when content changes
      const resizeObserver = new ResizeObserver(() => checkScroll());
      resizeObserver.observe(viewport);
      // Also observe the first child if it exists
      if (viewport.firstElementChild) {
        resizeObserver.observe(viewport.firstElementChild);
      }

      return () => resizeObserver.disconnect();
    }, [checkScroll, children]);

    return (
      <div className="relative flex flex-1 flex-col overflow-hidden">
        <div
          ref={viewportRef}
          className={cn(
            'flex-1 [scrollbar-width:none] overflow-y-auto [-ms-overflow-style:none] [&::-webkit-scrollbar]:hidden',
            className
          )}
          onScroll={checkScroll}
          {...props}
        >
          {children}
        </div>

        <div
          className={cn(
            'from-background pointer-events-none absolute right-0 bottom-0 left-0 flex h-32 items-end justify-center bg-gradient-to-t to-transparent pb-4 transition-opacity duration-300',
            showOverlay ? 'opacity-100' : 'opacity-0',
            overlayClassName
          )}
        >
          {overlayText && (
            <span className="text-muted-foreground mb-2 text-xs font-medium">
              {overlayText}
            </span>
          )}
        </div>
      </div>
    );
  }
);
ScrollGradient.displayName = 'ScrollGradient';

export { ScrollGradient };
