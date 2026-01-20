import { describe, expect, it, vi } from 'vitest';

import type { RendererLogPayload } from './logger';
import { createRendererLogger } from './logger';

describe('createRendererLogger', () => {
  it('should write to console in dev mode', () => {
    const spy = vi.spyOn(console, 'error').mockImplementation(() => undefined);
    const logger = createRendererLogger({ isDev: true });

    logger.error('test', 'boom', { a: 1 });
    expect(spy).toHaveBeenCalled();

    spy.mockRestore();
  });

  it('should report errors to main in production mode', () => {
    const send = vi.fn<(payload: RendererLogPayload) => void>();
    const logger = createRendererLogger({ isDev: false, sink: { send } });

    logger.info('test', 'hello');
    expect(send).not.toHaveBeenCalled();

    logger.error('test', 'boom', { a: 1 });
    expect(send).toHaveBeenCalledWith(
      expect.objectContaining({
        level: 'error',
        module: 'test',
        message: 'boom',
        details: { a: 1 },
        ts: expect.any(Number),
      })
    );
  });
});

