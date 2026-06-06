import * as React from 'react';
import { ScrollArea } from '@/components/ui/scroll-area';
import { cn } from '@/utils/ui';
import { Separator } from '@/components/ui/separator';
import SectionHeading from '@/components/ui/section-heading';
import { SheetHeader, SheetTitle } from '@/components/ui/sheet';
import { DrawerTitle } from '@/components/ui/drawer';
import { useResponsiveSheetMode } from '@/components/ui/responsive-sheet';

const DetailsSheet = ({
  children,
  className,
  ...props
}: React.HTMLAttributes<HTMLDivElement>) => {
  return (
    <div className={cn('flex h-full flex-col', className)} {...props}>
      {children}
    </div>
  );
};

const Header = ({
  children,
  className,
  ...props
}: React.HTMLAttributes<HTMLDivElement>) => {
  const { mode } = useResponsiveSheetMode();

  return (
    <div className={cn('flex flex-col', className)} {...props}>
      <div className="flex h-[63px] items-center justify-between p-4">
        {children}
      </div>
      {mode !== 'drawer' && <Separator />}
    </div>
  );
};

const Title = ({
  title,
  children,
  className,
  ...props
}: { title?: string } & React.HTMLAttributes<HTMLDivElement>) => {
  const text = title || (typeof children === 'string' ? children : '');
  const { mode } = useResponsiveSheetMode();

  return (
    <>
      {mode === 'drawer' ? (
        <DrawerTitle className="sr-only">{text}</DrawerTitle>
      ) : (
        <SheetHeader className="sr-only">
          <SheetTitle>{text}</SheetTitle>
        </SheetHeader>
      )}
      <SectionHeading title={text} className={className} {...props} />
    </>
  );
};

const HeaderActions = ({
  children,
  className,
  ...props
}: React.HTMLAttributes<HTMLDivElement>) => {
  return (
    <div className={cn('flex items-center gap-2', className)} {...props}>
      {children}
    </div>
  );
};

const Content = ({
  children,
  className,
  ...props
}: React.HTMLAttributes<HTMLDivElement>) => {
  return (
    <div
      className={cn('flex flex-1 flex-col overflow-hidden', className)}
      {...props}
    >
      {children}
    </div>
  );
};

const Scrollable = ({
  children,
  className,
  ...props
}: React.ComponentProps<typeof ScrollArea>) => {
  return (
    <ScrollArea className={cn('w-full flex-1', className)} {...props}>
      {children}
    </ScrollArea>
  );
};

const Footer = ({
  children,
  className,
  ...props
}: React.HTMLAttributes<HTMLDivElement>) => {
  return (
    <div className={cn('flex-shrink-0', className)} {...props}>
      {children}
    </div>
  );
};

const FooterActions = ({
  children,
  className,
  ...props
}: React.HTMLAttributes<HTMLDivElement>) => {
  return (
    <div className={cn('flex items-center gap-2', className)} {...props}>
      {children}
    </div>
  );
};

DetailsSheet.Header = Header;
DetailsSheet.Title = Title;
DetailsSheet.HeaderActions = HeaderActions;
DetailsSheet.Content = Content;
DetailsSheet.Scrollable = Scrollable;
DetailsSheet.Footer = Footer;
DetailsSheet.FooterActions = FooterActions;

export { DetailsSheet };
