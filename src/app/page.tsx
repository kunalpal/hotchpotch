'use client';

import React, { useEffect } from 'react';
import { useRouter } from '@bprogress/next/app';
import Link from 'next/link';
import { authClient } from '@/lib/auth-client';
import { ArrowUpRight } from 'lucide-react';
import { Span } from '@/components/ui/span';
import { PageLoader } from '@/components/layout/page-loader';
import { LandingIllustration } from '@/components/illustrations/LandingIllustration';
import { Separator } from '@/components/ui/separator';
import { Logo } from '@/components/ui/logo';
import { ModeToggle } from '@/components/theme-switcher';

export default function Home() {
  const session = authClient.useSession();
  const isLoaded = !session.isPending;
  const isSignedIn = !!session.data;
  const router = useRouter();

  // When the user is signed in, redirect to /chat
  useEffect(() => {
    if (isLoaded && isSignedIn) {
      router.replace('/chat');
    }
  }, [isLoaded, isSignedIn, router]);

  if (!isLoaded) {
    return <PageLoader variant="full" />;
  }

  // Not signed in -> show a shadcn-style hero card
  if (!isSignedIn) {
    return (
      <div className="flex min-h-screen flex-col items-center">
        <div className="flex flex-1 items-center">
          <section className="relative bg-linear-to-b from-background to-background/80 py-20 md:py-28 lg:py-36">
            <div className="container relative z-10 space-y-10 px-8 md:px-6">
              <div className="mx-auto flex max-w-3xl flex-col items-center space-y-4 text-center">
                <div className="mb-4">
                  <LandingIllustration className="h-48 w-auto md:h-64" />
                  <Separator />
                </div>
                <Logo className="mb-1" size="md" showIcon={false} />
                <div className="mb-1 h-0.75 w-4 rounded-full bg-primary" />

                <p className="mx-auto max-w-2xl text-base text-muted-foreground">
                  A personal playground for experiments, ideas, and digital
                  creations.
                </p>

                <div className="flex flex-col gap-2 pt-2 sm:flex-row">
                  <Link href="/sign-in" passHref>
                    <Span
                      size="sm"
                      effect="expandIcon"
                      icon={ArrowUpRight}
                      iconPlacement="right"
                      className="cursor-pointer"
                    >
                      Get Started
                    </Span>
                  </Link>
                </div>
              </div>
            </div>
          </section>
          <div className="fixed right-2 top-2">
            <ModeToggle />
          </div>
        </div>
      </div>
    );
  }

  // Signed-in users will be redirected by the effect. Render loading while redirecting.
  return <PageLoader variant="full" />;
}
