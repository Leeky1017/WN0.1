import { mkdtemp, readFile } from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';

import { expect, test, _electron as electron, type Page } from '@playwright/test';

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

async function getProjectId(page: Page) {
  const current = await invoke<{ projectId: string | null }>(page, 'project:getCurrent', {});
  expect(current.ok).toBe(true);
  if (!current.ok || !current.data.projectId) throw new Error('project:getCurrent failed');
  return current.data.projectId;
}

test('conversation summary generation falls back when L2 is unavailable and updates index quality', async () => {
  const userDataDir = await mkdtemp(path.join(os.tmpdir(), 'writenow-e2e-'));
  const { electronApp, page } = await launchApp(userDataDir, { WN_JUDGE_MODEL_PATH: '/__WN_E2E__/missing-model.gguf' });

  try {
    const projectId = await getProjectId(page);
    const ensured = await invoke<{ projectId: string; rootPath: string; ensured: true }>(page, 'context:writenow:ensure', { projectId });
    expect(ensured.ok).toBe(true);
    if (!ensured.ok) throw new Error('context:writenow:ensure failed');

    const createdAt = new Date().toISOString();
    const messages = [
      { role: 'system', content: 'SYSTEM', createdAt },
      { role: 'user', content: '原文：我我我非常非常喜欢喜欢这个故事。', createdAt },
      { role: 'assistant', content: '建议：我非常喜欢这个故事。', createdAt },
    ];

    const saved = await invoke<{ saved: true; index: { id: string; fullPath: string } }>(page, 'context:writenow:conversations:save', {
      projectId,
      conversation: {
        articleId: 'ConversationSummary.md',
        messages,
        skillsUsed: ['builtin:polish'],
      },
    });
    expect(saved.ok).toBe(true);
    if (!saved.ok) throw new Error('context:writenow:conversations:save failed');

    await page.waitForFunction(() => (window as unknown as { __WN_E2E__?: { ready?: boolean } }).__WN_E2E__?.ready === true, {});

    const updated = await page.evaluate(async (arg) => {
      const input = arg as {
        projectId: string;
        conversationId: string;
        articleId: string;
        messages: unknown[];
      };
      type DebugApi = {
        generateConversationSummary?: (input: {
          projectId: string;
          conversationId: string;
          articleId: string;
          skillId: string;
          skillName: string;
          outcome: 'accepted' | 'rejected' | 'canceled' | 'error';
          originalText: string;
          suggestedText: string;
          messages: unknown[];
        }) => Promise<unknown>;
      };
      const w = window as unknown as { __WN_E2E__?: DebugApi };
      if (!w.__WN_E2E__?.generateConversationSummary) throw new Error('__WN_E2E__.generateConversationSummary is not ready');

      return w.__WN_E2E__.generateConversationSummary({
        projectId: input.projectId,
        conversationId: input.conversationId,
        articleId: input.articleId,
        skillId: 'builtin:polish',
        skillName: 'Polish',
        outcome: 'accepted',
        originalText: '我我我非常非常喜欢喜欢这个故事。',
        suggestedText: '我非常喜欢这个故事。',
        messages: input.messages,
      });
    }, { projectId, conversationId: saved.ok ? saved.data.index.id : '', articleId: 'ConversationSummary.md', messages });

    const indexItem = updated as { id: string; summary: string; summaryQuality: string };
    expect(indexItem.id).toBe(saved.ok ? saved.data.index.id : '');
    expect(indexItem.summary.trim().length).toBeGreaterThan(0);
    expect(indexItem.summaryQuality).toBe('heuristic');

    const indexPath = path.join(ensured.data.rootPath, 'conversations', 'index.json');
    const indexRaw = await readFile(indexPath, 'utf8');
    const indexJson = JSON.parse(indexRaw) as { items?: Array<{ id: string; summary: string; summaryQuality: string }> };
    const found = indexJson.items?.find((i) => i.id === indexItem.id);
    expect(found?.summaryQuality).toBe('heuristic');
    expect((found?.summary ?? '').trim().length).toBeGreaterThan(0);
  } finally {
    await electronApp.close().catch(() => undefined);
  }
});

