/* eslint-disable @next/next/no-img-element */
'use client';

import React, { useState } from 'react';
import { ImageOff } from 'lucide-react';
import { Spinner } from '@/components/ui/shadcn-io/spinner';
import { cn } from '@/utils/ui';

interface ImageLoaderProps {
  src?: string;
  alt: string;
  className?: string;
  imageClassName?: string;
  fallbackIconClassName?: string;
  fallbackIcon?: React.ReactNode;
}

export function ImageLoader({
  src,
  alt,
  className,
  imageClassName,
  fallbackIconClassName,
  fallbackIcon,
}: ImageLoaderProps) {
  const [status, setStatus] = useState<'loading' | 'error' | 'loaded'>(
    src ? 'loading' : 'error'
  );
  const imgRef = React.useRef<HTMLImageElement>(null);

  // Use useLayoutEffect to check for cached images before paint and avoid flicker
  React.useLayoutEffect(() => {
    if (!src) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setStatus('error');
      return;
    }

    const img = imgRef.current;
    if (img?.complete) {
      if (img.naturalWidth === 0) {
        setStatus('error');
      } else {
        setStatus('loaded');
      }
    } else {
      setStatus('loading');
    }
  }, [src]);

  return (
    <div
      className={cn(
        'relative flex items-center justify-center overflow-hidden',
        className
      )}
    >
      {/* Loading State */}
      {status === 'loading' && (
        <div className="bg-muted/5 absolute inset-0 z-10 flex items-center justify-center">
          <Spinner variant="ring" />
        </div>
      )}

      {/* Error / Empty State */}
      {(status === 'error' || !src) && (
        <div className="bg-background dark:bg-muted/50 flex h-full w-full items-center justify-center">
          {fallbackIcon || (
            <ImageOff
              className={cn(
                'text-muted-foreground h-8 w-8 stroke-[1.3]',
                fallbackIconClassName
              )}
            />
          )}
        </div>
      )}

      {/* Image State */}
      {src && (
        <img
          ref={imgRef}
          src={src}
          alt={alt}
          className={cn(
            'h-full w-full object-cover transition-all duration-300',
            status === 'loaded' ? 'opacity-100' : 'opacity-0',
            status === 'error' && 'hidden',
            imageClassName
          )}
          onLoad={() => setStatus('loaded')}
          onError={() => setStatus('error')}
        />
      )}
    </div>
  );
}
