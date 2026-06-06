'use client';

import * as React from 'react';
import * as RadioGroupPrimitive from '@radix-ui/react-radio-group';
import { cn } from '@/utils/ui';

const RadioButtonGroup = React.forwardRef<
  React.ElementRef<typeof RadioGroupPrimitive.Root>,
  React.ComponentPropsWithoutRef<typeof RadioGroupPrimitive.Root>
>(({ className, ...props }, ref) => {
  return (
    <RadioGroupPrimitive.Root
      className={cn('flex', className)}
      {...props}
      ref={ref}
    />
  );
});
RadioButtonGroup.displayName = RadioGroupPrimitive.Root.displayName;

const RadioButtonGroupItem = React.forwardRef<
  React.ElementRef<typeof RadioGroupPrimitive.Item>,
  React.ComponentPropsWithoutRef<typeof RadioGroupPrimitive.Item>
>(({ className, children, ...props }, ref) => {
  return (
    <RadioGroupPrimitive.Item
      ref={ref}
      className={cn(
        'text-muted-foreground data-[state=checked]:bg-card data-[state=checked]:text-accent border text-center first:rounded-l-md first:border-r-0 last:rounded-r-md last:border-l-0 disabled:cursor-not-allowed disabled:opacity-50',
        className
      )}
      {...props}
    >
      {/* <RadioGroupPrimitive.RadioGroupIndicator className='relative'></RadioGroupPrimitive.RadioGroupIndicator> */}

      {children}
    </RadioGroupPrimitive.Item>
  );
});
RadioButtonGroupItem.displayName = RadioGroupPrimitive.Item.displayName;

export { RadioButtonGroup, RadioButtonGroupItem };
