import { mkdtemp, readFile } from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';

import { expect, test, _electron as electron } from '@playwright/test';

function escapeRegExp(text: string) {
  return text.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

test.describe('write mode SSOT', () => {
  test.skip(Boolean(process.env.WSL_DISTRO_NAME || process.env.WSL_INTEROP), 'Electron E2E is unstable on WSL; run on native Linux (xvfb) or macOS/Windows.');

  test('create file → type → autosave persists', async () => {
  const userDataDir = await mkdtemp(path.join(os.tmpdir(), 'writenow-e2e-'));

  const electronApp = await electron.launch({
    args: ['.'],
    env: {
      ...process.env,
      WN_E2E: '1',
      WN_OPEN_DEVTOOLS: '0',
      WN_USER_DATA_DIR: userDataDir,
      WN_DISABLE_GPU: '1',
      // Why: WSLg + Wayland can crash Electron renderer in CI-like runs; prefer X11 for stability.
      ELECTRON_OZONE_PLATFORM_HINT: 'x11',
      WAYLAND_DISPLAY: '',
    },
  });

  try {
    const page = await electronApp.firstWindow();
    try {
      await expect(page.getByTestId('wm-header')).toBeVisible({ timeout: 30_000 });
    } catch (error) {
      const url = page.url();
      let logTail = '';
      try {
        const raw = await readFile(path.join(userDataDir, 'logs', 'main.log'), 'utf8');
        logTail = raw.slice(-4000);
      } catch {
        logTail = '<main.log not found>';
      }

      const snapshotPath = path.join(userDataDir, 'e2e-failure.png');
      try {
        await page.screenshot({ path: snapshotPath });
      } catch {
        // ignore
      }

      throw new Error(
        `UI not ready (wm-header). url=${url}\nmain.log tail:\n${logTail}\n(screenshot: ${snapshotPath})\n${error instanceof Error ? error.message : String(error)}`,
      );
    }

    await expect(page.locator('button[title="新建文件"]')).toBeVisible({ timeout: 30_000 });

    const docName = `SSOT-${Date.now()}`;
    await page.locator('button[title="新建文件"]').click();
    const nameInput = page.getByPlaceholder('未命名');
    await nameInput.fill(docName);
    await nameInput.press('Enter');

    await expect(
      page
        .getByTestId('layout-sidebar')
        .getByRole('button', { name: new RegExp(`^${escapeRegExp(docName)}\\.md$`) }),
    ).toBeVisible({ timeout: 30_000 });

    const editor = page.getByTestId('tiptap-editor');
    await expect(editor).toBeVisible();
    await editor.click();

    const unique = `AUTOSAVE_${Date.now()}`;
    await editor.fill(`# ${docName}\n\n${unique}`);

    await expect(page.getByTestId('statusbar')).toContainText('未保存');
    await expect(page.getByTestId('statusbar')).toContainText('已保存', { timeout: 30_000 });

    const docPath = path.join(userDataDir, 'documents', `${docName}.md`);
    const content = await readFile(docPath, 'utf8');
    expect(content).toContain(unique);
  } finally {
    await electronApp.close();
  }
  });
});

