/* eslint-disable @next/next/no-img-element */
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import { Bookmark as BookmarkIcon, ImageOff } from 'lucide-react';
import { getFaviconUrl, getDomain } from '@/utils/link-metadata';
import { ReactNode, useState } from 'react';
import { Button } from '@/components/ui/button';
import { cn } from '@/utils/ui';

interface ToolTipLinkProps {
  /** The link data */
  link: {
    url: string;
    title?: string | null;
    description?: string | null;
    image?: string | null;
  };
  /** Custom content for the trigger element */
  children?: ReactNode;
  /** Custom classes for the trigger element */
  className?: string;
  /** Custom classes for the tooltip content */
  tooltipClassName?: string;
  /** Side of the tooltip */
  side?: 'top' | 'right' | 'bottom' | 'left';
  /** Fallback text when no title is provided */
  fallbackText?: string;
  /** Custom icon for when no image is provided */
  fallbackIcon?: ReactNode;
  /** Whether to show the favicon */
  showFavicon?: boolean;
  /** Custom onClick handler */
  onClick?: (e: React.MouseEvent) => void;
  /** Space ID for bookmark functionality */
  spaceId?: string;
}

export function ToolTipLink({
  link,
  children,
  className,
  tooltipClassName,
  side = 'right',
  fallbackText,
  fallbackIcon,
  showFavicon = true,
  onClick,
  spaceId,
}: ToolTipLinkProps) {
  const [imageError, setImageError] = useState(false);
  const handleClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    onClick?.(e);
  };

  const handleBookmarkClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (spaceId) {
      // Open bookmarks page in new tab with URL parameter
      window.open(
        `/bookmarks?spaceId=${spaceId}&url=${encodeURIComponent(link.url)}`,
        '_blank'
      );
    }
  };

  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <a
          href={link.url}
          target="_blank"
          rel="noopener noreferrer"
          className={cn(
            'text-accent-foreground hover:underline hover:underline-offset-4',
            className
          )}
          onClick={handleClick}
        >
          {children || link.title || fallbackText}
        </a>
      </TooltipTrigger>
      <TooltipContent
        side={side}
        className={cn(
          'w-96 overflow-visible border-none bg-transparent p-0 shadow-none',
          tooltipClassName
        )}
      >
        <div className="bg-card relative flex w-full overflow-hidden rounded-lg border p-0 shadow-md">
          {/* Bookmark button - always visible */}
          {spaceId && (
            <Button
              onClick={handleBookmarkClick}
              className="text-foreground absolute top-2 right-2 z-10"
              title="Add to bookmarks"
              icon={BookmarkIcon}
              size="icon"
              variant="ghost"
            ></Button>
          )}

          {link.image && !imageError ? (
            <div className="relative m-2 h-28 w-28 flex-shrink-0 self-stretch overflow-hidden">
              <img
                src={link.image}
                alt=""
                className="h-full w-full rounded-md object-cover"
                onError={() => setImageError(true)}
              />
            </div>
          ) : (
            <div className="bg-muted relative m-2 flex h-28 w-28 flex-shrink-0 items-center justify-center self-stretch rounded-md">
              {fallbackIcon ? (
                <div
                  onClick={spaceId ? handleBookmarkClick : undefined}
                  className={spaceId ? 'cursor-pointer' : ''}
                >
                  {fallbackIcon}
                </div>
              ) : (
                <ImageOff
                  className={`text-muted-foreground h-6 w-6 stroke-[1.5] transition-colors ${spaceId ? 'hover:text-foreground cursor-pointer' : ''}`}
                  onClick={spaceId ? handleBookmarkClick : undefined}
                />
              )}
            </div>
          )}
          <div className="flex min-w-0 flex-1 flex-col p-4 pl-2">
            {showFavicon && (
              <div className="mb-3 flex items-center gap-1.5">
                <img
                  src={getFaviconUrl(link.url)}
                  alt=""
                  className="h-4 w-4 flex-shrink-0 rounded-sm"
                  onError={(e) => (e.currentTarget.style.display = 'none')}
                />
                <span className="text-muted-foreground truncate text-xs font-medium">
                  {getDomain(link.url)}
                </span>
              </div>
            )}
            <h4 className="text-foreground mb-1 line-clamp-1 text-sm font-medium">
              {link.title || link.url}
            </h4>
            {link.description && (
              <p className="text-muted-foreground line-clamp-2 text-xs leading-relaxed">
                {link.description}
              </p>
            )}
          </div>
        </div>
      </TooltipContent>
    </Tooltip>
  );
}
