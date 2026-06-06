'use client';

import { Ban, PartyPopper } from 'lucide-react';
import { useTheme } from 'next-themes';
import { Toaster as Sonner } from 'sonner';

type ToasterProps = React.ComponentProps<typeof Sonner>;

const Toaster = ({ ...props }: ToasterProps) => {
  const { theme = 'system' } = useTheme();

  return (
    <Sonner
      theme={theme as ToasterProps['theme']}
      className="toaster group"
      toastOptions={{
        classNames: {
          toast:
            'group toast group-[.toaster]:bg-card group-[.toaster]:text-foreground group-[.toaster]:border-border group-[.toaster]:shadow-lg items-start px-4 pb-3 pt-2',
          title:
            'group-[.toast]:text-foreground group-[.toast]:font-serif group-[.toast]:text-lg',
          description: 'group-[.toast]:text-muted-foreground',
          actionButton:
            'group-[.toast]:bg-primary group-[.toast]:text-primary-foreground',
          cancelButton:
            'group-[.toast]:bg-muted group-[.toast]:text-muted-foreground',
          icon: 'group-data-[type=error]:text-red-500 group-data-[type=success]:text-green-500 group-data-[type=warning]:text-amber-500 group-data-[type=info]:text-blue-500 pt-3 pr-5',
        },
      }}
      position="bottom-center"
      icons={{
        success: <PartyPopper className="text-success h-5 w-5" />,
        error: <Ban className="text-destructive h-5 w-5" />,
      }}
      {...props}
    />
  );
};

export { Toaster };
