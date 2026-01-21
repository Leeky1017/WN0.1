import { mkdtemp } from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';

import { expect, test, _electron as electron, type Page } from '@playwright/test';

type IpcErr = { ok: false; error: { code: string; message: string; details?: unknown } };
type IpcOk<T> = { ok: true; data: T };
type IpcResponse<T> = IpcOk<T> | IpcErr;

type PomodoroStatus = 'idle' | 'running' | 'paused';

function commandPaletteShortcut(): string {
  return process.platform === 'darwin' ? 'Meta+K' : 'Control+K';
}

async function launchApp(userDataDir: string, extraEnv: Record<string, string> = {}) {
  const electronApp = await electron.launch({
    args: ['.'],
    env: {
      ...process.env,
      WN_E2E: '1',
      WN_OPEN_DEVTOOLS: '0',
      WN_USER_DATA_DIR: userDataDir,
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

async function getProjectId(page: Page) {
  const current = await invoke<{ projectId: string | null }>(page, 'project:getCurrent', {});
  expect(current.ok).toBe(true);
  if (!current.ok || !current.data.projectId) throw new Error('project:getCurrent failed');
  return current.data.projectId;
}

async function getPersistedPomodoroStatus(page: Page): Promise<PomodoroStatus | null> {
  const status = await page.evaluate(() => {
    try {
      const raw = localStorage.getItem('WN_POMODORO_STATE_V1');
      if (!raw) return null;
      const parsed = JSON.parse(raw) as unknown;
      if (!parsed || typeof parsed !== 'object') return null;
      const obj = parsed as { status?: unknown };
      return typeof obj.status === 'string' ? obj.status : null;
    } catch {
      return null;
    }
  });

  if (status === 'idle' || status === 'running' || status === 'paused') return status;
  return null;
}

async function openCommandPalette(page: Page) {
  await page.keyboard.press(commandPaletteShortcut());
  await expect(page.getByPlaceholder('搜索命令或 SKILL…')).toBeVisible();
}

async function runCommand(page: Page, query: string) {
  await openCommandPalette(page);
  await page.getByPlaceholder('搜索命令或 SKILL…').fill(query);
  await page.getByPlaceholder('搜索命令或 SKILL…').press('Enter');
  await expect(page.getByPlaceholder('搜索命令或 SKILL…')).toBeHidden();
}

test.describe('Sprint 6 (Memory + Command Palette)', () => {
  test('memory CRUD persists and is accessible via Ctrl/Cmd+K', async () => {
    const userDataDir = await mkdtemp(path.join(os.tmpdir(), 'writenow-e2e-'));
    const { electronApp, page } = await launchApp(userDataDir);

    try {
      await runCommand(page, '打开记忆');
      await expect(page.getByTestId('memory-view')).toBeVisible();

      const content = '偏好更简洁的表达';
      await page.getByTestId('memory-create-content').fill(content);
      await page.getByTestId('memory-create-submit').click();
      await expect(page.getByTestId('memory-item').filter({ hasText: content })).toBeVisible();

      await runCommand(page, '开始番茄钟');
      await expect.poll(() => getPersistedPomodoroStatus(page)).toBe('running');

      await runCommand(page, '暂停番茄钟');
      await expect.poll(() => getPersistedPomodoroStatus(page)).toBe('paused');

      await runCommand(page, '结束番茄钟');
      await expect.poll(() => getPersistedPomodoroStatus(page)).toBe('idle');

      await electronApp.close();

      const relaunched = await launchApp(userDataDir);
      const page2 = relaunched.page;

      await runCommand(page2, '打开记忆');
      await expect(page2.getByTestId('memory-view')).toBeVisible();
      await expect(page2.getByTestId('memory-item').filter({ hasText: content })).toBeVisible();

      const updated = `${content}（更新）`;
      const card = page2.getByTestId('memory-item').filter({ hasText: content }).first();
      await card.getByRole('button', { name: '编辑' }).click();
      await card.locator('textarea').fill(updated);
      await card.getByRole('button', { name: '保存' }).click();
      await expect(page2.getByTestId('memory-item').filter({ hasText: updated })).toBeVisible();

      const updatedCard = page2.getByTestId('memory-item').filter({ hasText: updated }).first();
      await updatedCard.getByTestId('memory-delete').click();
      await expect(page2.getByTestId('memory-item').filter({ hasText: updated })).toBeHidden();

      await relaunched.electronApp.close();
    } finally {
      await electronApp.close().catch(() => undefined);
    }
  });

  test('preference learning creates learned memory; privacy mode excludes learned from injection preview', async () => {
    const userDataDir = await mkdtemp(path.join(os.tmpdir(), 'writenow-e2e-'));
    const { electronApp, page } = await launchApp(userDataDir, { WN_JUDGE_MODEL_PATH: '/__WN_E2E__/missing-model.gguf' });

    try {
      const projectId = await getProjectId(page);
      const ensured = await invoke<{ ensured: true }>(page, 'context:writenow:ensure', { projectId });
      expect(ensured.ok).toBe(true);

      const settings = await invoke<{ settings: { preferenceLearningThreshold: number } }>(page, 'memory:settings:update', {
        injectionEnabled: true,
        preferenceLearningEnabled: true,
        privacyModeEnabled: false,
        preferenceLearningThreshold: 2,
      });
      expect(settings.ok).toBe(true);

      await invoke<{ deletedCount: number }>(page, 'memory:preferences:clear', { scope: 'learned' });

      await page.waitForFunction(() => (window as unknown as { __WN_E2E__?: { ready?: boolean } }).__WN_E2E__?.ready === true, {});

      const createdAt = new Date().toISOString();
      const messages = [
        { role: 'system', content: 'SYSTEM', createdAt },
        { role: 'user', content: '原文：我我我非常非常喜欢喜欢这个故事，但表达有点重复。', createdAt },
        { role: 'assistant', content: '建议：我非常喜欢这个故事，但表达更自然。', createdAt },
      ];

      async function saveConversation() {
        const saved = await invoke<{ saved: true; index: { id: string } }>(page, 'context:writenow:conversations:save', {
          projectId,
          conversation: {
            articleId: 'PrefLearn.md',
            messages,
            skillsUsed: ['builtin:polish'],
          },
        });
        expect(saved.ok).toBe(true);
        if (!saved.ok) throw new Error('conversation save failed');
        return saved.data.index.id;
      }

      async function generateSummary(conversationId: string) {
        await page.evaluate(async (arg) => {
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

          await w.__WN_E2E__.generateConversationSummary({
            projectId: input.projectId,
            conversationId: input.conversationId,
            articleId: input.articleId,
            skillId: 'builtin:polish',
            skillName: 'Polish',
            outcome: 'accepted',
            originalText: '我我我非常非常喜欢喜欢这个故事，但表达有点重复。',
            suggestedText: '我非常喜欢这个故事，但表达更自然。',
            messages: input.messages,
          });
        }, { projectId, conversationId, articleId: 'PrefLearn.md', messages });
      }

      const conv1 = await saveConversation();
      await generateSummary(conv1);
      const conv2 = await saveConversation();
      await generateSummary(conv2);

      await runCommand(page, '打开记忆');
      await expect(page.getByTestId('memory-view')).toBeVisible();

      await page.getByTestId('memory-refresh').click();
      await expect(page.getByTestId('memory-item').filter({ hasText: '偏好减少重复表达' })).toBeVisible();

      await page.getByTestId('memory-injection-refresh').click();
      await expect(page.getByTestId('memory-injection-preview')).toContainText('偏好减少重复表达');

      // With privacy mode enabled, injected preview should exclude learned items.
      await invoke<{ settings: { privacyModeEnabled: boolean } }>(page, 'memory:settings:update', { privacyModeEnabled: true });
      await page.getByTestId('memory-injection-refresh').click();
      await expect(page.getByTestId('memory-injection-preview')).not.toContainText('偏好减少重复表达');

      // Manual memories are still injectable under privacy mode.
      const manualContent = '手动：保持简洁';
      await page.getByTestId('memory-create-content').fill(manualContent);
      await page.getByTestId('memory-create-submit').click();
      await expect(page.getByTestId('memory-item').filter({ hasText: manualContent }).first()).toBeVisible();
      await page.getByTestId('memory-injection-refresh').click();
      await expect(page.getByTestId('memory-injection-preview')).toContainText(manualContent);

      // Deleting learned memory is an undo path.
      const learnedCard = page.getByTestId('memory-item').filter({ hasText: '偏好减少重复表达' }).first();
      await learnedCard.getByTestId('memory-delete').click();
      await expect(page.getByTestId('memory-item').filter({ hasText: '偏好减少重复表达' })).toBeHidden();
    } finally {
      await electronApp.close().catch(() => undefined);
    }
  });
});
