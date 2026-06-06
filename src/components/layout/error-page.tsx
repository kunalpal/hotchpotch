'use client';

import { useEffect } from 'react';
import Link from 'next/link';
import { ArrowUpRight } from 'lucide-react';
import { ConnectionLostIllustration } from '@/components/illustrations/ConnectionLostIllustration';
import { Separator } from '@/components/ui/separator';
import { Span } from '@/components/ui/span';
import { Button } from '@/components/ui/button';
import { ModeToggle } from '@/components/theme-switcher';
import { createLogger } from '@/utils/logger';

interface ErrorPageProps {
  module: string;
  error: Error & { digest?: string };
  reset: () => void;
}

export function ErrorPage({ module, error, reset }: ErrorPageProps) {
  const log = createLogger(module);

  useEffect(() => {
    log.error({ err: error, digest: error.digest }, `${module} route error`);
  }, [error, log, module]);

  return (
    <div className="flex flex-1 items-center">
      <section className="from-background to-background/80 relative w-full bg-linear-to-b py-20 md:py-28 lg:py-36">
        <div className="relative z-10 container space-y-10 px-4 md:px-6">
          <div className="mx-auto flex max-w-3xl flex-col items-center space-y-4 text-center">
            <div className="mb-4">
              <ConnectionLostIllustration className="h-48 w-auto md:h-64" />
              <Separator />
            </div>
            <h1 className="text-lg font-medium">Something went wrong</h1>
            <p className="text-muted-foreground mx-auto max-w-2xl text-base">
              An unexpected error occurred. Please try again or go back to the
              home page.
              {error.message && (
                <>
                  <br />
                  <span className="font-mono">(Details — {error.message})</span>
                </>
              )}
            </p>
            {error.digest && (
              <p className="text-muted-foreground/60 text-xs">
                Error ID: {error.digest}
              </p>
            )}
            <div className="flex flex-col gap-2 pt-2 sm:flex-row">
              <Button variant="outline" size="sm" onClick={() => reset()}>
                Try again
              </Button>
              <Link href="/" passHref>
                <Span
                  size="sm"
                  effect="expandIcon"
                  icon={ArrowUpRight}
                  iconPlacement="right"
                  className="cursor-pointer"
                >
                  Go home
                </Span>
              </Link>
            </div>
          </div>
        </div>
      </section>
      <div className="fixed top-2 right-2">
        <ModeToggle />
      </div>
    </div>
  );
}
