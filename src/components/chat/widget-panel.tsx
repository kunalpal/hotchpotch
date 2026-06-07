'use client';

import type { ComponentType } from 'react';
import type { NativeWidgetHost } from '@/lib/runtime/native-widget-host';
import { TravelMap } from '@/components/widgets/TravelMap';
import { FinanceBudget } from '@/components/widgets/FinanceBudget';
import { DataNotes } from '@/components/widgets/DataNotes';
import { Button } from '@/components/ui/button';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { cn } from '@/utils/ui';

export interface PanelEntry {
  panelId: string;
  displayName: string;
  hostType: 'iframe' | 'native';
  /** iframe only — undefined until mountIframeWidget registers, then set to trigger load */
  src: string | undefined;
  /** native only — the NativeWidgetHost instance for this panel */
  nativeHost: NativeWidgetHost | undefined;
  /** true once onRenderWidgetStarted fires — controls visibility */
  hasContent: boolean;
  busy: boolean;
  /** briefly true when a background tool completes — drives the tab pulse animation */
  pulsing: boolean;
  failed: boolean;
}

const NATIVE_WIDGET_COMPONENTS: Record<
  string,
  ComponentType<{ host: NativeWidgetHost }>
> = {
  'travel.map': TravelMap,
  'finance.budget': FinanceBudget,
  'data.notes': DataNotes,
};

interface WidgetPanelProps {
  panels: PanelEntry[];
  activePanelId: string | null;
  setActivePanelId: (id: string) => void;
  splitMode: boolean;
  setSplitMode: (updater: (prev: boolean) => boolean) => void;
  closePanel: (panelId: string) => void;
  getIframeRefCallback: (
    panelId: string
  ) => (el: HTMLIFrameElement | null) => void;
}

export function WidgetPanel({
  panels,
  activePanelId,
  setActivePanelId,
  splitMode,
  setSplitMode,
  closePanel,
  getIframeRefCallback,
}: WidgetPanelProps) {
  // Derived state — computed from props to avoid cascading renders
  const effectiveActivePanelId =
    panels.find((p) => p.panelId === activePanelId) !== undefined
      ? activePanelId
      : (panels[panels.length - 1]?.panelId ?? null);

  const panelsWithContent = panels.filter((p) => p.hasContent).length;
  const effectiveSplitMode = splitMode && panelsWithContent >= 2;

  // In split mode, secondary is the first panel with content that isn't active
  const secondaryPanelId = effectiveSplitMode
    ? (panels.find((p) => p.panelId !== effectiveActivePanelId && p.hasContent)
        ?.panelId ?? null)
    : null;

  return (
    <Tabs
      value={effectiveActivePanelId ?? ''}
      onValueChange={setActivePanelId}
      className="flex h-full min-w-0 flex-col"
    >
      <TabsList className="border-border bg-muted/30 h-auto w-full justify-start gap-1 rounded-none border-b px-2 py-1">
        {panels.map((panel) => (
          <div key={panel.panelId} className="flex items-center">
            <TabsTrigger
              value={panel.panelId}
              className={cn(
                'h-7 gap-1 px-2 text-xs data-[state=active]:shadow-none',
                panel.pulsing && 'text-emerald-500'
              )}
            >
              {panel.busy && (
                <span className="size-1.5 shrink-0 rounded-full bg-yellow-400" />
              )}
              {panel.failed && <span className="text-destructive">⚠</span>}
              {panel.displayName}
            </TabsTrigger>
            <button
              onClick={() => closePanel(panel.panelId)}
              title="Close panel"
              className="text-muted-foreground hover:text-foreground px-1 text-sm leading-none"
            >
              ×
            </button>
          </div>
        ))}

        {panelsWithContent >= 2 && (
          <Button
            variant="outline"
            size="xs"
            onClick={() => setSplitMode((m) => !m)}
            className={cn('ml-auto', effectiveSplitMode && 'bg-primary/10')}
          >
            {effectiveSplitMode ? '⊟ Single' : '⊞ Split'}
          </Button>
        )}
      </TabsList>

      {/* Panel area — content lifecycle managed manually so all panels
          stay in the DOM (iframes would lose state if unmounted).
          TabsContent is intentionally omitted; Tabs only drives selection. */}
      <div className="relative flex-1 overflow-hidden">
        {/* Loading / failed placeholder for the active panel */}
        {(() => {
          const active = panels.find(
            (p) => p.panelId === effectiveActivePanelId
          );
          if (!active || active.hasContent) return null;
          return (
            <div className="text-muted-foreground absolute inset-0 flex items-center justify-center text-sm">
              {active.failed ? 'Widget failed to load' : 'Waiting for widget…'}
            </div>
          );
        })()}

        {/* All panels kept in DOM to preserve state; shown/hidden via display.
            Iframe panels use a stable callback-ref pattern (React-recommended for
            dynamic ref lists). Native panels render their component directly. */}
        {panels.map((panel) => {
          const isActive = panel.panelId === effectiveActivePanelId;
          const isSecondary = panel.panelId === secondaryPanelId;
          const show = (isActive || isSecondary) && panel.hasContent;

          const left = effectiveSplitMode && isSecondary ? '50%' : '0';
          const width = effectiveSplitMode && secondaryPanelId ? '50%' : '100%';

          if (panel.hostType === 'native' && panel.nativeHost) {
            const NativeComponent =
              NATIVE_WIDGET_COMPONENTS[panel.panelId] ??
              NATIVE_WIDGET_COMPONENTS[panel.nativeHost.manifest.widget_id];
            if (!NativeComponent) return null;
            return (
              <div
                key={panel.panelId}
                className={cn(
                  'absolute top-0 bottom-0 overflow-auto',
                  !show && 'hidden',
                  effectiveSplitMode && isSecondary && 'border-border border-l'
                )}
                style={{ left, width }}
              >
                <NativeComponent host={panel.nativeHost} />
              </div>
            );
          }

          return (
            <iframe
              key={panel.panelId}
              ref={getIframeRefCallback(panel.panelId)}
              src={panel.src}
              title={panel.displayName}
              sandbox="allow-scripts allow-forms"
              className={cn(
                'absolute top-0 bottom-0 border-none',
                !show && 'hidden',
                effectiveSplitMode && isSecondary && 'border-border border-l'
              )}
              style={{ left, width }}
            />
          );
        })}
      </div>
    </Tabs>
  );
}
