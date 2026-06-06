'use client';

import React from 'react';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { ChevronDown, LucideIcon } from 'lucide-react';
import { cn } from '@/utils/ui';
import Link from 'next/link';

export interface DescriptiveDropdownItem {
  name: string;
  href: string;
  icon: LucideIcon;
  description: string;
}

interface DescriptiveDropdownProps {
  label: string;
  items: DescriptiveDropdownItem[];
  pathname: string;
  buildHref: (href: string) => string;
  isActive?: boolean;
}

export function DescriptiveDropdown({
  label,
  items,
  pathname,
  buildHref,
  isActive: controlledIsActive,
}: DescriptiveDropdownProps) {
  const isAnyItemActive = items.some((item) => pathname === item.href);
  const isActive = controlledIsActive ?? isAnyItemActive;

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          variant="outline"
          size="sm"
          className={cn(
            'gap-0 focus-visible:ring-0 focus-visible:ring-offset-0',
            isActive && 'bg-muted'
          )}
        >
          {label}
          <ChevronDown className="ml-1 h-4 w-4" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="start" className="w-[300px] space-y-1">
        {items.map((item) => {
          const isItemActive = pathname === item.href;
          return (
            <DropdownMenuItem
              key={item.href}
              asChild
              className={cn(
                'flex cursor-pointer flex-col items-start gap-0.5 rounded-md py-2',
                isItemActive && 'bg-muted'
              )}
            >
              <Link href={buildHref(item.href)}>
                <div className="flex items-center gap-2">
                  <item.icon
                    className={cn(
                      'h-4 w-4',
                      isItemActive
                        ? 'text-accent-foreground'
                        : 'text-muted-foreground'
                    )}
                  />
                  <span
                    className={cn(
                      'font-medium',
                      isItemActive
                        ? 'text-accent-foreground'
                        : 'text-foreground'
                    )}
                  >
                    {item.name}
                  </span>
                </div>
                <span
                  className={cn(
                    'ml-6 text-xs',
                    isItemActive ? 'text-foreground' : 'text-muted-foreground'
                  )}
                >
                  {item.description}
                </span>
              </Link>
            </DropdownMenuItem>
          );
        })}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
