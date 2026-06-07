'use client';

import { cn } from '@/utils/ui';
import type { PanelEntry } from './widget-panel';

interface WidgetDotNavProps {
  panels: PanelEntry[];
  activePanelId: string | null;
  setActivePanelId: (id: string) => void;
}

export function WidgetDotNav({
  panels,
  activePanelId,
  setActivePanelId,
}: WidgetDotNavProps) {
  return (
    <div className="flex shrink-0 items-center justify-center py-3">
      <div className="border-border bg-card flex items-center gap-3 rounded-full border px-4 py-2.5 shadow-sm">
        {panels.map((panel) => {
          const isActive = panel.panelId === activePanelId;
          return (
            <button
              key={panel.panelId}
              onClick={() => setActivePanelId(panel.panelId)}
              title={panel.displayName}
              className={cn(
                'rounded-full transition-all duration-200',
                isActive
                  ? 'bg-primary size-2.5'
                  : cn(
                      'size-2 hover:scale-125',
                      panel.pulsing
                        ? 'bg-emerald-500'
                        : panel.busy
                          ? 'animate-pulse bg-yellow-400'
                          : panel.failed
                            ? 'bg-destructive'
                            : 'bg-muted-foreground/35 hover:bg-muted-foreground/60'
                    )
              )}
              style={
                isActive
                  ? { boxShadow: '0 0 8px var(--color-primary)' }
                  : undefined
              }
            />
          );
        })}
      </div>
    </div>
  );
}
