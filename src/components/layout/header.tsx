'use client';

import React from 'react';
import Link from 'next/link';
import { Logo } from '@/components/ui/logo';

import { ProfileMenu } from '@/components/ui/profile-menu';
import { cn } from '@/utils/ui';
import { X } from 'lucide-react';

type HeaderProps = {
  moduleName?: string;
  moduleLink?: string;
  children?: React.ReactNode;
  fullWidth?: boolean;
  compact?: boolean;
  currentSpaceId?: number;
  showSwitcher?: boolean;
};

export default function Header({
  moduleName,
  moduleLink,
  children,
  fullWidth = false,
  compact = false,
}: HeaderProps) {
  return (
    <header className="bg-card flex h-16 items-center border-b px-6 backdrop-blur-sm md:px-8">
      <div
        className={cn(
          'max-w-8xl mx-auto flex w-full items-center justify-between',
          compact ? 'gap-2' : 'gap-4'
        )}
      >
        <div className="group mr-2 flex min-w-fit items-center gap-2">
          <Logo size="md" showText={true} />
          {moduleName && (
            <>
              <span className="text-muted-foreground">
                <X className="h-3 w-3 transition-transform group-hover:rotate-90" />
              </span>
              {moduleLink ? (
                <Link
                  href={moduleLink}
                  className="text-muted-foreground hover:text-foreground text-sm"
                >
                  {moduleName}
                </Link>
              ) : (
                <span className="text-muted-foreground text-sm">
                  {moduleName}
                </span>
              )}
            </>
          )}
        </div>

        <div
          className={`flex flex-1 ${fullWidth ? '' : 'max-w-xl justify-center'}`}
        >
          {children}
        </div>

        <div className="flex min-w-fit items-center gap-1">
          <ProfileMenu />
        </div>
      </div>
    </header>
  );
}
