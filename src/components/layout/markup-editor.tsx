'use client';

import React from 'react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Textarea } from '@/components/ui/textarea';
import { DetailsMarkup } from '@/components/layout/details-markup';
import { CircularProgress } from '@/components/ui/circular-progress';
import { cn } from '@/utils/ui';

interface MarkupEditorProps {
  value?: string;
  onChange?: (value: string) => void;
  placeholder?: string;
  className?: string;
  variant?: 'default' | 'condensed';
  rows?: number;
  showProgress?: boolean;
  maxWords?: number;
}

export function MarkupEditor({
  value = '',
  onChange,
  placeholder = 'Write here...',
  className,
  variant = 'default',
  rows = 12,
  showProgress = false,
  maxWords = 500,
}: MarkupEditorProps) {
  const handleChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    onChange?.(e.target.value);
  };

  const wordCount = value.trim()
    ? value.trim().split(/\s+/).filter(Boolean).length
    : 0;
  const progress = Math.min((wordCount / maxWords) * 100, 100);

  return (
    <Tabs defaultValue="write" className={cn('w-full', className)}>
      <div className="flex items-center justify-between">
        <TabsList className={cn(variant === 'condensed' && 'h-8 px-1')}>
          <TabsTrigger
            value="write"
            className={cn(variant === 'condensed' && 'h-6 px-2 text-xs')}
          >
            Write
          </TabsTrigger>
          <TabsTrigger
            value="preview"
            className={cn(variant === 'condensed' && 'h-6 px-2 text-xs')}
          >
            Preview
          </TabsTrigger>
        </TabsList>

        {showProgress && (
          <div className="mr-2 flex items-center">
            <CircularProgress
              value={progress}
              size={40}
              circleStrokeWidth={3}
              shape="square"
              progressStrokeWidth={3}
              className="stroke-muted"
              progressClassName={cn(
                'stroke-primary',
                progress >= 100 && 'stroke-destructive'
              )}
            />
            <span className="text-muted-foreground text-xs font-medium">
              {wordCount} / {maxWords} words
            </span>
          </div>
        )}
      </div>

      <TabsContent
        value="write"
        className={cn(variant === 'condensed' ? 'mt-1' : 'mt-2')}
      >
        <Textarea
          value={value}
          onChange={handleChange}
          placeholder={placeholder}
          rows={variant === 'condensed' ? 4 : rows}
          className={cn(
            'resize-none font-mono text-sm',
            variant === 'condensed' && 'min-h-20 p-2'
          )}
        />
      </TabsContent>

      <TabsContent
        value="preview"
        className={cn(variant === 'condensed' ? 'mt-1' : 'mt-2')}
      >
        <div
          className={cn(
            'border-input rounded-md border p-3 text-wrap wrap-break-word',
            variant === 'condensed' ? 'min-h-20 p-2' : 'min-h-50'
          )}
        >
          {value ? (
            <DetailsMarkup text={value} />
          ) : (
            <p className="text-muted-foreground text-sm italic">
              Nothing to preview
            </p>
          )}
        </div>
      </TabsContent>
    </Tabs>
  );
}
