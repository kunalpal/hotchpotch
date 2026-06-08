'use client';

import { useCallback, useLayoutEffect, useRef } from 'react';
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
  // Always-current ref so the wheel handler never closes over stale state.
  const stateRef = useRef({ panels, activePanelId, setActivePanelId });
  useLayoutEffect(() => {
    stateRef.current = { panels, activePanelId, setActivePanelId };
  });

  // Timestamp of the last processed scroll step — limits one step per gesture.
  const lastStepAt = useRef(0);

  const onWheel = useCallback((e: React.WheelEvent) => {
    const { panels, activePanelId, setActivePanelId } = stateRef.current;
    if (panels.length < 2) return;
    e.preventDefault();
    const now = Date.now();
    if (now - lastStepAt.current < 200) return;
    lastStepAt.current = now;
    const activeIndex = panels.findIndex((p) => p.panelId === activePanelId);
    const next =
      e.deltaY > 0
        ? Math.min(activeIndex + 1, panels.length - 1)
        : Math.max(activeIndex - 1, 0);
    if (next !== activeIndex) setActivePanelId(panels[next].panelId);
  }, []);

  return (
    <div
      className="flex shrink-0 items-center justify-center py-3"
      onWheel={onWheel}
    >
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
