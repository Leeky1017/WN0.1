import type { IpcErrorCode } from '../types/ipc';
import { IpcError } from './ipc';
import { i18n } from './i18n';

export function toUserMessage(code: IpcErrorCode, fallback?: string): string {
  const key = `errors.${code}`;
  const translated = i18n.t(key);
  if (typeof translated === 'string' && translated !== key) return translated;
  return fallback || code;
}

function safeJson(value: unknown): string | null {
  if (typeof value === 'undefined') return null;
  if (value === null) return 'null';
  try {
    return JSON.stringify(value);
  } catch {
    return '"[unserializable]"';
  }
}

export function toLogMessage(error: IpcError): string {
  const details = safeJson(error.details);
  return `[${error.code}] ${error.message}${details ? ` ${details}` : ''}`;
}

export function isIpcError(error: unknown): error is IpcError {
  return error instanceof IpcError;
}
