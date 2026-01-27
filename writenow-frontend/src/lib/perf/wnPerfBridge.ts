/**
 * WN perf bridge (E2E-only)
 * Why: Allow Playwright to read performance durations without exposing sensitive data in production builds.
 */

export type WnPerfMeasureName =
  | 'wm.editor.ready'
  | 'wm.file.open'
  | 'wm.save.autosave'
  | 'wm.ai.cancel'
  | 'wm.input.latency';

export type WnPerfMarkName =
  | 'wm.editor.mount.start'
  | 'wm.editor.ready'
  | 'wm.file.open.start'
  | 'wm.file.open.ready'
  | 'wm.save.schedule'
  | 'wm.save.done'
  | 'wm.ai.cancel.request'
  | 'wm.ai.cancel.cleared'
  | 'wm.input.keydown'
  | 'wm.input.updated';

export type WnPerfBridge = {
  measures: Record<string, number>;
};

export type ConfigureWnPerfArgs = {
  enabled: boolean;
};

let perfEnabled = false;

/**
 * Why: Gate all perf work behind an explicit E2E flag to avoid leaking metrics to production users.
 */
export function configureWnPerf(args: ConfigureWnPerfArgs): void {
  perfEnabled = args.enabled;
  if (!perfEnabled) return;
  if (typeof window === 'undefined') return;
  window.__WN_PERF__ ??= { measures: {} };
}

/**
 * Why: Avoid touching performance APIs when the bridge is disabled (keeps hot paths clean).
 */
function isPerfEnabled(): boolean {
  if (!perfEnabled) return false;
  if (typeof window === 'undefined') return false;
  return typeof window.performance?.mark === 'function';
}

/**
 * Why: Keep the bridge shape stable for E2E reads without leaking other runtime data.
 */
function ensureBridge(): WnPerfBridge {
  window.__WN_PERF__ ??= { measures: {} };
  return window.__WN_PERF__;
}

/**
 * Why: Store durations only; E2E assertions do not need any content metadata.
 */
function recordMeasure(name: string, duration: number): void {
  const bridge = ensureBridge();
  bridge.measures[name] = duration;
}

/**
 * Why: Provide a lightweight mark wrapper so callers can stay E2E-agnostic.
 */
export function wnPerfMark(name: WnPerfMarkName): void {
  if (!isPerfEnabled()) return;
  performance.mark(name);
}

/**
 * Why: Record the latest duration for a named measure and expose it to Playwright.
 */
export function wnPerfMeasure(name: WnPerfMeasureName, start: WnPerfMarkName, end: WnPerfMarkName): void {
  if (!isPerfEnabled()) return;
  const startEntries = performance.getEntriesByName(start, 'mark');
  const endEntries = performance.getEntriesByName(end, 'mark');
  if (startEntries.length === 0 || endEntries.length === 0) return;

  performance.measure(name, start, end);
  const entries = performance.getEntriesByName(name);
  const latest = entries[entries.length - 1];
  if (!latest) return;

  recordMeasure(name, Math.round(latest.duration));
}
