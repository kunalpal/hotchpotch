'use client';

import { useRouter } from '@bprogress/next/app';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { User } from 'lucide-react';
import { cn } from '@/utils/ui';
import { useProfileImage } from '@/lib/hooks/use-profile-query';

interface ProfileSidebarProps {
  user: {
    name?: string | null;
    email?: string | null;
    image?: string | null;
  };
  activeSection: string;
}

export default function ProfileSidebar({
  user,
  activeSection,
}: ProfileSidebarProps) {
  const router = useRouter();
  const { data: storedProfileImage } = useProfileImage({});

  const avatarSrc = storedProfileImage || user.image || '';

  const sections = [{ id: 'overview', name: 'Overview', icon: User }];

  const getInitials = () => {
    const first = user.name?.split(' ')[0]?.[0] || '';
    const last = user.name?.split(' ')[1]?.[0] || '';
    if (first && last) return `${first}${last}`.toUpperCase();
    return (first || '?').toUpperCase();
  };

  return (
    <div className="flex flex-col overflow-hidden">
      <ScrollArea className="h-full">
        <div className="space-y-6 md:pr-4">
          {/* User Brief */}
          <div className="flex flex-col items-center gap-3 pt-8 text-center">
            <Avatar className="border-background dark:border-foreground h-32 w-32 border-2 shadow-md md:h-16 md:w-16">
              <AvatarImage src={avatarSrc} alt={user.name || ''} />
              <AvatarFallback className="text-lg font-medium">
                {getInitials()}
              </AvatarFallback>
            </Avatar>
            <div className="min-w-0 space-y-1.5">
              <p className="truncate font-medium">{user.name}</p>
              <p className="text-muted-foreground truncate text-sm">
                {user.email}
              </p>
            </div>
          </div>

          {/* Navigation */}
          <div className="space-y-1">
            {sections.map((section) => {
              const Icon = section.icon;
              const isActive = activeSection === section.id;

              return (
                <div
                  key={section.id}
                  data-test-id={`profile-nav-${section.id}`}
                  onClick={() => router.push(`/profile?tab=${section.id}`)}
                  className={cn(
                    'hover:bg-muted/80 flex cursor-pointer items-center gap-3 rounded-md p-2 text-sm transition-all',
                    isActive
                      ? 'bg-muted text-foreground font-medium'
                      : 'text-muted-foreground hover:text-foreground'
                  )}
                >
                  <Icon
                    className={cn(
                      'h-4 w-4',
                      isActive
                        ? 'text-accent-foreground'
                        : 'text-muted-foreground'
                    )}
                  />
                  <span>{section.name}</span>
                </div>
              );
            })}
          </div>
        </div>
      </ScrollArea>
    </div>
  );
}
