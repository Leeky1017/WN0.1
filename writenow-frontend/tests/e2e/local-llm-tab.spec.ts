import { mkdtemp, readFile } from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';

import { expect, test, _electron as electron } from '@playwright/test';

test.describe('local LLM tab completion', () => {
  test.skip(Boolean(process.env.WSL_DISTRO_NAME || process.env.WSL_INTEROP), 'Electron E2E is unstable on WSL; run on native Linux (xvfb) or macOS/Windows.');

  test('settings UI renders and is opt-in', async () => {
    const userDataDir = await mkdtemp(path.join(os.tmpdir(), 'writenow-e2e-'));

    const electronApp = await electron.launch({
      args: ['.'],
      env: {
        ...process.env,
        WN_E2E: '1',
        WN_OPEN_DEVTOOLS: '0',
        WN_USER_DATA_DIR: userDataDir,
        WN_DISABLE_GPU: '1',
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
        throw new Error(`UI not ready. url=${url}\nmain.log tail:\n${logTail}\n${error instanceof Error ? error.message : String(error)}`);
      }

      await page.getByRole('button', { name: 'Settings' }).click();
      await expect(page.getByText('本地 LLM Tab 续写')).toBeVisible();

      const toggle = page.getByRole('switch').first();
      await expect(toggle).toHaveAttribute('aria-checked', 'false');
      await expect(page.getByText('默认关闭')).toBeVisible();
    } finally {
      await electronApp.close();
    }
  });

  test('ghost appears and can be accepted with Tab (requires real model)', async () => {
    test.skip(!process.env.WN_LOCAL_LLM_MODEL_PATH, 'Set WN_LOCAL_LLM_MODEL_PATH to a real GGUF model file to run this test.');

    const userDataDir = await mkdtemp(path.join(os.tmpdir(), 'writenow-e2e-'));

    const electronApp = await electron.launch({
      args: ['.'],
      env: {
        ...process.env,
        WN_E2E: '1',
        WN_OPEN_DEVTOOLS: '0',
        WN_USER_DATA_DIR: userDataDir,
        WN_DISABLE_GPU: '1',
        ELECTRON_OZONE_PLATFORM_HINT: 'x11',
        WAYLAND_DISPLAY: '',
      },
    });

    try {
      const page = await electronApp.firstWindow();
      await expect(page.getByTestId('wm-header')).toBeVisible({ timeout: 30_000 });
      await expect(page.locator('button[title="新建文件"]')).toBeVisible({ timeout: 30_000 });

      const docName = `LLM-${Date.now()}`;
      await page.locator('button[title="新建文件"]').click();
      const nameInput = page.getByPlaceholder('未命名');
      await nameInput.fill(docName);
      await nameInput.press('Enter');

      const editor = page.getByTestId('tiptap-editor');
      await expect(editor).toBeVisible();

      // Enable local LLM (custom model path via env)
      await page.getByRole('button', { name: 'Settings' }).click();
      await expect(page.getByText('本地 LLM Tab 续写')).toBeVisible();

      await page.locator('select').selectOption('custom');
      await page.getByRole('switch').first().click();

      await editor.click();
      await editor.fill('Once upon a time, ');

      // Wait for ghost suggestion.
      const ghost = page.locator('.wn-llm-ghost');
      await expect(ghost).toBeVisible({ timeout: 60_000 });

      const ghostText = (await ghost.textContent()) ?? '';
      expect(ghostText.trim().length).toBeGreaterThan(0);

      await editor.press('Tab');
      await expect(ghost).toHaveCount(0);

      const finalText = await editor.textContent();
      expect(finalText ?? '').toContain(ghostText.trim().slice(0, 4));
    } finally {
      await electronApp.close();
    }
  });
});

