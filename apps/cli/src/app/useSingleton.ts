import { useRef } from "react";

/**
 * Creates one stable value for the lifetime of the component instance.
 *
 * @param createValue - Factory used for the initial value.
 * @returns The stable singleton value.
 */
export function useSingleton<T>(createValue: () => T): T {
  const valueRef = useRef<T | null>(null);

  if (valueRef.current === null) {
    valueRef.current = createValue();
  }

  return valueRef.current;
}
