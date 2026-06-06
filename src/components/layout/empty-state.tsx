'use client';

import React from 'react';
import { cn } from '@/utils/ui';
import { Diamond } from 'lucide-react';
import { DetailsMarkup } from '@/components/layout/details-markup';

interface EmptyStateProps {
  icon: React.ElementType;
  title: React.ReactNode;
  description: React.ReactNode | string;
  action?: React.ReactNode;
  className?: string;
}

export function EmptyState({
  icon: Icon,
  title,
  description,
  action,
  className,
}: EmptyStateProps) {
  return (
    <div className={cn('select-none', className)}>
      <div className="w-full">
        <div className="relative mx-auto mt-12 flex h-32 w-32 items-center justify-center">
          <Diamond className="fill-muted absolute h-32 w-32 stroke-none stroke-[1.5]" />
          <Icon className="z-[1] h-8 w-8 stroke-[1.4]" />
        </div>
        <div className="mx-auto mt-4 max-w-sm items-center space-y-4 text-center">
          <h3 className="font-serif text-xl font-medium">{title}</h3>
          <div className="text-muted-foreground text-center text-sm">
            {description && typeof description === 'string' ? (
              <DetailsMarkup text={description} />
            ) : (
              description
            )}
          </div>
          {action && <div className="pt-2">{action}</div>}
        </div>
      </div>
    </div>
  );
}
