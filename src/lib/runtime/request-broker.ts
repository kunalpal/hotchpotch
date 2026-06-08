interface PendingCall {
  resolve: (value: unknown) => void;
  reject: (err: Error) => void;
  panelId: string;
  timer: ReturnType<typeof setTimeout>;
}

/**
 * Shared pending-call machinery for request/response widget interactions.
 *
 * Subclasses call track() to register an in-flight request and get a Promise.
 * When a result arrives they call settle() or fail() by id. On timeout the
 * onTimeout callback fires (timer is still in pending at that point), so
 * the callback can call settle/fail to close the promise in whichever way
 * makes sense for that request type.
 */
export class RequestBroker {
  protected readonly pending = new Map<string, PendingCall>();

  protected track(
    id: string,
    panelId: string,
    timeoutMs: number,
    onTimeout: (id: string) => void
  ): Promise<unknown> {
    return new Promise((resolve, reject) => {
      const timer = setTimeout(() => onTimeout(id), timeoutMs);
      this.pending.set(id, { resolve, reject, panelId, timer });
    });
  }

  /** Resolve a pending call by id. Returns the panelId, or null if not found. */
  protected settle(id: string, value: unknown): string | null {
    const call = this.pending.get(id);
    if (!call) return null;
    clearTimeout(call.timer);
    this.pending.delete(id);
    call.resolve(value);
    return call.panelId;
  }

  /** Reject a pending call by id. Returns the panelId, or null if not found. */
  protected fail(id: string, err: Error): string | null {
    const call = this.pending.get(id);
    if (!call) return null;
    clearTimeout(call.timer);
    this.pending.delete(id);
    call.reject(err);
    return call.panelId;
  }
}
