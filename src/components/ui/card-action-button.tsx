'use client';

import React from 'react';
import { Button } from '@/components/ui/button';
import { cn } from '@/utils/ui';
import type { LucideIcon } from 'lucide-react';

export interface CardActionButtonProps {
  /** The Lucide icon to display */
  icon: LucideIcon;
  /** Click handler for the button */
  onClick: (e: React.MouseEvent) => void;
  /** Tooltip/title text for the button */
  title: string;
  /** Button variant - ghost for normal actions, destructive for dangerous actions */
  variant?: 'ghost' | 'destructive';
  /** Whether the button is disabled */
  disabled?: boolean;
  /** Additional CSS classes */
  className?: string;
  /** Test identifier for e2e testing */
  'data-test-id'?: string;
}

/**
 * CardActionButton provides a consistent action button for use within card components.
 * It automatically stops event propagation to prevent triggering card click handlers.
 *
 * @example
 * ```tsx
 * <CardActionButton
 *   icon={Trash}
 *   onClick={handleDelete}
 *   title="Delete item"
 *   variant="destructive"
 * />
 * ```
 */
export function CardActionButton({
  icon: Icon,
  onClick,
  title,
  variant = 'ghost',
  disabled = false,
  className,
  'data-test-id': dataTestId,
}: CardActionButtonProps) {
  const handleClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    onClick(e);
  };

  return (
    <Button
      size="icon"
      variant="ghost"
      className={cn(
        'h-8 w-8',
        variant === 'destructive' && 'text-destructive hover:text-destructive',
        className
      )}
      onClick={handleClick}
      title={title}
      disabled={disabled}
      data-test-id={dataTestId}
    >
      <Icon className="h-4 w-4" />
    </Button>
  );
}

export default CardActionButton;
