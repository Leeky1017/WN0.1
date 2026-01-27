import fs from 'node:fs';
import { mkdtemp } from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';

import Database from 'better-sqlite3-node';
import { expect, test, _electron as electron, type Page } from '@playwright/test';

const E2E_AI_API_KEY = typeof process.env.WN_E2E_AI_API_KEY === 'string' ? process.env.WN_E2E_AI_API_KEY.trim() : '';
const E2E_AI_BASE_URL = typeof process.env.WN_E2E_AI_BASE_URL === 'string' ? process.env.WN_E2E_AI_BASE_URL.trim() : '';

type IpcErr = { ok: false; error: { code: string; message: string; details?: unknown } };
type IpcOk<T> = { ok: true; data: T };
type IpcResponse<T> = IpcOk<T> | IpcErr;

async function launchApp(userDataDir: string, extraEnv: Record<string, string> = {}) {
  const electronApp = await electron.launch({
    args: ['.'],
    env: {
      ...process.env,
      WN_E2E: '1',
      WN_OPEN_DEVTOOLS: '0',
      WN_USER_DATA_DIR: userDataDir,
      WN_AI_API_KEY: E2E_AI_API_KEY,
      ...(E2E_AI_BASE_URL ? { WN_AI_BASE_URL: E2E_AI_BASE_URL } : {}),
      WN_AI_MODEL: 'claude-3-5-sonnet-latest',
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

test.describe('Sprint AI Memory (P1): auto preference injection + feedback tracking', () => {
  test.skip(!E2E_AI_API_KEY, 'WN_E2E_AI_API_KEY is required to run AI memory P1 E2E');
  test.setTimeout(10 * 60_000);

  test('ai:skill:run auto injects preferences; ai:skill:feedback persists + ingests signals', async () => {
    const userDataDir = await mkdtemp(path.join(os.tmpdir(), 'writenow-e2e-'));
    const { electronApp, page } = await launchApp(userDataDir);

    try {
      const current = await invoke<{ projectId: string | null }>(page, 'project:getCurrent', {});
      expect(current.ok).toBe(true);
      if (!current.ok || !current.data.projectId) throw new Error('project:getCurrent failed');
      const projectId = current.data.projectId;

      const settings = await invoke<{ settings: unknown }>(page, 'memory:settings:update', {
        injectionEnabled: true,
        preferenceLearningEnabled: true,
        privacyModeEnabled: false,
        preferenceLearningThreshold: 1,
      });
      expect(settings.ok).toBe(true);

      const manualPref = await invoke<{ item: { id: string } }>(page, 'memory:create', {
        type: 'preference',
        content: '手动：保持简洁',
        projectId: null,
      });
      expect(manualPref.ok).toBe(true);

      const systemTemplate = [
        '# PromptTemplate',
        '- version: 1',
        '',
        '## 用户偏好',
        '{{WN_USER_PREFERENCES}}',
        '',
        '# Output',
        '- format: plain_text',
      ].join('\n');

      const first = await invoke<{
        runId: string;
        injected?: { memory: Array<{ type: string; content: string }> };
        prompt?: { stablePrefixHash: string; promptHash: string };
      }>(page, 'ai:skill:run', {
        skillId: 'builtin:polish',
        input: { text: '测试文本', language: 'zh-CN' },
        context: { projectId },
        stream: false,
        prompt: { systemPrompt: systemTemplate, userContent: 'USER: FIRST' },
      });
      expect(first.ok).toBe(true);
      if (!first.ok) throw new Error('ai:skill:run failed');
      expect(first.data.injected?.memory?.length || 0).toBeGreaterThan(0);
      expect(first.data.injected?.memory?.some((m) => m.content.includes('保持简洁'))).toBe(true);

      const second = await invoke<{
        runId: string;
        injected?: { memory: Array<{ type: string; content: string }> };
        prompt?: { stablePrefixHash: string; promptHash: string };
      }>(page, 'ai:skill:run', {
        skillId: 'builtin:polish',
        input: { text: '测试文本', language: 'zh-CN' },
        context: { projectId },
        stream: false,
        prompt: { systemPrompt: systemTemplate, userContent: 'USER: SECOND' },
      });
      expect(second.ok).toBe(true);
      if (!second.ok) throw new Error('ai:skill:run failed (second)');
      expect(second.data.prompt?.stablePrefixHash).toBe(first.data.prompt?.stablePrefixHash);
      expect(second.data.prompt?.promptHash).not.toBe(first.data.prompt?.promptHash);

      const feedback = await invoke<{ recorded: true; feedbackId: string; learned: Array<{ content: string }>; ignored: number }>(
        page,
        'ai:skill:feedback',
        {
          runId: first.data.runId,
          action: 'accept',
          projectId,
          evidenceRef: { signal: '偏好减少重复表达' },
        },
      );
      expect(feedback.ok).toBe(true);
      if (!feedback.ok) throw new Error('ai:skill:feedback failed');
      expect(feedback.data.feedbackId).toBeTruthy();
      expect(feedback.data.learned.some((m) => m.content.includes('偏好减少重复表达'))).toBe(true);

      // Disable injection -> injected.memory should be empty (stable placeholder still exists in template).
      const disabled = await invoke<{ settings: unknown }>(page, 'memory:settings:update', { injectionEnabled: false });
      expect(disabled.ok).toBe(true);

      const third = await invoke<{ injected?: { memory: unknown[] } }>(page, 'ai:skill:run', {
        skillId: 'builtin:polish',
        input: { text: '测试文本', language: 'zh-CN' },
        context: { projectId },
        stream: false,
        prompt: { systemPrompt: systemTemplate, userContent: 'USER: THIRD' },
      });
      expect(third.ok).toBe(true);
      if (!third.ok) throw new Error('ai:skill:run failed (third)');
      expect(third.data.injected?.memory?.length || 0).toBe(0);

      // Best-effort: cancel in-flight runs to avoid hanging background requests.
      await invoke(page, 'ai:skill:cancel', { runId: first.data.runId }).catch(() => undefined);
      await invoke(page, 'ai:skill:cancel', { runId: second.data.runId }).catch(() => undefined);

      await electronApp.close();

      const dbPath = path.join(userDataDir, 'data', 'writenow.db');
      expect(fs.existsSync(dbPath)).toBe(true);
      const db = new Database(dbPath);
      const rows = db
        .prepare('SELECT run_id, action, skill_id, project_id, evidence_ref FROM skill_run_feedback WHERE run_id = ?')
        .all(first.data.runId) as Array<{ run_id: string; action: string; skill_id: string; project_id: string; evidence_ref: string | null }>;
      db.close();

      expect(rows.length).toBeGreaterThanOrEqual(1);
      expect(rows[0].action).toBe('accept');
      expect(rows[0].skill_id).toBe('builtin:polish');
      expect(rows[0].project_id).toBe(projectId);
    } finally {
      await electronApp.close().catch(() => undefined);
    }
  });
});

