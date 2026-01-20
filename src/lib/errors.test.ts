import { describe, expect, it } from 'vitest';

import type { IpcErrorCode } from '../types/ipc';
import { IpcError } from './ipc';
import { isIpcError, toLogMessage, toUserMessage } from './errors';

const ALL_ERROR_CODES: IpcErrorCode[] = [
  'INVALID_ARGUMENT',
  'NOT_FOUND',
  'ALREADY_EXISTS',
  'CONFLICT',
  'PERMISSION_DENIED',
  'UNSUPPORTED',
  'IO_ERROR',
  'DB_ERROR',
  'MODEL_NOT_READY',
  'RATE_LIMITED',
  'TIMEOUT',
  'CANCELED',
  'UPSTREAM_ERROR',
  'INTERNAL',
];

describe('toUserMessage', () => {
  it('should map every IPC error code', () => {
    for (const code of ALL_ERROR_CODES) {
      expect(toUserMessage(code)).toBeTypeOf('string');
      expect(toUserMessage(code).length).toBeGreaterThan(0);
    }
  });

  it('should prefer code mapping over fallback', () => {
    expect(toUserMessage('INTERNAL', 'fallback message')).toBe('内部错误');
  });
});

describe('toLogMessage', () => {
  it('should format code and message', () => {
    const err = new IpcError({ code: 'INVALID_ARGUMENT', message: 'bad', details: { a: 1 } });
    expect(toLogMessage(err)).toContain('[INVALID_ARGUMENT]');
    expect(toLogMessage(err)).toContain('bad');
    expect(toLogMessage(err)).toContain('"a":1');
  });

  it('should not throw on unserializable details', () => {
    const circular: { self?: unknown } = {};
    circular.self = circular;

    const err = new IpcError({ code: 'INTERNAL', message: 'boom', details: circular });
    const formatted = toLogMessage(err);
    expect(formatted).toContain('[INTERNAL]');
    expect(formatted).toContain('boom');
    expect(formatted).toContain('[unserializable]');
  });
});

describe('isIpcError', () => {
  it('should detect IpcError instances', () => {
    expect(isIpcError(new IpcError({ code: 'INTERNAL', message: 'x' }))).toBe(true);
    expect(isIpcError(new Error('x'))).toBe(false);
    expect(isIpcError({})).toBe(false);
  });
});
