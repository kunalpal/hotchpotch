'use client';

import type { ComponentType, CSSProperties } from 'react';
import type { NativeWidgetHost } from '@/lib/runtime/native-widget-host';
import { TravelMap } from '@/components/widgets/TravelMap';
import { FinanceBudget } from '@/components/widgets/FinanceBudget';
import { DataNotes } from '@/components/widgets/DataNotes';
import { WidgetCard } from './widget-card';
import { WidgetDotNav } from './widget-dot-nav';

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
  /** briefly true when a background tool completes — drives the dot pulse animation */
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
  closePanel: (panelId: string) => void;
  getIframeRefCallback: (
    panelId: string
  ) => (el: HTMLIFrameElement | null) => void;
}

function getNativeComponent(
  panel: PanelEntry
): ComponentType<{ host: NativeWidgetHost }> | null {
  if (panel.hostType !== 'native') return null;
  return (
    NATIVE_WIDGET_COMPONENTS[panel.panelId] ??
    (panel.nativeHost
      ? NATIVE_WIDGET_COMPONENTS[panel.nativeHost.manifest.widget_id]
      : null) ??
    null
  );
}

const DOT_BG: CSSProperties = {
  backgroundImage:
    'radial-gradient(circle, color-mix(in srgb, currentColor 10%, transparent) 1.5px, transparent 1.5px)',
  backgroundSize: '22px 22px',
};

export function WidgetPanel({
  panels,
  activePanelId,
  setActivePanelId,
  closePanel,
  getIframeRefCallback,
}: WidgetPanelProps) {
  const effectiveActivePanelId =
    panels.find((p) => p.panelId === activePanelId) !== undefined
      ? activePanelId
      : (panels[panels.length - 1]?.panelId ?? null);

  const activeIndex = Math.max(
    0,
    panels.findIndex((p) => p.panelId === effectiveActivePanelId)
  );

  return (
    <div className="flex h-full min-w-0 flex-col" style={DOT_BG}>
      {/* Panel area — all panels stay in the DOM via translateX so iframes
          never lose their browsing context. */}
      <div className="relative flex-1 overflow-hidden">
        {panels.map((panel, index) => {
          const offset = (index - activeIndex) * 100;
          return (
            <div
              key={panel.panelId}
              className="absolute inset-0 transition-transform duration-300 ease-out"
              style={{
                padding: 24,
                transform: `translateX(${offset}%)`,
                willChange: 'transform',
              }}
            >
              <WidgetCard
                panel={panel}
                NativeComponent={getNativeComponent(panel)}
                iframeRef={getIframeRefCallback(panel.panelId)}
                onClose={() => closePanel(panel.panelId)}
                className="h-full w-full"
              />
            </div>
          );
        })}
      </div>

      <WidgetDotNav
        panels={panels}
        activePanelId={effectiveActivePanelId}
        setActivePanelId={setActivePanelId}
      />
    </div>
  );
}
