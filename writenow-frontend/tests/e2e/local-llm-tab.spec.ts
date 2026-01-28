import { mkdtemp } from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';

import { expect, test } from '@playwright/test';

import { createNewFile, isWSL, launchWriteNowApp } from './_utils/writenow';

test.describe('local LLM tab completion', () => {
  test.skip(isWSL(), 'Electron E2E is unstable on WSL; run on native Linux (xvfb) or macOS/Windows.');

  test('settings UI renders and is opt-in', async () => {
    const userDataDir = await mkdtemp(path.join(os.tmpdir(), 'writenow-e2e-'));

    const { electronApp, page } = await launchWriteNowApp({ userDataDir });
    try {
      await page.getByTestId('activity-tab-settings').click();
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

    const { electronApp, page } = await launchWriteNowApp({ userDataDir });
    try {
      await expect(page.locator('button[title="新建文件"]')).toBeVisible({ timeout: 30_000 });

      const docName = `LLM-${Date.now()}`;
      await createNewFile(page, docName);

      const editor = page.getByTestId('tiptap-editor');
      await expect(editor).toBeVisible();

      // Enable local LLM (custom model path via env)
      await page.getByTestId('activity-tab-settings').click();
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
