import { useEffect } from 'react';

import { usePomodoroStore } from '../stores/pomodoroStore';

/**
 * Why: Pomodoro must keep time (and recover) independently from whether the StatusBar UI is open/expanded.
 */
export function usePomodoroRuntime() {
  const hydrate = usePomodoroStore((s) => s.hydrate);
  const tick = usePomodoroStore((s) => s.tick);
  const isHydrated = usePomodoroStore((s) => s.isHydrated);

  useEffect(() => {
    hydrate();
  }, [hydrate]);

  useEffect(() => {
    if (!isHydrated) return;
    tick();
    const id = window.setInterval(() => tick(), 1000);
    return () => window.clearInterval(id);
  }, [isHydrated, tick]);
}
