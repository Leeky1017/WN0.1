import { describe, expect, it, vi } from 'vitest';

import { IpcError, invoke } from './ipc';

describe('invoke', () => {
  it('should return data on ok response', async () => {
    const invokeMock = vi.fn().mockResolvedValue({
      ok: true,
      data: {
        items: [
          {
            name: 'hello.md',
            path: 'hello.md',
            createdAt: 1,
            wordCount: 0,
          },
        ],
      },
    });
    const onMock = vi.fn();
    const offMock = vi.fn();

    window.writenow = {
      invoke: invokeMock,
      on: onMock,
      off: offMock,
    };

    const data = await invoke('file:list', {});
    expect(data).toEqual({
      items: [
        {
          name: 'hello.md',
          path: 'hello.md',
          createdAt: 1,
          wordCount: 0,
        },
      ],
    });
    expect(invokeMock).toHaveBeenCalledWith('file:list', {});
  });

  it('should throw IpcError on error response', async () => {
    const invokeMock = vi.fn().mockResolvedValue({
      ok: false,
      error: { code: 'INVALID_ARGUMENT', message: 'bad', details: { path: 'x' } },
    });
    const onMock = vi.fn();
    const offMock = vi.fn();

    window.writenow = {
      invoke: invokeMock,
      on: onMock,
      off: offMock,
    };

    await expect(invoke('file:read', { path: '../evil.md' })).rejects.toBeInstanceOf(IpcError);
    await expect(invoke('file:read', { path: '../evil.md' })).rejects.toMatchObject({
      code: 'INVALID_ARGUMENT',
      message: 'bad',
      details: { path: 'x' },
    });
  });
});
