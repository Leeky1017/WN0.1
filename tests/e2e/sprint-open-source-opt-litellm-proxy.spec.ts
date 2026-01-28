import { mkdtemp } from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';

import { expect, test, _electron as electron, type Page } from '@playwright/test';

type IpcErr = { ok: false; error: { code: string; message: string; details?: unknown } };
type IpcOk<T> = { ok: true; data: T };
type IpcResponse<T> = IpcOk<T> | IpcErr;

type SkillListResponse = { skills: Array<{ id: string; enabled: boolean; valid: boolean }> };
type AiSkillRunResponse = { runId: string; stream: boolean };

async function launchApp(userDataDir: string, extraEnv: Record<string, string> = {}) {
  const electronApp = await electron.launch({
    args: ['.'],
    env: {
      ...process.env,
      WN_E2E: '1',
      WN_OPEN_DEVTOOLS: '0',
      WN_USER_DATA_DIR: userDataDir,
      // Why: default CI runs should not depend on external AI services.
      WN_AI_API_KEY: '',
      ...extraEnv,
    },
  });

  const page = await electronApp.firstWindow();
  await expect(page.getByText('WriteNow')).toBeVisible();

  return { electronApp, page };
}

async function invoke<T>(page: Page, channel: string, payload: unknown) {
  const result = await page.evaluate(
    async (arg) => {
      const input = arg as { channel: string; payload: unknown };
      const api = (window as unknown as { writenow: { invoke: (c: string, p: unknown) => Promise<unknown> } }).writenow;
      return api.invoke(input.channel, input.payload);
    },
    { channel, payload },
  );
  return result as IpcResponse<T>;
}

async function pickBuiltinSkillId(page: Page) {
  const list = await invoke<SkillListResponse>(page, 'skill:list', { includeDisabled: true });
  expect(list.ok).toBe(true);
  if (!list.ok) throw new Error('skill:list failed');

  const skills = list.data.skills.filter((s) => s.enabled && s.valid);
  expect(skills.length).toBeGreaterThan(0);

  const preferred = skills.find((s) => s.id === 'builtin:polish');
  return (preferred ?? skills[0]).id;
}

test.describe('Sprint Open-Source-Opt (P3): LiteLLM Proxy routing (optional)', () => {
  test('default path requires provider api key when proxy is disabled', async () => {
    const userDataDir = await mkdtemp(path.join(os.tmpdir(), 'writenow-e2e-'));
    const { electronApp, page } = await launchApp(userDataDir, {
      WN_AI_PROXY_ENABLED: '0',
    });

    try {
      const skillId = await pickBuiltinSkillId(page);
      const result = await invoke<AiSkillRunResponse>(page, 'ai:skill:run', {
        skillId,
        input: { text: 'Hello' },
        stream: false,
        prompt: { systemPrompt: 'SYSTEM', userContent: 'USER' },
        injected: { memory: [], refs: [] },
      });

      expect(result.ok).toBe(false);
      if (result.ok) return;

      expect(result.error.code).toBe('INVALID_ARGUMENT');
      expect(result.error.message.toLowerCase()).toContain('api key');
    } finally {
      await electronApp.close().catch(() => undefined);
    }
  });

  test('proxy enabled requires baseUrl (and does not require provider api key)', async () => {
    const userDataDir = await mkdtemp(path.join(os.tmpdir(), 'writenow-e2e-'));
    const { electronApp, page } = await launchApp(userDataDir, {
      WN_AI_PROXY_ENABLED: '1',
      // Intentionally omit confirmation fields to validate deterministic error semantics.
      WN_AI_PROXY_BASE_URL: '',
    });

    try {
      const skillId = await pickBuiltinSkillId(page);
      const result = await invoke<AiSkillRunResponse>(page, 'ai:skill:run', {
        skillId,
        input: { text: 'Hello' },
        stream: false,
        prompt: { systemPrompt: 'SYSTEM', userContent: 'USER' },
        injected: { memory: [], refs: [] },
      });

      expect(result.ok).toBe(false);
      if (result.ok) return;

      expect(result.error.code).toBe('INVALID_ARGUMENT');
      expect(result.error.message.toLowerCase()).toContain('proxy baseurl');
    } finally {
      await electronApp.close().catch(() => undefined);
    }
  });
});

