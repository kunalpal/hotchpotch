'use client';

import { useState, useEffect } from 'react';
import { useRouter } from '@bprogress/next/app';
import { Fingerprint } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Logo } from '@/components/ui/logo';
import { Spinner } from '@/components/ui/shadcn-io/spinner';
import { ModeToggle } from '@/components/theme-switcher';
import { authClient } from '@/lib/auth-client';
import { toast } from 'sonner';

export default function SignInPage() {
  const [isLoading, setIsLoading] = useState(false);
  const [isPasskeyLoading, setIsPasskeyLoading] = useState(false);
  const router = useRouter();

  // Conditional UI: preload passkeys for browser autofill
  useEffect(() => {
    if (
      !PublicKeyCredential.isConditionalMediationAvailable ||
      !PublicKeyCredential.isConditionalMediationAvailable()
    ) {
      return;
    }
    void authClient.signIn.passkey({
      autoFill: true,
      fetchOptions: {
        onSuccess() {
          router.push('/chat');
        },
      },
    });
  }, [router]);

  const handleGoogleSignIn = async () => {
    setIsLoading(true);
    await authClient.signIn.social({
      provider: 'google',
      callbackURL: '/chat',
    });
  };

  const handlePasskeySignIn = async () => {
    setIsPasskeyLoading(true);
    const { data, error } = await authClient.signIn.passkey();
    setIsPasskeyLoading(false);
    if (error) {
      toast.error('Passkey sign-in failed', {
        description: (
          <p>
            {error.message ||
              'Could not authenticate with passkey. Please try again.'}
          </p>
        ),
      });
      return;
    }
    if (data) {
      router.push('/chat');
    }
  };

  return (
    <div className="bg-background flex min-h-screen flex-col items-center justify-center p-4">
      <div className="relative">
        {/* <div className="pattern-dots absolute -bottom-5 -right-3 hidden h-2/3 w-full rounded-[35px] pattern-bg-transparent pattern-neutral-700 pattern-opacity-100 pattern-size-2 dark:pattern-neutral-300 md:block"></div> */}
        <div className="md:bg-card relative w-full max-w-sm px-6 pt-12 md:rounded-lg md:border md:px-12 md:pt-20 md:pb-16">
          <div className="mb-4 text-center">
            <div className="mb-12 flex justify-center">
              <Logo size="lg" href="/" showText={false} />
            </div>
            <h1 className="text-foreground font-serif text-xl font-medium tracking-tight">
              Let&apos;s Go
            </h1>
            <p className="text-muted-foreground mt-2 text-sm">
              Sign in to your account to continue
            </p>
          </div>
          <div className="flex justify-center">
            <div className="bg-primary mb-6 h-0.75 w-4 rounded-full" />
          </div>
          <div className="flex flex-col items-center space-y-3">
            {/* Google sign-in button */}
            <Button
              variant="default"
              type="button"
              disabled={isLoading || isPasskeyLoading}
              onClick={handleGoogleSignIn}
              data-test-id="google-sign-in-button"
            >
              <div className="flex min-w-48 items-center justify-center gap-2">
                {isLoading ? (
                  <Spinner className="h-6 w-6" variant="ring" />
                ) : (
                  <>
                    <GoogleIcon />
                    <span className="border-primary-foreground/10 border-l pl-2">
                      Continue with Google
                    </span>
                  </>
                )}
              </div>
            </Button>

            {/* Passkey sign-in button */}
            <Button
              variant="outline"
              type="button"
              disabled={isLoading || isPasskeyLoading}
              onClick={handlePasskeySignIn}
            >
              <div className="flex min-w-48 items-center justify-center gap-2">
                {isPasskeyLoading ? (
                  <Spinner className="h-6 w-6" variant="ring" />
                ) : (
                  <>
                    <Fingerprint className="h-4 w-4" />
                    <span className="border-border border-l pl-2">
                      Sign in with a Passkey
                    </span>
                  </>
                )}
              </div>
            </Button>
          </div>

          <div className="pt-8 text-center">
            <p className="text-muted-foreground text-xs">
              Secure authentication powered with{' '}
              <span className="text-accent-foreground">Better Auth</span>
            </p>
          </div>
        </div>
      </div>
      <div className="fixed top-2 right-2">
        <ModeToggle />
      </div>
    </div>
  );
}

function GoogleIcon() {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 24 24"
      className="size-4 scale-90"
    >
      <path
        d="M12.48 10.92v3.28h7.84c-.24 1.84-.853 3.187-1.787 4.133-1.147 1.147-2.933 2.4-6.053 2.4-4.827 0-8.6-3.893-8.6-8.72s3.773-8.72 8.6-8.72c2.6 0 4.507 1.027 5.907 2.347l2.307-2.307C18.747 1.44 16.133 0 12.48 0 5.867 0 .307 5.387.307 12s5.56 12 12.173 12c3.573 0 6.267-1.173 8.373-3.36 2.16-2.16 2.84-5.213 2.84-7.667 0-.76-.053-1.467-.173-2.053H12.48z"
        fill="currentColor"
      />
    </svg>
  );
}
