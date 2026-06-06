import { Spinner } from '@/components/ui/shadcn-io/spinner';
import { Skeleton } from '@/components/ui/skeleton';
import { cn } from '@/utils/ui';

interface PageLoaderProps {
  variant?:
    | 'full'
    | 'assume-header-available'
    | 'assume-extended-header'
    | 'loading-header';
  extensionHeight?: string;
}

export function PageLoader({
  variant = 'assume-header-available',
  extensionHeight = '180px',
}: PageLoaderProps) {
  if (variant === 'loading-header') {
    return (
      <div className="bg-background flex h-screen w-full flex-col">
        <header className="flex h-16 w-full items-center gap-2 border-b px-4">
          <div className="max-w-8xl mx-auto flex w-full items-center justify-between">
            <div className="flex items-center gap-2">
              <Skeleton className="h-8 w-8 rounded-lg" />
              <div className="flex items-center gap-2">
                <div className="bg-border h-4 w-px" />
                <Skeleton className="h-8 w-24" />
              </div>
            </div>
            <div>
              <Skeleton className="h-8 w-8 rounded-full" />
            </div>
          </div>
        </header>
        <div className="flex flex-1 items-center justify-center">
          <Spinner variant="ring" />
        </div>
      </div>
    );
  }

  return (
    <div
      className={cn(
        'bg-background flex w-full flex-col items-center justify-center',
        variant === 'full'
          ? 'fixed inset-0 z-50 h-screen'
          : variant === 'assume-extended-header'
            ? ''
            : 'min-h-[calc(100vh-64px)]'
      )}
      style={
        variant === 'assume-extended-header'
          ? { minHeight: `calc(100vh - ${extensionHeight})` }
          : undefined
      }
    >
      <div className="flex flex-col items-center gap-4">
        <Spinner variant="ring" />
      </div>
    </div>
  );
}
