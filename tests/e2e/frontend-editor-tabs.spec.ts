import { mkdtemp } from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';

import { expect, test, _electron as electron, type Locator, type Page } from '@playwright/test';

async function launchApp(userDataDir: string) {
  const electronApp = await electron.launch({
    args: ['.'],
    env: {
      ...process.env,
      WN_E2E: '1',
      WN_OPEN_DEVTOOLS: '0',
      WN_USER_DATA_DIR: userDataDir,
    },
  });

  const page = await electronApp.firstWindow();
  await expect(page.getByText('WriteNow')).toBeVisible();

  return { electronApp, page };
}

function escapeRegExp(text: string) {
  return text.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

async function createFile(page: Page, name: string) {
  await page.locator('button[title="新建文件"]').click();
  await page.getByPlaceholder('未命名').fill(name);
  await page.getByPlaceholder('未命名').press('Enter');
  await expect(page.getByTestId('layout-sidebar').getByRole('button', { name: new RegExp(`^${escapeRegExp(name)}\\.md`) })).toBeVisible();
}

function getTabButton(tabbar: Locator, label: string) {
  return tabbar.getByRole('button', { name: label, exact: true });
}

test('P2-002: multi-tabs keep dirty state and prompt on unsaved close', async () => {
  const userDataDir = await mkdtemp(path.join(os.tmpdir(), 'writenow-e2e-'));
  const { electronApp, page } = await launchApp(userDataDir);

  await createFile(page, 'Tab A');
  await createFile(page, 'Tab B');

  const tabbar = page.getByTestId('editor-tabbar');
  await expect(tabbar).toBeVisible();

  const tabA = getTabButton(tabbar, 'Tab A.md');
  const tabB = getTabButton(tabbar, 'Tab B.md');

  await tabA.click();
  const textarea = page.locator('textarea[placeholder="开始用 Markdown 写作…"]');
  await expect(textarea).toBeVisible();

  const unique = `UNSAVED_${Date.now()}`;
  await textarea.fill(`# Tab A\n\n${unique}`);

  await tabB.click();
  await expect(textarea).toBeVisible();
  await expect(textarea).not.toHaveValue(new RegExp(escapeRegExp(unique)));

  await tabA.click();
  await expect(textarea).toHaveValue(new RegExp(escapeRegExp(unique)));

  const dirtyDot = tabA.locator('[aria-label="Unsaved changes"]');
  await expect(dirtyDot).toBeVisible();

  await tabA.getByRole('button', { name: 'Close Tab A.md' }).click();
  const dialog = page.getByRole('dialog');
  await expect(dialog).toBeVisible();
  await expect(dialog).toContainText('关闭未保存的文档？');

  await page.getByRole('button', { name: '取消', exact: true }).click();
  await expect(tabA).toBeVisible();

  await tabA.getByRole('button', { name: 'Close Tab A.md' }).click();
  await expect(dialog).toBeVisible();
  await page.getByRole('button', { name: '直接关闭', exact: true }).click();
  await expect(tabbar.getByRole('button', { name: 'Tab A.md', exact: true })).toHaveCount(0);

  await electronApp.close();
});
