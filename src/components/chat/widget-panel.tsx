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

  // When multiple panels exist, shrink each card so adjacent ones peek in.
  // PEEK_PX: visible card width from each side-neighbour.
  // GAP_PX: space between active card edge and the peeking neighbour edge.
  // PADDING_X: slot padding → PEEK_PX + GAP_PX.
  // STEP_PX: how far each slot shifts per index step → (2 * PADDING_X) - GAP_PX.
  const multiPanel = panels.length > 1;
  const PADDING_X = multiPanel ? 52 : 24;
  const PADDING_Y = 24;
  const STEP_PX = multiPanel ? PADDING_X * 2 - 8 : 0;

  return (
    <div className="flex h-full min-w-0 flex-col" style={DOT_BG}>
      {/* Panel area — all panels stay in the DOM via translateX so iframes
          never lose their browsing context. */}
      <div className="relative flex-1 overflow-hidden">
        {panels.map((panel, index) => {
          const offset = index - activeIndex;
          const isActive = offset === 0;
          return (
            <div
              key={panel.panelId}
              className="absolute inset-0 transition-[transform,opacity] duration-300 ease-out"
              style={{
                padding: `${PADDING_Y}px ${PADDING_X}px`,
                transform: `translateX(calc(${offset} * (100% - ${STEP_PX}px)))`,
                opacity: isActive ? 1 : 0.55,
                willChange: 'transform',
              }}
            >
              <div
                className="h-full w-full transition-transform duration-300 ease-out"
                style={{ transform: isActive ? undefined : 'scale(0.92)' }}
              >
                <WidgetCard
                  panel={panel}
                  NativeComponent={getNativeComponent(panel)}
                  iframeRef={getIframeRefCallback(panel.panelId)}
                  onClose={() => closePanel(panel.panelId)}
                  className="h-full w-full"
                />
              </div>
            </div>
          );
        })}

        {/* Click zones over the peek strips — must be last children so they
            sit above the panel slots in pointer-event order. */}
        {activeIndex > 0 && (
          <div
            className="absolute top-0 bottom-0 left-0 z-30 cursor-pointer"
            style={{ width: PADDING_X }}
            onClick={() => setActivePanelId(panels[activeIndex - 1].panelId)}
          />
        )}
        {activeIndex < panels.length - 1 && (
          <div
            className="absolute top-0 right-0 bottom-0 z-30 cursor-pointer"
            style={{ width: PADDING_X }}
            onClick={() => setActivePanelId(panels[activeIndex + 1].panelId)}
          />
        )}
      </div>

      <WidgetDotNav
        panels={panels}
        activePanelId={effectiveActivePanelId}
        setActivePanelId={setActivePanelId}
      />
    </div>
  );
}
