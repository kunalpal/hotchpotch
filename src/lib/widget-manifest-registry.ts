import type { WidgetManifest } from '@/lib/widget-manifest';
import { WidgetManifestSchema } from '@/lib/widget-manifest';

import travelMapRaw from '@/lib/widgets/travel-map/manifest.json';
import financeBudgetRaw from '@/lib/widgets/finance-budget/manifest.json';
import dataNotesRaw from '@/lib/widgets/data-notes/manifest.json';

/**
 * Pre-parsed manifests for native widgets, keyed by widget_id.
 * Import-time JSON parsing avoids runtime fetch overhead.
 */
export const NATIVE_MANIFESTS: Record<string, WidgetManifest> = {
  'travel.map': WidgetManifestSchema.parse(travelMapRaw),
  'finance.budget': WidgetManifestSchema.parse(financeBudgetRaw),
  'data.notes': WidgetManifestSchema.parse(dataNotesRaw),
};
