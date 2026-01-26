import { mkdtemp, readFile, stat } from 'node:fs/promises';
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

async function createFile(page: Page, name: string) {
  await page.getByTitle(/New file|新建文件/).click();
  const nameInput = page.getByPlaceholder(/Untitled|未命名/);
  await nameInput.fill(name);
  await nameInput.press('Enter');
  await expect(page.getByTestId('layout-sidebar').getByRole('button', { name: new RegExp(`^${escapeRegExp(name)}\\.md`) })).toBeVisible();
}

test('autosave debounces writes and language can switch', async () => {
  const userDataDir = await mkdtemp(path.join(os.tmpdir(), 'writenow-e2e-'));
  const { electronApp, page } = await launchApp(userDataDir);

  const docName = `Autosave-${Date.now()}`;
  await createFile(page, docName);

  const unique = `AUTOSAVE_${Date.now()}`;
  const editor = page.getByTestId('tiptap-editor');
  await expect(editor).toBeVisible();
  await editor.click();
  await editor.fill(unique);

  await expect(page.getByTestId('statusbar')).toContainText(/未保存|Unsaved/);

  const docPath = path.join(userDataDir, 'documents', `${docName}.md`);
  const before = await readFile(docPath, 'utf8');
  expect(before).not.toContain(unique);

  await expect(page.getByTestId('statusbar')).toContainText(/已保存|Saved/, { timeout: 15_000 });

  const after = await readFile(docPath, 'utf8');
  expect(after).toContain(unique);

  const savedStat = await stat(docPath);
  const savedMtime = savedStat.mtimeMs;

  await page.waitForTimeout(3_000);
  const statAfterWait = await stat(docPath);
  expect(statAfterWait.mtimeMs).toBe(savedMtime);

  await page.getByTitle(/Settings|设置/).click();
  await expect(page.getByText(/Language|语言/)).toBeVisible();
  await page.getByRole('radio', { name: 'English' }).check();

  await expect(page.getByTestId('statusbar')).toContainText('Saved');

  await electronApp.close();
});
