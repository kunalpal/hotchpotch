'use client';

import * as React from 'react';

import { ScrollArea } from '@/components/ui/scroll-area';
import { cn } from '@/utils/ui';

export type TextareaProps = React.TextareaHTMLAttributes<HTMLTextAreaElement>;

const Textarea = React.forwardRef<HTMLTextAreaElement, TextareaProps>(
  ({ className, onInput, onChange, value, defaultValue, ...props }, ref) => {
    const internalRef = React.useRef<HTMLTextAreaElement>(null);
    React.useImperativeHandle(ref, () => internalRef.current!);

    const adjustHeight = React.useCallback(() => {
      const textarea = internalRef.current;
      if (textarea) {
        textarea.style.height = 'auto';
        textarea.style.height = `${textarea.scrollHeight}px`;
      }
    }, []);

    React.useLayoutEffect(() => {
      adjustHeight();
    }, [value, defaultValue, adjustHeight]);

    return (
      <ScrollArea
        className={cn(
          'border-input bg-background focus-within:border-muted-foreground w-full cursor-text rounded-md border transition-all focus-within:ring-0 focus-within:ring-offset-0',
          props.disabled && 'cursor-not-allowed opacity-50',
          className
        )}
        onClick={() => internalRef.current?.focus()}
      >
        <textarea
          ref={internalRef}
          onInput={(e) => {
            adjustHeight();
            onInput?.(e);
          }}
          onChange={(e) => {
            adjustHeight();
            onChange?.(e);
          }}
          defaultValue={defaultValue}
          value={value}
          className={cn(
            'placeholder:text-muted-foreground flex w-full resize-none overflow-hidden border-none bg-transparent px-3 py-2 text-sm focus:ring-0 focus:outline-none disabled:cursor-not-allowed'
          )}
          {...props}
        />
      </ScrollArea>
    );
  }
);
Textarea.displayName = 'Textarea';

export { Textarea };
