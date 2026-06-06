'use client';

import { useState } from 'react';
import { useWidgetHost } from '@/lib/hooks/use-widget-host';
import type { NativeWidgetHost } from '@/lib/runtime/native-widget-host';
import type { TravelItineraryPayload } from '@/lib/widget-protocol';
import { Button } from '@/components/ui/button';

interface Props {
  host: NativeWidgetHost;
}

// Pin emoji used as a placeholder in lieu of a real map tile provider
const PIN = '📍';

export function TravelMap({ host }: Props) {
  const { payload, sendAction } = useWidgetHost<TravelItineraryPayload>(host);
  const [removedLocations, setRemovedLocations] = useState<Set<string>>(
    new Set()
  );

  if (!payload) {
    return (
      <div className="text-muted-foreground p-8 text-center text-sm">
        Waiting for itinerary…
      </div>
    );
  }

  const visibleDays = payload.days.filter(
    (d) => !removedLocations.has(d.location)
  );

  return (
    <div className="p-4 text-sm">
      <div
        className="grid gap-3"
        style={{ gridTemplateColumns: 'repeat(auto-fill, minmax(160px, 1fr))' }}
      >
        {visibleDays.map((day, i) => (
          <div
            key={day.location}
            className="border-border cursor-pointer overflow-hidden rounded-lg border transition-shadow hover:shadow-md"
            onClick={() =>
              sendAction('LOCATION_FOCUSED', { location: day.location })
            }
          >
            {/* Placeholder colour tile — hue derived from index */}
            <div
              className="flex h-20 items-center justify-center text-3xl"
              style={{ background: `hsl(${(i * 47) % 360}, 40%, 90%)` }}
            >
              {PIN}
            </div>
            <div className="p-2">
              <div className="mb-0.5 text-sm font-semibold">Day {i + 1}</div>
              <div className="text-muted-foreground text-xs">
                {day.location}
              </div>
              <div className="text-muted-foreground/70 text-[11px]">
                {day.date}
              </div>
            </div>
            <div className="flex justify-end px-2 pb-2">
              <Button
                variant="outline"
                size="xs"
                onClick={(e) => {
                  e.stopPropagation();
                  setRemovedLocations(
                    (prev) => new Set([...prev, day.location])
                  );
                  sendAction('LEG_REMOVED', { location: day.location });
                }}
              >
                Remove leg
              </Button>
            </div>
          </div>
        ))}
      </div>
      {visibleDays.length === 0 && (
        <p className="text-muted-foreground mt-8 text-center">
          No legs remaining.
        </p>
      )}
    </div>
  );
}
