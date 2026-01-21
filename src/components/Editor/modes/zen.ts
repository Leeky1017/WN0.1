import { useEffect, useRef, useState } from 'react';

export type ZenChromeConfig = {
  enabled: boolean;
  edgePx?: number;
  hideDelayMs?: number;
};

export type ZenChromeState = {
  isZenEnabled: boolean;
  isPeekActive: boolean;
  chromeHidden: boolean;
};

function isNearEdge(x: number, y: number, edgePx: number) {
  const width = window.innerWidth;
  const height = window.innerHeight;
  return x <= edgePx || y <= edgePx || x >= width - edgePx || y >= height - edgePx;
}

function isOverChrome(x: number, y: number): boolean {
  try {
    const el = document.elementFromPoint(x, y);
    if (!el) return false;
    return Boolean(el.closest('[data-zen-chrome]'));
  } catch {
    return false;
  }
}

/**
 * Why: Zen mode should hide all chrome while still being discoverable; edge-hover "peek"
 * provides temporary UI access without exiting zen, and avoids permanent layout mutation.
 */
export function useZenChrome({ enabled, edgePx = 16, hideDelayMs = 250 }: ZenChromeConfig): ZenChromeState {
  const [peek, setPeek] = useState(false);
  const peekRef = useRef(false);
  const hideTimerRef = useRef<number | null>(null);

  useEffect(() => {
    peekRef.current = peek;
  }, [peek]);

  useEffect(() => {
    document.body.dataset.wnZen = enabled ? 'true' : 'false';
    return () => {
      delete document.body.dataset.wnZen;
    };
  }, [enabled]);

  useEffect(() => {
    const clearHideTimer = () => {
      if (hideTimerRef.current) window.clearTimeout(hideTimerRef.current);
      hideTimerRef.current = null;
    };

    if (!enabled) {
      clearHideTimer();
      peekRef.current = false;
      const resetId = window.setTimeout(() => setPeek(false), 0);
      return () => window.clearTimeout(resetId);
    }

    const setPeekSafe = (next: boolean) => {
      peekRef.current = next;
      setPeek(next);
    };

    const onMouseMove = (e: MouseEvent) => {
      const edge = isNearEdge(e.clientX, e.clientY, edgePx);
      const inChrome = isOverChrome(e.clientX, e.clientY);
      const shouldPeek = edge || inChrome;

      if (shouldPeek) {
        clearHideTimer();
        if (!peekRef.current) setPeekSafe(true);
        return;
      }

      if (!peekRef.current) return;
      if (hideTimerRef.current) return;

      hideTimerRef.current = window.setTimeout(() => {
        hideTimerRef.current = null;
        setPeekSafe(false);
      }, hideDelayMs);
    };

    window.addEventListener('mousemove', onMouseMove, { passive: true });
    return () => {
      window.removeEventListener('mousemove', onMouseMove);
      clearHideTimer();
    };
  }, [edgePx, enabled, hideDelayMs]);

  return {
    isZenEnabled: enabled,
    isPeekActive: peek,
    chromeHidden: enabled && !peek,
  };
}
