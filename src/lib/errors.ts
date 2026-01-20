import type { IpcErrorCode } from '../types/ipc';
import { IpcError } from './ipc';

const CODE_MESSAGES: Record<IpcErrorCode, string> = {
  INVALID_ARGUMENT: '参数错误',
  NOT_FOUND: '未找到',
  ALREADY_EXISTS: '已存在',
  CONFLICT: '冲突',
  PERMISSION_DENIED: '权限不足',
  UNSUPPORTED: '不支持的操作',
  IO_ERROR: '读写失败',
  DB_ERROR: '数据库错误',
  MODEL_NOT_READY: '模型未就绪',
  RATE_LIMITED: '请求过于频繁',
  TIMEOUT: '请求超时',
  CANCELED: '已取消',
  UPSTREAM_ERROR: '上游服务错误',
  INTERNAL: '内部错误',
};

export function toUserMessage(code: IpcErrorCode, fallback?: string): string {
  return CODE_MESSAGES[code] || fallback || '未知错误';
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

