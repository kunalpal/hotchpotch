'use client';

import { useSearchParams } from 'next/navigation';
import { useRouter } from '@bprogress/next/app';
import { ArrowLeft } from 'lucide-react';
import { ProfileOverview } from '@/app/profile/components/ProfileOverview';
import { authClient } from '@/lib/auth-client';
import Header from '@/components/layout/header';
import { ScrollArea } from '@/components/ui/scroll-area';
import ProfileSidebar from './ProfileSidebar';
import { PageLoader } from '@/components/layout/page-loader';
import { useIsMobile } from '@/lib/hooks/use-mobile';
import { Button } from '@/components/ui/button';

export function ProfilePageClient() {
  const session = authClient.useSession();
  const user = session.data?.user;
  const searchParams = useSearchParams();
  const activeSection = searchParams.get('tab') ?? 'overview';
  const hasExplicitTab = searchParams.has('tab');
  const isMobile = useIsMobile();
  const router = useRouter();

  if (session.isPending) {
    return <PageLoader variant="assume-header-available" />;
  }

  if (!user) return null;

  const handleMobileBack = () => {
    router.push('/profile');
  };

  // Mobile: show sidebar list OR content (not both)
  const showSidebar = !isMobile || !hasExplicitTab;
  const showContent = !isMobile || hasExplicitTab;

  if (isMobile) {
    return (
      <div className="mx-auto flex h-screen w-full flex-1 flex-col overflow-hidden">
        <Header moduleName="Profile" moduleLink="/profile" fullWidth compact />

        <ScrollArea className="h-[calc(100vh-4rem)]">
          <div className="overflow-x-hidden px-6 py-3">
            {showSidebar && (
              <ProfileSidebar user={user} activeSection={activeSection} />
            )}

            {showContent && (
              <div className="space-y-3 pb-24">
                <Button
                  variant="link"
                  onClick={handleMobileBack}
                  icon={ArrowLeft}
                  className="text-muted-foreground px-0 font-normal"
                >
                  Profile
                </Button>
                {activeSection === 'overview' && (
                  <ProfileOverview user={user} />
                )}
              </div>
            )}
          </div>
        </ScrollArea>
      </div>
    );
  }

  return (
    <div className="mx-auto flex h-screen w-full flex-1 flex-col overflow-hidden">
      <Header moduleName="Profile" moduleLink="/profile" fullWidth compact />

      <ScrollArea className="h-[calc(100vh-4rem)]">
        <div className="relative p-6 py-4 md:px-8">
          <div className="max-w-8xl relative mx-auto">
            <div className="grid grid-cols-12 gap-8">
              <div className="sticky top-4 z-10 col-span-3 flex h-[calc(100vh-8rem)] flex-col overflow-hidden">
                <ProfileSidebar user={user} activeSection={activeSection} />
              </div>

              <div className="col-span-9 space-y-8 pb-24">
                {activeSection === 'overview' && (
                  <ProfileOverview user={user} />
                )}
              </div>
            </div>
          </div>
        </div>
      </ScrollArea>
    </div>
  );
}
