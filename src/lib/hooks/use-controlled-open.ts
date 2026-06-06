'use client';

import { useState } from 'react';

/**
 * Shared hook for the controlled-vs-internal open state pattern.
 *
 * When no controlled props are provided, manages state internally via `useState`.
 * When controlled props are provided, delegates to the controlled open state
 * and onChange callback.
 */
export function useControlledOpen(
  controlledOpen?: boolean,
  controlledOnChange?: (open: boolean) => void
): [boolean, (open: boolean) => void] {
  const [internalOpen, setInternalOpen] = useState(false);

  const isOpen = controlledOpen !== undefined ? controlledOpen : internalOpen;
  const setOpen =
    controlledOnChange !== undefined ? controlledOnChange : setInternalOpen;

  return [isOpen, setOpen];
}
