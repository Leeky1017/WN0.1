/**
 * Unit tests for RPC API wrapper
 * Why: Verify RpcError class and error handling logic
 */

import { describe, it, expect } from 'vitest';
import { RpcError } from './api';
import type { IpcError } from '@/types/ipc-generated';

describe('RpcError', () => {
  it('should create error with all properties', () => {
    const error = new RpcError('NOT_FOUND', 'Resource not found', true, { id: '123' });
    
    expect(error.name).toBe('RpcError');
    expect(error.code).toBe('NOT_FOUND');
    expect(error.message).toBe('Resource not found');
    expect(error.retryable).toBe(true);
    expect(error.details).toEqual({ id: '123' });
  });

  it('should create error from IpcError', () => {
    const ipcError: IpcError = {
      code: 'TIMEOUT',
      message: 'Request timed out',
      retryable: true,
      details: { timeout: 30000 },
    };
    
    const error = RpcError.fromIpcError(ipcError);
    
    expect(error.code).toBe('TIMEOUT');
    expect(error.message).toBe('Request timed out');
    expect(error.retryable).toBe(true);
    expect(error.details).toEqual({ timeout: 30000 });
  });

  it('should extend Error class', () => {
    const error = new RpcError('INTERNAL', 'Internal error');
    
    expect(error instanceof Error).toBe(true);
    expect(error instanceof RpcError).toBe(true);
  });

  it('should handle optional properties', () => {
    const error = new RpcError('INVALID_ARGUMENT', 'Invalid input');
    
    expect(error.retryable).toBeUndefined();
    expect(error.details).toBeUndefined();
  });

  it('should work with try/catch', () => {
    const throwError = () => {
      throw new RpcError('PERMISSION_DENIED', 'Access denied');
    };
    
    expect(throwError).toThrow(RpcError);
    expect(throwError).toThrow('Access denied');
  });
});
