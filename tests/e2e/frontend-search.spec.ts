import { mkdtemp } from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';

import { expect, test, _electron as electron, type Page } from '@playwright/test';

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

function escapeRegExp(text: string) {
  return text.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

async function openProjectManager(page: Page) {
  await page.getByTitle(/Projects|项目管理/).first().click();
  await expect(page.getByText(/Projects|项目管理/)).toBeVisible();
}

async function createProject(page: Page, name: string) {
  await openProjectManager(page);
  const nameInput = page.getByPlaceholder(/Project name|项目名称/);
  await nameInput.fill(name);
  await nameInput.press('Enter');
  await expect(page.getByTitle(/Projects|项目管理/).first()).toContainText(name);
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

async function readEditorSelection(page: Page) {
  const textarea = page.locator('textarea[data-testid="editor-scroll"]');
  if ((await textarea.count()) === 0) return null;
  return textarea.evaluate((el) => ({
    value: el.value,
    start: el.selectionStart ?? 0,
    end: el.selectionEnd ?? 0,
  })) as Promise<null | { value: string; start: number; end: number }>;
}

test('sidebar search: fulltext highlight + match navigation', async () => {
  const userDataDir = await mkdtemp(path.join(os.tmpdir(), 'writenow-e2e-'));
  const { electronApp, page } = await launchApp(userDataDir);

  try {
    await createProject(page, 'Alpha');
    await createFile(page, 'Search Doc');

    const needle = '独角鲸';
    const content = `# Search Doc\n\n这里有一个词：${needle}。\n下一行还有${needle}。\n最后再来一个${needle}。\n`;
    await page.locator('textarea[data-testid="editor-scroll"]').fill(content);
    await page.keyboard.press('Control+S');
    await expect(page.getByTestId('statusbar')).toContainText(/已保存|Saved/);

    await page.getByTitle(/^(Search|搜索)$/).click();
    await expect(page.getByTestId('search-input')).toBeVisible();

    await page.getByTestId('search-mode-fulltext').click();
    await page.getByTestId('search-input').fill(needle);

    const resultRow = page.getByTestId('layout-sidebar').getByTitle(/Search Doc/);
    await expect(resultRow).toBeVisible({ timeout: 15_000 });
    await expect(page.locator('mark')).toContainText(needle);

    await resultRow.click();

    const first = content.indexOf(needle);
    const second = content.indexOf(needle, first + needle.length);
    expect(first).toBeGreaterThanOrEqual(0);
    expect(second).toBeGreaterThan(first);

    await expect.poll(async () => (await readEditorSelection(page))?.start).toBe(first);
    await expect.poll(async () => (await readEditorSelection(page))?.end).toBe(first + needle.length);

    await page.getByTestId('search-next-match').click();
    await expect.poll(async () => (await readEditorSelection(page))?.start).toBe(second);

    await page.getByTestId('search-prev-match').click();
    await expect.poll(async () => (await readEditorSelection(page))?.start).toBe(first);
  } finally {
    await electronApp.close();
  }
});
