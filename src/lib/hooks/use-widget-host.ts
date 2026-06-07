'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { v4 as uuidv4 } from 'uuid';
import { PROTOCOL_VERSION } from '@/lib/widget-protocol';
import type { Envelope, InboundEnvelope } from '@/lib/widget-protocol';
import type { NativeWidgetHost } from '@/lib/runtime/native-widget-host';

/**
 * Binds a native widget component to its NativeWidgetHost.
 *
 * On mount: calls host.bind() which emits READY to the runtime and flushes
 * any queued outbound envelopes (e.g. a MOUNT that arrived before the component
 * rendered). On unmount: calls host.dispose().
 *
 * Returns:
 * - payload: the last MOUNT/REPLACE payload received from the runtime, typed as T
 * - sendAction: dispatches an ACTION envelope back to the runtime through the
 *   same injection guard as iframe widgets
 *
 * Optional onEnvelope callback receives ALL envelopes (including SKILL_INVOKE)
 * so widgets can respond to runtime requests beyond data delivery.
 */
export function useWidgetHost<T = unknown>(
  host: NativeWidgetHost,
  onEnvelope?: (envelope: Envelope) => void
): {
  payload: T | null;
  sendAction: (actionType: string, data: Record<string, string>) => void;
} {
  const [payload, setPayload] = useState<T | null>(null);
  // Ref so the bind handler always calls the latest onEnvelope without capturing a stale value
  const onEnvelopeRef = useRef(onEnvelope);
  // Updated outside render (react-hooks/refs) so the handler closure stays current
  useEffect(() => {
    onEnvelopeRef.current = onEnvelope;
  });

  useEffect(() => {
    const handler = (envelope: Envelope) => {
      if (envelope.type === 'MOUNT' || envelope.type === 'REPLACE') {
        const data =
          (envelope.payload.payload as T | undefined) ??
          (envelope.payload.initial_payload as T | undefined) ??
          null;
        setPayload(data);
      }
      // Forward all envelopes to the optional consumer (e.g. for SKILL_INVOKE)
      onEnvelopeRef.current?.(envelope);
    };

    host.bind(handler);

    return () => {
      host.dispose();
    };
  }, [host]);

  const sendAction = useCallback(
    (actionType: string, data: Record<string, string>) => {
      const envelope: InboundEnvelope = {
        protocol: PROTOCOL_VERSION,
        message_id: uuidv4(),
        reply_to: null,
        type: 'ACTION',
        timestamp: Date.now(),
        payload: {
          action_type: actionType,
          data,
          urgency:
            host.manifest.action_templates[actionType]?.urgency ?? 'passive',
        },
      };
      host.receiveFromWidget(envelope);
    },
    [host]
  );

  return { payload, sendAction };
}
