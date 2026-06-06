'use client';

import React from 'react';
import { cn } from '@/utils/ui';

interface DetailsMarkupProps {
  text: string;
  className?: string;
}

/**
 * Parses and renders text with inline markup support.
 *
 * Supported syntax:
 * - ==highlight== → colored text (foreground)
 * - **important** → colored + underlined text (foreground + underline)
 * - ~~emphasis~~ → accent colored text (accent-foreground)
 * - \n → line break (br)
 */
export function DetailsMarkup({ text, className }: DetailsMarkupProps) {
  const parseMarkup = (input: string): React.ReactNode[] => {
    const result: React.ReactNode[] = [];
    let keyCounter = 0;

    // Combined regex to match patterns:
    // 1. **important**
    // 2. ==highlight==
    // 3. ~~emphasis~~
    // 4. \n
    const markupRegex = /(\*\*(.+?)\*\*)|(==(.+?)==)|(~~(.+?)~~)|(\\n|\n)/g;
    let lastIndex = 0;
    let match;

    while ((match = markupRegex.exec(input)) !== null) {
      // Add text before the match
      if (match.index > lastIndex) {
        result.push(input.slice(lastIndex, match.index));
      }

      if (match[1]) {
        // **important** - bold/underline match
        result.push(
          <span
            key={keyCounter++}
            className="text-foreground underline underline-offset-4"
          >
            {match[2]}
          </span>
        );
      } else if (match[3]) {
        // ==highlight== - foreground match
        result.push(
          <span key={keyCounter++} className="text-foreground">
            {match[4]}
          </span>
        );
      } else if (match[5]) {
        // ~~emphasis~~ - accent match
        result.push(
          <span key={keyCounter++} className="text-accent-foreground">
            {match[6]}
          </span>
        );
      } else if (match[7]) {
        // \n - line break
        result.push(<br key={keyCounter++} />);
      }

      lastIndex = match.index + match[0].length;
    }

    // Add remaining text after last match
    if (lastIndex < input.length) {
      result.push(input.slice(lastIndex));
    }

    // If no matches were found, return original text
    if (result.length === 0) {
      return [input];
    }

    return result;
  };

  return (
    <p className={cn('text-muted-foreground max-w-2xl text-sm', className)}>
      {parseMarkup(text)}
    </p>
  );
}
