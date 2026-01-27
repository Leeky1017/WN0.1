import { mkdtemp, readFile } from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';

import { expect, test, type ElectronApplication } from '@playwright/test';

import { closeWriteNowApp, createNewFile, escapeRegExp, isWSL, launchWriteNowApp } from '../_utils/writenow';

/**
 * Why: Simulate abrupt shutdown to validate autosave recovery without relying on a graceful quit path.
 */
async function forceCloseApp(electronApp: ElectronApplication): Promise<void> {
  const proc = electronApp.process();
  if (proc) {
    try {
      proc.kill('SIGKILL');
    } catch {
      proc.kill();
    }
  }
  await electronApp.close().catch(() => undefined);
}

test.describe('@write-mode write mode SSOT', () => {
  test.skip(isWSL(), 'Electron E2E is unstable on WSL; run on native Linux (xvfb) or macOS/Windows.');

  test('WM-001 launch → create file → type → autosave persists on disk', async () => {
    const userDataDir = await mkdtemp(path.join(os.tmpdir(), 'writenow-e2e-'));

    const docName = `SSOT-${Date.now()}`;
    const unique = `AUTOSAVE_${Date.now()}`;
    const docPath = path.join(userDataDir, 'documents', `${docName}.md`);

    const { electronApp, page } = await launchWriteNowApp({ userDataDir });
    try {
      await expect(page.locator('button[title="新建文件"]')).toBeVisible({ timeout: 30_000 });
      await createNewFile(page, docName);

      const editor = page.getByTestId('tiptap-editor');
      await expect(editor).toBeVisible();
      await editor.click();
      await page.keyboard.type(`# ${docName}\n\n${unique}`, { delay: 10 });

      await expect(page.getByTestId('statusbar-save')).toContainText('已保存', { timeout: 30_000 });

      const content = await readFile(docPath, 'utf8');
      expect(content).toContain(unique);
    } finally {
      await closeWriteNowApp(electronApp);
    }
  });

  test('WM-005 force close → relaunch → content recovers from autosave', async () => {
    const userDataDir = await mkdtemp(path.join(os.tmpdir(), 'writenow-e2e-recover-'));

    const docName = `Recover-${Date.now()}`;
    const unique = `RECOVER_${Date.now()}`;
    const docPath = path.join(userDataDir, 'documents', `${docName}.md`);

    const app1 = await launchWriteNowApp({ userDataDir });
    try {
      const { page } = app1;

      await createNewFile(page, docName);

      const editor = page.getByTestId('tiptap-editor');
      await expect(editor).toBeVisible();
      await editor.click();
      await page.keyboard.type(`# ${docName}\n\n${unique}`, { delay: 10 });

      await expect(page.getByTestId('statusbar-save')).toContainText('已保存', { timeout: 30_000 });

      const content = await readFile(docPath, 'utf8');
      expect(content).toContain(unique);
    } finally {
      await forceCloseApp(app1.electronApp);
    }

    const app2 = await launchWriteNowApp({ userDataDir });
    try {
      const { page } = app2;

      const entry = page
        .getByTestId('layout-sidebar')
        .getByRole('treeitem', { name: new RegExp(`^${escapeRegExp(docName)}\\.md$`) });
      await expect(entry).toBeVisible({ timeout: 30_000 });
      await entry.click();

      await expect(page.getByTestId('wm-header')).toContainText(`${docName}.md`, { timeout: 30_000 });

      const editor = page.getByTestId('tiptap-editor');
      await expect(editor).toBeVisible();
      await expect(editor).toContainText(unique, { timeout: 30_000 });

      const content = await readFile(docPath, 'utf8');
      expect(content).toContain(unique);
    } finally {
      await closeWriteNowApp(app2.electronApp);
    }
  });
});
