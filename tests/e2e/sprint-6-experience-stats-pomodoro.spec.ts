import { mkdtemp } from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';

import { expect, test, _electron as electron, type Page } from '@playwright/test';

type IpcErr = { ok: false; error: { code: string; message: string; details?: unknown } };
type IpcOk<T> = { ok: true; data: T };
type IpcResponse<T> = IpcOk<T> | IpcErr;

type WritingStatsRow = {
  date: string;
  wordCount: number;
  writingMinutes: number;
  articlesCreated: number;
  skillsUsed: number;
};

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

function escapeRegExp(text: string) {
  return text.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

async function waitForBootstrap(page: Page) {
  await expect(page.getByTestId('layout-sidebar').getByRole('button', { name: /^欢迎使用\.md/ })).toBeVisible({ timeout: 20_000 });
}

async function createFile(page: Page, name: string) {
  await page.getByTitle(/New file|新建文件/).click();
  const nameInput = page.getByPlaceholder(/Untitled|未命名/);
  await nameInput.fill(name);
  await nameInput.press('Enter');
  await expect(
    page.getByTestId('layout-sidebar').getByRole('button', { name: new RegExp(`^${escapeRegExp(name)}\\.md`) }),
  ).toBeVisible({ timeout: 15_000 });
}

async function saveNow(page: Page) {
  await page.keyboard.press('Control+S');
  await expect(page.getByText(/Saved|已保存/, { exact: true })).toBeVisible({ timeout: 15_000 });
}

async function waitForWritingMinutes(page: Page, expectedMin: number) {
  const startedAt = Date.now();
  while (Date.now() - startedAt < 15_000) {
    const today = await invoke<{ stats: WritingStatsRow }>(page, 'stats:getToday', {});
    if (today.ok && today.data.stats.writingMinutes >= expectedMin) return today.data.stats.writingMinutes;
    await new Promise((r) => setTimeout(r, 200));
  }
  throw new Error(`Timed out waiting for writingMinutes >= ${expectedMin}`);
}

test('stats: create + save updates writing_stats and UI', async () => {
  const userDataDir = await mkdtemp(path.join(os.tmpdir(), 'writenow-e2e-'));
  const { electronApp, page } = await launchApp(userDataDir);

  try {
    await waitForBootstrap(page);

    const baselineResp = await invoke<{ stats: WritingStatsRow }>(page, 'stats:getToday', {});
    expect(baselineResp.ok).toBe(true);
    if (!baselineResp.ok) throw new Error('stats:getToday failed');
    const baseline = baselineResp.data.stats;

    await createFile(page, 'Stats Doc');
    await page.getByTestId('layout-sidebar').getByRole('button', { name: /^Stats Doc\.md/ }).click();

    const afterCreateResp = await invoke<{ stats: WritingStatsRow }>(page, 'stats:getToday', {});
    expect(afterCreateResp.ok).toBe(true);
    if (!afterCreateResp.ok) throw new Error('stats:getToday failed');
    const afterCreate = afterCreateResp.data.stats;

    expect(afterCreate.articlesCreated).toBe(baseline.articlesCreated + 1);

    const unique = `HELLO_STATS_${Date.now()}`;
    const editor = page.getByTestId('tiptap-editor');
    await expect(editor).toBeVisible();
    await editor.click();
    await editor.fill(unique);
    await saveNow(page);

    const afterSaveResp = await invoke<{ stats: WritingStatsRow }>(page, 'stats:getToday', {});
    expect(afterSaveResp.ok).toBe(true);
    if (!afterSaveResp.ok) throw new Error('stats:getToday failed');
    const afterSave = afterSaveResp.data.stats;

    expect(afterSave.wordCount).toBeGreaterThanOrEqual(afterCreate.wordCount + unique.length);

    await page.getByTestId('activity-stats').click();
    await expect(page.getByText('创作统计', { exact: true })).toBeVisible();
    const uiWordCountText = await page.getByTestId('stats-today-wordcount').innerText();
    const uiWordCount = Number(uiWordCountText.replace(/[^\d]/g, ''));
    expect(uiWordCount).toBe(afterSave.wordCount);
  } finally {
    await electronApp.close();
  }
});

test('pomodoro: focus credits writing_minutes and recovers after restart', async () => {
  const userDataDir = await mkdtemp(path.join(os.tmpdir(), 'writenow-e2e-'));
  let baselineWritingMinutes = 0;
  const scaleEnv = { WN_POMODORO_TIME_SCALE: '0.05' };

  const first = await launchApp(userDataDir, scaleEnv);
  try {
    await waitForBootstrap(first.page);

    const baselineResp = await invoke<{ stats: WritingStatsRow }>(first.page, 'stats:getToday', {});
    expect(baselineResp.ok).toBe(true);
    if (!baselineResp.ok) throw new Error('stats:getToday failed');
    baselineWritingMinutes = baselineResp.data.stats.writingMinutes;

    await first.page.getByRole('button', { name: /Expand status details|展开状态详情/ }).click();
    await expect(first.page.getByText(/Today|今日/)).toBeVisible();
    await first.page.getByRole('button', { name: /Timer settings|计时器设置/ }).click();
    await expect(first.page.getByText(/Timer settings|设置计时器/)).toBeVisible();
    await first.page.getByLabel(/Focus minutes|专注时长（分钟）/).fill('2');
    await first.page.getByLabel(/Break minutes|休息时长（分钟）/).fill('1');
    await first.page.getByRole('button', { name: /Apply|应用/, exact: true }).click();
    await expect(first.page.getByText(/Timer settings|设置计时器/)).toBeHidden();

    await first.page.getByRole('button', { name: /(Focus|专注).*\d{2}:\d{2}/ }).click();
    await new Promise((r) => setTimeout(r, 200));
    await first.electronApp.close();
  } catch (error) {
    await first.electronApp.close().catch(() => undefined);
    throw error;
  }

  const second = await launchApp(userDataDir, scaleEnv);
  try {
    await expect(second.page.getByText(/Time for a break!|该休息了！/)).toBeVisible({ timeout: 20_000 });
    await second.page.getByRole('button', { name: /Start break|开始休息/, exact: true }).click();

    const minutes = await waitForWritingMinutes(second.page, baselineWritingMinutes + 2);
    expect(minutes).toBeGreaterThanOrEqual(baselineWritingMinutes + 2);
  } finally {
    await second.electronApp.close();
  }
});
