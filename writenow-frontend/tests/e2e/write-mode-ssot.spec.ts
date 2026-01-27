import { mkdtemp, readFile } from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';

import { expect, test } from '@playwright/test';

import { createNewFile, escapeRegExp, isWSL, launchWriteNowApp } from './_utils/writenow';

test.describe('write mode SSOT', () => {
  test.skip(isWSL(), 'Electron E2E is unstable on WSL; run on native Linux (xvfb) or macOS/Windows.');

  test('launch → create file → type → autosave persists across restart', async () => {
    const userDataDir = await mkdtemp(path.join(os.tmpdir(), 'writenow-e2e-'));

    const docName = `SSOT-${Date.now()}`;
    const unique = `AUTOSAVE_${Date.now()}`;
    const docPath = path.join(userDataDir, 'documents', `${docName}.md`);

    const app1 = await launchWriteNowApp({ userDataDir });
    try {
      const { page } = app1;

      await expect(page.locator('button[title="新建文件"]')).toBeVisible({ timeout: 30_000 });
      await createNewFile(page, docName);

      const editor = page.getByTestId('tiptap-editor');
      await expect(editor).toBeVisible();
      await editor.click();
      await editor.fill(`# ${docName}\n\n${unique}`);

      await expect(page.getByTestId('statusbar-save')).toContainText('已保存', { timeout: 30_000 });

      const content = await readFile(docPath, 'utf8');
      expect(content).toContain(unique);
    } finally {
      await app1.electronApp.close();
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
      await app2.electronApp.close();
    }
  });
});

