import { useEffect, useRef } from 'react';

export type UseDebouncedSaveOptions = {
  enabled: boolean;
  isDirty: boolean;
  debounceMs: number;
  trigger: string | number;
  requestSave: () => void;
};

/**
 * Why: Keep autosave behavior consistent across callers (debounce + safe cleanup),
 * while allowing the underlying store to coalesce save requests.
 */
export function useDebouncedSave({ enabled, isDirty, debounceMs, trigger, requestSave }: UseDebouncedSaveOptions) {
  const timerRef = useRef<number | null>(null);
  const requestSaveRef = useRef(requestSave);

  useEffect(() => {
    requestSaveRef.current = requestSave;
  }, [requestSave]);

  useEffect(() => {
    if (!enabled || !isDirty) {
      if (timerRef.current) window.clearTimeout(timerRef.current);
      timerRef.current = null;
      return;
    }

    if (timerRef.current) window.clearTimeout(timerRef.current);
    timerRef.current = window.setTimeout(() => {
      requestSaveRef.current();
      if (timerRef.current) window.clearTimeout(timerRef.current);
      timerRef.current = null;
    }, debounceMs);

    return () => {
      if (timerRef.current) window.clearTimeout(timerRef.current);
      timerRef.current = null;
    };
  }, [debounceMs, enabled, isDirty, trigger]);
}

