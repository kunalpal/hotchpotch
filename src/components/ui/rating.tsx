'use client';

import * as React from 'react';
import { Star } from 'lucide-react';
import { cn } from '@/utils/ui';

export interface RatingProps {
  value?: number;
  onValueChange?: (value: number) => void;
  max?: number;
  size?: number;
  disabled?: boolean;
  readOnly?: boolean;
  className?: string;
  icon?: React.ComponentType<{ className?: string }>;
  activeClassName?: string;
  inactiveClassName?: string;
}

const Rating = React.forwardRef<HTMLDivElement, RatingProps>(
  (
    {
      value = 0,
      onValueChange,
      max = 5,
      size = 20,
      disabled = false,
      readOnly = false,
      className,
      icon: Icon = Star,
      activeClassName = 'fill-primary text-primary',
      inactiveClassName = 'fill-muted text-muted',
      ...props
    },
    ref
  ) => {
    const [hoverValue, setHoverValue] = React.useState<number | null>(null);

    const handleClick = (selectedValue: number) => {
      if (disabled || readOnly) return;
      onValueChange?.(selectedValue);
    };

    const handleMouseEnter = (selectedValue: number) => {
      if (disabled || readOnly) return;
      setHoverValue(selectedValue);
    };

    const handleMouseLeave = () => {
      setHoverValue(null);
    };

    return (
      <div
        ref={ref}
        className={cn('flex items-center gap-1.5', className)}
        onMouseLeave={handleMouseLeave}
        {...props}
      >
        {Array.from({ length: max }, (_, i) => {
          const itemValue = i + 1;
          const isActive =
            hoverValue !== null ? itemValue <= hoverValue : itemValue <= value;

          return (
            <button
              key={i}
              type="button"
              onClick={() => handleClick(itemValue)}
              onMouseEnter={() => handleMouseEnter(itemValue)}
              disabled={disabled}
              className={cn(
                'rounded-sm transition-colors focus:ring-0 focus:outline-none',
                disabled && 'cursor-not-allowed opacity-50',
                !disabled &&
                  !readOnly &&
                  'cursor-pointer transition-transform hover:scale-110'
              )}
              aria-label={`Rate ${itemValue} out of ${max}`}
            >
              <Icon
                className={cn(
                  'transition-colors',
                  isActive ? activeClassName : inactiveClassName
                )}
                style={{ width: size, height: size }}
              />
            </button>
          );
        })}
      </div>
    );
  }
);

Rating.displayName = 'Rating';

export { Rating };
