'use client';

import { Moon, Sun, Unplug, User } from 'lucide-react';
import Link from 'next/link';
import { useRouter } from '@bprogress/next/app';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { authClient } from '@/lib/auth-client';
import { Spinner } from '@/components/ui/shadcn-io/spinner';
import { useProfileImage } from '@/lib/hooks/use-profile-query';
import { useTheme } from 'next-themes';

export function ProfileMenu() {
  const session = authClient.useSession();
  const router = useRouter();
  const { data: profileImageResult } = useProfileImage({});
  const { theme, setTheme } = useTheme();

  const isLoaded = !session.isPending;
  const isSignedIn = !!session.data;
  const user = session.data?.user;

  // Wait until auth is loaded on the client
  if (!isLoaded) {
    return (
      <div className="flex h-9 w-9 items-center justify-center">
        <Spinner variant="ring" size={16} />
      </div>
    );
  }

  if (!isSignedIn || !user) {
    return (
      <Button size="sm" asChild>
        <Link href="/sign-in">Sign in</Link>
      </Button>
    );
  }

  // Get user's initials for the avatar fallback
  const getInitials = () => {
    const name = user.name || '';
    const parts = name.split(' ').filter(Boolean);
    if (parts.length >= 2) {
      return `${parts[0][0]}${parts[1][0]}`;
    }
    return name ? name.slice(0, 2).toUpperCase() : '?';
  };

  const displayName = user.name || 'User';
  const avatarUrl = profileImageResult || user.image || '';

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          variant="ghost"
          size="sm"
          className="hover:bg-muted relative h-9 w-9 rounded-full p-0 focus-visible:ring-0 focus-visible:ring-offset-0"
        >
          <Avatar className="h-8 w-8 border">
            <AvatarImage src={avatarUrl} alt={displayName} />
            <AvatarFallback className="text-xs font-medium">
              {getInitials()}
            </AvatarFallback>
          </Avatar>
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent
        align="end"
        className="bg-card w-52 space-y-1"
        sideOffset={8}
      >
        <div className="flex flex-col space-y-1 p-2">
          <p className="text-sm leading-none font-medium">{displayName}</p>
          <p className="text-muted-foreground text-xs leading-none">
            {user.email}
          </p>
        </div>
        <DropdownMenuSeparator />
        <DropdownMenuItem variant="accent" asChild>
          <Link
            href="/profile"
            className="flex w-full cursor-pointer items-center"
          >
            <User className="h-4 w-4" />
            <span>Profile</span>
          </Link>
        </DropdownMenuItem>
        <DropdownMenuItem
          className="cursor-pointer"
          onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}
        >
          <Sun className="h-4 w-4 dark:hidden" />
          <Moon className="hidden h-4 w-4 dark:block" />
          <span>{theme === 'dark' ? 'Light mode' : 'Dark mode'}</span>
        </DropdownMenuItem>
        <DropdownMenuSeparator />
        <DropdownMenuItem
          variant="destructive"
          className="cursor-pointer"
          onClick={async () => {
            await authClient.signOut();
            router.push('/');
          }}
        >
          <Unplug className="h-4 w-4" />
          <span>Sign out</span>
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
