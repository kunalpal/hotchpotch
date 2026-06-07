'use client';

import { useEffect, useState } from 'react';
import {
  ChevronsUpDown,
  MessageSquare,
  Moon,
  PanelLeft,
  Plus,
  Sun,
  Unplug,
  User,
} from 'lucide-react';
import Link from 'next/link';
import { useRouter } from '@bprogress/next/app';
import { useTheme } from 'next-themes';
import { authClient } from '@/lib/auth-client';
import { useProfileImage } from '@/lib/hooks/use-profile-query';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import { cn } from '@/utils/ui';

type Conversation = {
  id: string;
  title: string | null;
  updatedAt: string;
};

type NavItemProps = {
  icon: React.ElementType;
  label: string;
  active?: boolean;
  collapsed: boolean;
  onClick?: () => void;
};

function NavItem({
  icon: Icon,
  label,
  active,
  collapsed,
  onClick,
}: NavItemProps) {
  const button = (
    <button
      onClick={onClick}
      className={cn(
        'flex w-full items-center gap-2.5 rounded-md px-2 py-1.5 text-sm transition-colors',
        active
          ? 'bg-accent text-accent-foreground font-medium'
          : 'text-sidebar-foreground hover:bg-muted hover:text-foreground'
      )}
    >
      <Icon
        className={cn(
          'size-4 shrink-0',
          active ? 'text-accent-foreground' : 'text-muted-foreground'
        )}
      />
      {!collapsed && <span className="truncate">{label}</span>}
    </button>
  );

  if (collapsed) {
    return (
      <Tooltip>
        <TooltipTrigger asChild>{button}</TooltipTrigger>
        <TooltipContent side="right">{label}</TooltipContent>
      </Tooltip>
    );
  }
  return button;
}

function UserFooter({ collapsed }: { collapsed: boolean }) {
  const session = authClient.useSession();
  const router = useRouter();
  const { data: profileImageUrl } = useProfileImage({});
  const { theme, setTheme } = useTheme();

  const user = session.data?.user;
  const displayName = user?.name || 'User';
  const avatarUrl = profileImageUrl || user?.image || '';

  const getInitials = () => {
    const name = user?.name ?? '';
    const parts = name.split(' ').filter(Boolean);
    if (parts.length >= 2) return `${parts[0][0]}${parts[1][0]}`;
    return name ? name.slice(0, 2).toUpperCase() : '?';
  };

  const avatarEl = (
    <Avatar className="size-6 shrink-0 rounded-md">
      <AvatarImage src={avatarUrl} alt={displayName} />
      <AvatarFallback className="bg-muted text-muted-foreground rounded-md text-xs font-medium">
        {getInitials()}
      </AvatarFallback>
    </Avatar>
  );

  return (
    <DropdownMenu>
      {collapsed ? (
        <Tooltip>
          <DropdownMenuTrigger asChild>
            <TooltipTrigger asChild>
              <button className="hover:bg-muted flex w-full items-center justify-center rounded-md px-2 py-1.5 transition-colors">
                {avatarEl}
              </button>
            </TooltipTrigger>
          </DropdownMenuTrigger>
          <TooltipContent side="right">{displayName}</TooltipContent>
        </Tooltip>
      ) : (
        <DropdownMenuTrigger asChild>
          <button className="hover:bg-muted flex w-full items-center gap-2.5 rounded-md px-2 py-1.5 transition-colors">
            {avatarEl}
            <div className="grid flex-1 text-left leading-tight">
              <span className="text-foreground truncate text-sm font-medium">
                {displayName}
              </span>
              <span className="text-muted-foreground truncate text-xs">
                {user?.email}
              </span>
            </div>
            <ChevronsUpDown className="text-muted-foreground ml-auto size-3.5 shrink-0" />
          </button>
        </DropdownMenuTrigger>
      )}

      <DropdownMenuContent
        side="top"
        align="start"
        className="bg-card w-52 space-y-1"
        sideOffset={8}
      >
        <div className="flex flex-col space-y-1 p-2">
          <p className="text-sm leading-none font-medium">{displayName}</p>
          <p className="text-muted-foreground text-xs leading-none">
            {user?.email}
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

type ChatSidebarProps = {
  activeConversationId?: string;
};

export function ChatSidebar({ activeConversationId }: ChatSidebarProps) {
  const [open, setOpen] = useState(true);
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const router = useRouter();

  useEffect(() => {
    fetch('/api/conversations')
      .then((r) => r.json())
      .then((data: Conversation[]) => setConversations(data))
      .catch(() => {});
  }, [activeConversationId]);

  async function handleNewChat() {
    const res = await fetch('/api/conversations', { method: 'POST' });
    if (!res.ok) return;
    const { id } = (await res.json()) as { id: string };
    router.push(`/chat/${id}`);
  }

  return (
    <TooltipProvider delayDuration={0}>
      <aside
        className={cn(
          'bg-card border-border flex h-full shrink-0 flex-col overflow-hidden border-r transition-[width] duration-200 ease-linear',
          open ? 'w-56' : 'w-12'
        )}
      >
        {/* Toggle */}
        <div className="border-border flex h-12 shrink-0 items-center border-b px-2">
          <button
            onClick={() => setOpen((v) => !v)}
            title={open ? 'Collapse sidebar' : 'Expand sidebar'}
            className="text-muted-foreground hover:bg-muted hover:text-foreground flex size-7 items-center justify-center rounded-md transition-colors"
          >
            <PanelLeft className="size-4" />
          </button>
        </div>

        {/* Nav */}
        <div className="flex flex-1 flex-col gap-1 overflow-y-auto p-2">
          <NavItem
            icon={Plus}
            label="New Chat"
            collapsed={!open}
            onClick={handleNewChat}
          />

          {open && conversations.length > 0 && (
            <div className="mt-3">
              <p className="text-muted-foreground px-2 py-1 text-xs font-medium">
                History
              </p>
              {conversations.map((conv) => (
                <Link
                  key={conv.id}
                  href={`/chat/${conv.id}`}
                  className={cn(
                    'flex w-full items-center gap-2.5 rounded-md px-2 py-1.5 text-sm transition-colors',
                    conv.id === activeConversationId
                      ? 'bg-accent text-accent-foreground font-medium'
                      : 'text-sidebar-foreground hover:bg-muted hover:text-foreground'
                  )}
                >
                  <MessageSquare
                    className={cn(
                      'size-4 shrink-0',
                      conv.id === activeConversationId
                        ? 'text-accent-foreground'
                        : 'text-muted-foreground'
                    )}
                  />
                  <span className="truncate">{conv.title ?? 'New Chat'}</span>
                </Link>
              ))}
            </div>
          )}

          {open && conversations.length === 0 && (
            <div className="mt-3">
              <p className="text-muted-foreground px-2 py-1 text-xs font-medium">
                History
              </p>
              <p className="text-muted-foreground px-2 py-1 text-xs">
                No previous conversations
              </p>
            </div>
          )}
        </div>

        {/* User profile */}
        <div className="border-border shrink-0 border-t p-2">
          <UserFooter collapsed={!open} />
        </div>
      </aside>
    </TooltipProvider>
  );
}
