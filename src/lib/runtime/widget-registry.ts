import type { WidgetManifest } from '@/lib/widget-manifest';

export type WidgetStatus = 'loading' | 'ready' | 'failed';

export interface WidgetRecord {
  panelId: string;
  iframeRef: HTMLIFrameElement;
  origin: string;
  manifest: WidgetManifest;
  status: WidgetStatus;
  readyTimeout: ReturnType<typeof setTimeout> | null;
  pendingOutbound: Array<Record<string, unknown>>;
}

export class WidgetRegistry {
  private records = new Map<string, WidgetRecord>();

  register(
    panelId: string,
    iframeRef: HTMLIFrameElement,
    origin: string,
    manifest: WidgetManifest,
    readyTimeout: ReturnType<typeof setTimeout> | null
  ): void {
    this.records.set(panelId, {
      panelId,
      iframeRef,
      origin,
      manifest,
      status: 'loading',
      readyTimeout,
      pendingOutbound: [],
    });
  }

  setReady(panelId: string): void {
    const record = this.records.get(panelId);
    if (!record) return;
    if (record.readyTimeout) clearTimeout(record.readyTimeout);
    record.status = 'ready';
    record.readyTimeout = null;
  }

  setFailed(panelId: string): void {
    const record = this.records.get(panelId);
    if (!record) return;
    if (record.readyTimeout) clearTimeout(record.readyTimeout);
    record.status = 'failed';
    record.readyTimeout = null;
  }

  get(panelId: string): WidgetRecord | undefined {
    return this.records.get(panelId);
  }

  getAll(): WidgetRecord[] {
    return Array.from(this.records.values());
  }

  remove(panelId: string): void {
    this.records.delete(panelId);
  }
}
