import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { cn } from '@/utils/ui';

interface UserAvatarProps {
  /** User data */
  user?: {
    name?: string | null;
    email?: string | null;
    image?: string | null;
  } | null;
  /** Size classes for the avatar */
  size?: 'xs' | 'sm' | 'md' | 'lg' | 'xl';
  /** Custom classes */
  className?: string;
  /** Show fallback text when no user */
  showFallback?: boolean;
  /** Custom fallback content */
  fallbackContent?: React.ReactNode;
  /** Custom title */
  title?: string;
}

const sizeClasses = {
  xs: 'h-4 w-4',
  sm: 'h-6 w-6',
  md: 'h-8 w-8',
  lg: 'h-10 w-10',
  xl: 'h-12 w-12',
};

const fallbackSizeClasses = {
  xs: 'text-[8px]',
  sm: 'text-[10px]',
  md: 'text-[12px]',
  lg: 'text-[14px]',
  xl: 'text-[16px]',
};

export function UserAvatar({
  user,
  size = 'sm',
  className,
  showFallback = true,
  fallbackContent,
  title,
}: UserAvatarProps) {
  if (!user) {
    if (!showFallback) return null;
    return (
      fallbackContent || (
        <span className="text-muted-foreground text-xs">-</span>
      )
    );
  }

  const avatarTitle = title || user.name || user.email || undefined;

  return (
    <div className="flex items-center justify-center">
      <Avatar title={avatarTitle} className={cn(sizeClasses[size], className)}>
        <AvatarImage src={user.image || undefined} />
        <AvatarFallback className={cn(fallbackSizeClasses[size])}>
          {(user.name || user.email || 'U').charAt(0).toUpperCase()}
        </AvatarFallback>
      </Avatar>
    </div>
  );
}
