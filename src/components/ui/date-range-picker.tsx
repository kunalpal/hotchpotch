'use client';

import * as React from 'react';
import { format } from 'date-fns';
import { Calendar as CalendarIcon } from 'lucide-react';
import { DateRange } from 'react-day-picker';

import { cn } from '@/utils/ui';
import { Button } from '@/components/ui/button';
import { Calendar } from '@/components/ui/calendar';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';

export interface DateRangePickerProps {
  value?: DateRange;
  defaultValue?: DateRange;
  onChange?: (range: DateRange | undefined) => void;
  placeholder?: string;
  className?: string;
  align?: 'start' | 'center' | 'end';
  numberOfMonths?: number;
  disabled?: boolean;
}

export function DateRangePicker({
  value: controlledValue,
  defaultValue,
  onChange,
  placeholder = 'Pick a date range',
  className,
  align = 'start',
  numberOfMonths = 2,
  disabled = false,
}: DateRangePickerProps) {
  const [internalValue, setInternalValue] = React.useState<
    DateRange | undefined
  >(defaultValue);
  const [open, setOpen] = React.useState(false);

  const value = controlledValue !== undefined ? controlledValue : internalValue;

  const onValueChange = (range: DateRange | undefined) => {
    if (controlledValue === undefined) {
      setInternalValue(range);
    }
    onChange?.(range);
  };

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          disabled={disabled}
          className={cn(
            'justify-start text-left font-normal',
            !value && 'text-muted-foreground',
            className
          )}
        >
          <CalendarIcon className="mr-2 h-4 w-4" />
          {value?.from ? (
            value.to ? (
              <>
                {format(value.from, 'LLL dd, y')} -{' '}
                {format(value.to, 'LLL dd, y')}
              </>
            ) : (
              format(value.from, 'LLL dd, y')
            )
          ) : (
            <span>{placeholder}</span>
          )}
        </Button>
      </PopoverTrigger>
      <PopoverContent
        className="w-auto overflow-hidden rounded-md p-0"
        align={align}
        avoidCollisions={false}
      >
        <Calendar
          mode="range"
          defaultMonth={value?.from}
          selected={value}
          onSelect={onValueChange}
          numberOfMonths={numberOfMonths}
          className="bg-card"
          classNames={{
            months: 'flex flex-row gap-4',
            nav: 'flex items-center justify-between absolute inset-x-0 top-0 px-1',
            button_previous:
              'relative h-7 w-7 bg-transparent pt-5 pl-4 opacity-50 hover:opacity-100',
            button_next:
              'relative h-7 w-7 bg-transparent pt-5 pr-4 opacity-50 hover:opacity-100',
            range_start: 'rounded-s-md rounded-e-none',
            range_end: 'rounded-e-md rounded-s-none',
            range_middle: 'rounded-none',
          }}
        />
      </PopoverContent>
    </Popover>
  );
}
