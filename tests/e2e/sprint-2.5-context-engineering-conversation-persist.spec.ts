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

test('conversation history persists to .writenow/conversations and survives restart', async () => {
  const userDataDir = await mkdtemp(path.join(os.tmpdir(), 'writenow-e2e-'));
  const first = await launchApp(userDataDir);

  try {
    const projectId = await getProjectId(first.page);
    const ensured = await invoke<{ projectId: string; rootPath: string; ensured: true }>(first.page, 'context:writenow:ensure', { projectId });
    expect(ensured.ok).toBe(true);
    if (!ensured.ok) throw new Error('context:writenow:ensure failed');

    const saved = await invoke<{ saved: true; index: { id: string; fullPath: string; skillsUsed: string[]; summaryQuality: string } }>(
      first.page,
      'context:writenow:conversations:save',
      {
        projectId,
        conversation: {
          articleId: 'ConversationPersist.md',
          messages: [
            { role: 'system', content: 'SYSTEM', createdAt: new Date().toISOString() },
            { role: 'user', content: 'USER', createdAt: new Date().toISOString() },
            { role: 'assistant', content: 'ASSISTANT', createdAt: new Date().toISOString() },
          ],
          skillsUsed: ['builtin:polish'],
          userPreferences: { accepted: ['pref:A'], rejected: ['pref:B'] },
        },
      },
    );
    expect(saved.ok).toBe(true);
    if (!saved.ok) throw new Error(`context:writenow:conversations:save failed: ${saved.error.code}`);

    expect(saved.data.index.skillsUsed).toContain('builtin:polish');
    expect(saved.data.index.summaryQuality).toBe('placeholder');

    const indexPath = path.join(ensured.data.rootPath, 'conversations', 'index.json');
    const indexRaw = await readFile(indexPath, 'utf8');
    const indexJson = JSON.parse(indexRaw) as { items?: Array<{ id: string; fullPath: string; skillsUsed: string[]; userPreferences: unknown }> };
    expect(Array.isArray(indexJson.items)).toBe(true);
    const item = indexJson.items?.find((i) => i.id === saved.data.index.id);
    expect(item).toBeTruthy();
    expect(item?.skillsUsed).toContain('builtin:polish');

    const conversationFile = path.join(ensured.data.rootPath, item?.fullPath ?? '');
    const recordRaw = await readFile(conversationFile, 'utf8');
    const record = JSON.parse(recordRaw) as { id?: string; articleId?: string; messages?: unknown[] };
    expect(record.id).toBe(saved.data.index.id);
    expect(record.articleId).toBe('ConversationPersist.md');
    expect(Array.isArray(record.messages)).toBe(true);
  } finally {
    await first.electronApp.close().catch(() => undefined);
  }

  const second = await launchApp(userDataDir);
  try {
    const projectId = await getProjectId(second.page);
    const listed = await invoke<{ items: Array<{ articleId: string }> }>(second.page, 'context:writenow:conversations:list', {
      projectId,
      articleId: 'ConversationPersist.md',
      limit: 10,
    });
    expect(listed.ok).toBe(true);
    if (listed.ok) {
      expect(listed.data.items.length).toBeGreaterThanOrEqual(1);
      expect(listed.data.items[0].articleId).toBe('ConversationPersist.md');
    }
  } finally {
    await second.electronApp.close().catch(() => undefined);
  }
});

