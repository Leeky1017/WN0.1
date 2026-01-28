/**
 * RPC WebSocket URL resolution.
 *
 * Why: The standalone frontend must not hardcode the backend URL. We provide a single SSOT that
 * supports user override (persisted) + Vite env fallback + a safe default.
 */

export const DEFAULT_RPC_WS_URL = 'ws://localhost:3000/standalone-rpc';
const STORAGE_KEY = 'writenow_rpc_ws_url_v1';

export interface ResolveRpcWsUrlOptions {
  userOverride?: string | null;
  envOverride?: string | null;
  defaultUrl?: string;
}

function normalizeWsUrl(raw: string): string {
  const trimmed = raw.trim();
  if (!trimmed) return '';

  if (trimmed.startsWith('ws://') || trimmed.startsWith('wss://')) return trimmed;
  if (trimmed.startsWith('http://')) return `ws://${trimmed.slice('http://'.length)}`;
  if (trimmed.startsWith('https://')) return `wss://${trimmed.slice('https://'.length)}`;

  // If the scheme is unknown but present, keep as-is (user knows what they're doing).
  if (trimmed.includes('://')) return trimmed;

  // Support inputs like: localhost:3000/standalone-rpc
  return `ws://${trimmed}`;
}

/**
 * Read user override from localStorage.
 * Failure semantics: returns null if storage is unavailable or value is empty.
 */
export function getUserRpcWsUrlOverride(): string | null {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    const normalized = normalizeWsUrl(raw);
    return normalized ? normalized : null;
  } catch {
    return null;
  }
}

/**
 * Persist user override to localStorage. Empty string clears the override.
 *
 * Failure semantics: persistence is best-effort; on failure we keep runtime behavior unchanged.
 */
export function setUserRpcWsUrlOverride(raw: string): void {
  const normalized = normalizeWsUrl(raw);
  try {
    if (!normalized) {
      localStorage.removeItem(STORAGE_KEY);
      return;
    }
    localStorage.setItem(STORAGE_KEY, normalized);
  } catch (error) {
    // Why: URL persistence is non-critical; keep UX unblocked.
    console.warn('[RPC] Failed to persist RPC URL override:', error);
  }
}

/**
 * Resolve final WebSocket URL with priority:
 * user override > env override > default.
 */
export function resolveRpcWsUrl(options: ResolveRpcWsUrlOptions = {}): string {
  const fallback = options.defaultUrl ?? DEFAULT_RPC_WS_URL;

  const user = options.userOverride ? normalizeWsUrl(options.userOverride) : '';
  if (user) return user;

  const env = options.envOverride ? normalizeWsUrl(options.envOverride) : '';
  if (env) return env;

  return fallback;
}

function getEnvRpcWsUrl(): string | null {
  // Why: `VITE_RPC_URL` is optional; avoid requiring a custom ImportMetaEnv declaration.
  const raw = (import.meta.env as Record<string, unknown>)['VITE_RPC_URL'];
  if (typeof raw !== 'string') return null;
  const normalized = normalizeWsUrl(raw);
  return normalized ? normalized : null;
}

/**
 * Get resolved RPC WebSocket URL (SSOT).
 */
export function getRpcWsUrl(): string {
  return resolveRpcWsUrl({
    userOverride: getUserRpcWsUrlOverride(),
    envOverride: getEnvRpcWsUrl(),
    defaultUrl: DEFAULT_RPC_WS_URL,
  });
}

