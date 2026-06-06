import Link from 'next/link';
import AutoSignOut from '@/app/not-authorized/AutoSignOut';
import { ArrowUpRight } from 'lucide-react';
import { Span } from '@/components/ui/span';
import { TowingIllustration } from '@/components/illustrations/TowingIllustration';
import { Separator } from '@/components/ui/separator';
import { ModeToggle } from '@/components/theme-switcher';

export default function NotAuthorizedPage() {
  return (
    <>
      <AutoSignOut />
      <div className="flex min-h-screen flex-col items-center">
        <div className="flex flex-1 items-center">
          <section className="from-background to-background/80 relative bg-gradient-to-b py-20 md:py-28 lg:py-36">
            <div className="relative z-10 container space-y-10 px-4 md:px-6">
              <div className="mx-auto flex max-w-3xl flex-col items-center space-y-4 text-center">
                <div className="mb-4">
                  <TowingIllustration className="h-48 w-auto md:h-64" />
                  <Separator />
                </div>
                <h1 className="font-mono text-4xl font-medium">403</h1>
                <p className="text-muted-foreground font-mono">Forbidden</p>
                <p className="text-muted-foreground mx-auto max-w-[42rem] text-base">
                  Access to this application is restricted by an allowlist.
                  <br />
                  If you think this is a mistake, contact the project maintainer
                  to request access.
                </p>

                <div className="flex flex-col gap-2 pt-2 sm:flex-row">
                  <Link href="/">
                    <Span
                      size="sm"
                      variant="secondary"
                      effect="expandIcon"
                      icon={ArrowUpRight}
                      iconPlacement="right"
                      className="cursor-pointer"
                    >
                      Home
                    </Span>
                  </Link>
                  <Link href="/sign-in">
                    <Span
                      size="sm"
                      effect="expandIcon"
                      icon={ArrowUpRight}
                      iconPlacement="right"
                      className="cursor-pointer"
                    >
                      Sign in
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
      </div>
    </>
  );
}
