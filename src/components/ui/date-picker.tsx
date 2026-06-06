'use client';

import * as React from 'react';
import { format } from 'date-fns';
import { Calendar as CalendarIcon } from 'lucide-react';

import { cn } from '@/utils/ui';
import { Button } from '@/components/ui/button';
import { Calendar } from '@/components/ui/calendar';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import { Input } from '@/components/ui/input';
import dayjs from 'dayjs';

export function DatePicker({
  name,
  value: controlledValue,
  defaultValue,
  onChange,
  className,
  side = 'bottom',
}: {
  name: string;
  value?: Date;
  defaultValue?: Date;
  onChange?: (date: Date) => void;
  className?: string;
  side?: 'top' | 'right' | 'bottom' | 'left';
}) {
  const [internalValue, setInternalValue] = React.useState<Date | undefined>(
    defaultValue
  );
  const [open, setOpen] = React.useState(false);

  const value = controlledValue !== undefined ? controlledValue : internalValue;

  const onValueChange = (date?: Date) => {
    if (date) {
      if (controlledValue === undefined) {
        setInternalValue(date);
      }
      onChange?.(date);
      setOpen(false);
    }
  };

  return (
    <Popover open={open} onOpenChange={(v) => setOpen(v)}>
      <PopoverTrigger asChild>
        <Button
          variant={'outline'}
          className={cn(
            'justify-start gap-0 px-3 text-left font-normal',
            !value && 'text-muted-foreground',
            className
          )}
        >
          <CalendarIcon className="mr-2 h-4 w-4" />
          {value ? format(value, 'PPP') : <span>Pick a date</span>}
        </Button>
      </PopoverTrigger>
      <PopoverContent
        className="w-auto overflow-hidden rounded-md p-0"
        side={side}
      >
        <Input type="hidden" name={name} value={dayjs(value).toISOString()} />
        <Calendar
          mode="single"
          selected={value}
          onSelect={onValueChange}
          className="bg-card"
        />
      </PopoverContent>
    </Popover>
  );
}
