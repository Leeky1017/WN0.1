// @vitest-environment node
import { spawnSync } from 'node:child_process';

import { describe, expect, it } from 'vitest';

describe('IPC contract automation', () => {
  it('contract:check passes against committed generated files', () => {
    const result = spawnSync('node', ['scripts/ipc-contract-sync.js', 'check'], { encoding: 'utf8' });
    expect(result.error).toBeUndefined();
    expect(result.status).toBe(0);
  });
});

