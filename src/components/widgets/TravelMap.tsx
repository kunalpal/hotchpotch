'use client';

import { useState } from 'react';
import { useWidgetHost } from '@/lib/hooks/use-widget-host';
import type { NativeWidgetHost } from '@/lib/runtime/native-widget-host';
import type { TravelItineraryPayload } from '@/lib/widget-protocol';

interface Props {
  host: NativeWidgetHost;
}

// Pin emoji grid used as a placeholder in lieu of a real map tile provider
const PIN = '📍';

export function TravelMap({ host }: Props) {
  const { payload, sendAction } = useWidgetHost<TravelItineraryPayload>(host);
  const [removedLocations, setRemovedLocations] = useState<Set<string>>(
    new Set()
  );

  if (!payload) {
    return (
      <div
        style={{
          padding: '32px',
          textAlign: 'center',
          color: '#aaa',
          fontSize: '14px',
        }}
      >
        Waiting for itinerary…
      </div>
    );
  }

  const visibleDays = payload.days.filter(
    (d) => !removedLocations.has(d.location)
  );

  return (
    <div
      style={{
        padding: '16px',
        fontFamily: 'system-ui, sans-serif',
        fontSize: '14px',
      }}
    >
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fill, minmax(160px, 1fr))',
          gap: '12px',
        }}
      >
        {visibleDays.map((day, i) => (
          <div
            key={day.location}
            style={{
              border: '1px solid #e0e0e0',
              borderRadius: '8px',
              overflow: 'hidden',
              cursor: 'pointer',
            }}
            onClick={() =>
              sendAction('LOCATION_FOCUSED', { location: day.location })
            }
          >
            {/* Placeholder tile */}
            <div
              style={{
                height: '80px',
                background: `hsl(${(i * 47) % 360}, 40%, 90%)`,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: '28px',
              }}
            >
              {PIN}
            </div>
            <div style={{ padding: '8px' }}>
              <div style={{ fontWeight: 600, marginBottom: '2px' }}>
                Day {i + 1}
              </div>
              <div style={{ color: '#555', fontSize: '12px' }}>
                {day.location}
              </div>
              <div style={{ color: '#888', fontSize: '11px' }}>{day.date}</div>
            </div>
            <div
              style={{
                padding: '0 8px 8px',
                display: 'flex',
                justifyContent: 'flex-end',
              }}
            >
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  setRemovedLocations(
                    (prev) => new Set([...prev, day.location])
                  );
                  sendAction('LEG_REMOVED', { location: day.location });
                }}
                style={{
                  background: 'none',
                  border: '1px solid #e0e0e0',
                  borderRadius: '4px',
                  padding: '2px 6px',
                  fontSize: '11px',
                  color: '#888',
                  cursor: 'pointer',
                }}
              >
                Remove leg
              </button>
            </div>
          </div>
        ))}
      </div>
      {visibleDays.length === 0 && (
        <p style={{ color: '#aaa', textAlign: 'center', marginTop: '32px' }}>
          No legs remaining.
        </p>
      )}
    </div>
  );
}
