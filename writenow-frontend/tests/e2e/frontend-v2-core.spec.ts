import { mkdtemp, readFile } from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';

import { expect, test } from '@playwright/test';

import { createFile, getModKey, launchApp, typeInEditor } from '../utils/e2e-helpers';

test('Frontend V2: create file → edit → autosave persists to disk', async () => {
  const userDataDir = await mkdtemp(path.join(os.tmpdir(), 'writenow-fev2-e2e-'));
  const { electronApp, page } = await launchApp(userDataDir);

  const fileName = `E2E-${Date.now()}.md`;
  await createFile(page, fileName);

  const unique = `E2E_UNIQUE_${Date.now()}`;
  await typeInEditor(page, `\n${unique}\n`);

  await expect(page.getByTestId('statusbar')).toContainText(/未保存/, { timeout: 10_000 });
  await expect(page.getByTestId('statusbar')).toContainText(/已保存/, { timeout: 20_000 });

  await electronApp.close();

  const docPath = path.join(userDataDir, 'documents', fileName);
  const content = await readFile(docPath, 'utf8');
  expect(content).toContain(unique);
});

test('Frontend V2: theme switch persists across restart (settings hotkey)', async () => {
  const userDataDir = await mkdtemp(path.join(os.tmpdir(), 'writenow-fev2-e2e-'));
  const { electronApp, page } = await launchApp(userDataDir);

  // Ensure renderer is focused before emitting hotkeys.
  await page.getByTestId('layout-sidebar').click();

  await page.keyboard.press(`${getModKey()}+,`);
  const dialog = page.getByRole('dialog');
  await expect(dialog).toBeVisible({ timeout: 10_000 });

  // Navigate to Appearance so the theme selector is visible.
  await dialog.getByRole('button', { name: '外观' }).click();

  // Select theme -> Light
  await dialog.getByRole('combobox').first().click();
  await page.getByRole('option', { name: 'Light' }).click();

  await expect.poll(async () => await page.evaluate(() => document.documentElement.getAttribute('data-theme'))).toBe('light');

  await page.keyboard.press('Escape');
  await electronApp.close();

  const { electronApp: electronApp2, page: page2 } = await launchApp(userDataDir);
  await expect.poll(async () => await page2.evaluate(() => document.documentElement.getAttribute('data-theme'))).toBe('light');
  await electronApp2.close();
});

test('Frontend V2: AI call surfaces stable error when API key is missing', async () => {
  const userDataDir = await mkdtemp(path.join(os.tmpdir(), 'writenow-fev2-e2e-'));
  const { electronApp, page } = await launchApp(userDataDir, {
    // Ensure env-based key is not set so the backend returns a deterministic error.
    WN_AI_API_KEY: '',
  });

  const fileName = `AI-${Date.now()}.md`;
  await createFile(page, fileName);
  await typeInEditor(page, 'This is a test document for AI.');

  // Ensure AI panel is connected before sending (otherwise the send action may fail with "not connected").
  await expect(page.getByTestId('ai-connection-status')).toHaveAttribute('title', '已连接', { timeout: 30_000 });

  // Select all text so the backend receives a non-empty selection payload.
  await page.keyboard.press(`${getModKey()}+A`);

  const aiInput = page.getByPlaceholder('Ask anything...');
  await expect(aiInput).toBeVisible();
  await aiInput.fill('polish');
  await aiInput.press(`${getModKey()}+Enter`);

  await expect(page.getByTestId('layout-ai-panel')).toContainText(/AI API key is not configured/, { timeout: 20_000 });

  await electronApp.close();
});
