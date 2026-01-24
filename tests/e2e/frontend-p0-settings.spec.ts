/**
 * E2E tests for P0-001 Settings Panel and P0-002 AI Key/Model Config.
 *
 * Why: Validates the settings panel opens via Cmd+, and menu entry,
 * displays navigation categories, and persists AI configuration.
 */
import { mkdtemp } from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';

import { expect, test, _electron as electron, type ElectronApplication, type Page } from '@playwright/test';

async function launchApp(userDataDir: string): Promise<{ electronApp: ElectronApplication; page: Page }> {
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
  await expect(page.getByText('WriteNow')).toBeVisible({ timeout: 15_000 });
  return { electronApp, page };
}

test.describe('P0-001: Settings Panel Core', () => {
  let electronApp: ElectronApplication;
  let page: Page;
  let userDataDir: string;

  test.beforeEach(async () => {
    userDataDir = await mkdtemp(path.join(os.tmpdir(), 'writenow-e2e-settings-'));
    const app = await launchApp(userDataDir);
    electronApp = app.electronApp;
    page = app.page;
  });

  test.afterEach(async () => {
    await electronApp.close();
  });

  test('should open settings panel via Cmd+, keyboard shortcut', async () => {
    // Press Cmd+, (or Ctrl+, on non-Mac)
    await page.keyboard.press('Control+,');

    // Settings panel should be visible
    const settingsPanel = page.getByTestId('writenow-settings');
    await expect(settingsPanel).toBeVisible({ timeout: 5_000 });

    // Title should show "设置"
    await expect(settingsPanel.getByText('设置')).toBeVisible();
  });

  test('should display navigation categories (AI/编辑器/外观/快捷键/语言)', async () => {
    await page.keyboard.press('Control+,');
    const settingsPanel = page.getByTestId('writenow-settings');
    await expect(settingsPanel).toBeVisible();

    // Check all navigation categories are present
    await expect(settingsPanel.getByText('AI')).toBeVisible();
    await expect(settingsPanel.getByText('编辑器')).toBeVisible();
    await expect(settingsPanel.getByText('外观')).toBeVisible();
    await expect(settingsPanel.getByText('快捷键')).toBeVisible();
    await expect(settingsPanel.getByText('语言')).toBeVisible();
  });

  test('should switch between settings categories', async () => {
    await page.keyboard.press('Control+,');
    const settingsPanel = page.getByTestId('writenow-settings');
    await expect(settingsPanel).toBeVisible();

    // Default should be AI category
    await expect(settingsPanel.getByText('AI 配置')).toBeVisible();

    // Click on 快捷键 category
    await settingsPanel.getByText('快捷键').click();
    await expect(settingsPanel.getByText('⌘K')).toBeVisible();

    // Click on 编辑器 category
    await settingsPanel.getByText('编辑器').click();
    await expect(settingsPanel.getByText('编辑器配置')).toBeVisible();
  });

  test('should close settings panel via close button', async () => {
    await page.keyboard.press('Control+,');
    const settingsPanel = page.getByTestId('writenow-settings');
    await expect(settingsPanel).toBeVisible();

    // Click close button
    await settingsPanel.getByTitle('关闭').click();

    // Settings panel should be hidden
    await expect(settingsPanel).toBeHidden();
  });
});

test.describe('P0-002: AI Key & Model Config', () => {
  let electronApp: ElectronApplication;
  let page: Page;
  let userDataDir: string;

  test.beforeEach(async () => {
    userDataDir = await mkdtemp(path.join(os.tmpdir(), 'writenow-e2e-ai-config-'));
    const app = await launchApp(userDataDir);
    electronApp = app.electronApp;
    page = app.page;
  });

  test.afterEach(async () => {
    await electronApp.close();
  });

  test('should display AI configuration fields', async () => {
    await page.keyboard.press('Control+,');
    const settingsPanel = page.getByTestId('writenow-settings');
    await expect(settingsPanel).toBeVisible();

    // AI category should be active by default
    await expect(settingsPanel.getByText('AI 配置')).toBeVisible();

    // Provider dropdown should be visible
    await expect(settingsPanel.locator('#settings-provider')).toBeVisible();

    // API Key input should be visible
    await expect(settingsPanel.locator('#settings-api-key')).toBeVisible();

    // Model dropdown should be visible
    await expect(settingsPanel.locator('#settings-model')).toBeVisible();
  });

  test('should toggle API key visibility', async () => {
    await page.keyboard.press('Control+,');
    const settingsPanel = page.getByTestId('writenow-settings');
    await expect(settingsPanel).toBeVisible();

    const apiKeyInput = settingsPanel.locator('#settings-api-key');

    // Default should be password type (hidden)
    await expect(apiKeyInput).toHaveAttribute('type', 'password');

    // Click show/hide toggle
    await settingsPanel.getByTitle('显示').click();

    // Should now be text type (visible)
    await expect(apiKeyInput).toHaveAttribute('type', 'text');

    // Click again to hide
    await settingsPanel.getByTitle('隐藏').click();
    await expect(apiKeyInput).toHaveAttribute('type', 'password');
  });

  test('should update model options when provider changes', async () => {
    await page.keyboard.press('Control+,');
    const settingsPanel = page.getByTestId('writenow-settings');
    await expect(settingsPanel).toBeVisible();

    const providerSelect = settingsPanel.locator('#settings-provider');
    const modelSelect = settingsPanel.locator('#settings-model');

    // Default provider is OpenAI
    await expect(providerSelect).toHaveValue('openai');

    // OpenAI models should include GPT-4o
    await expect(modelSelect.locator('option[value="gpt-4o"]')).toBeVisible();

    // Change to Claude
    await providerSelect.selectOption('claude');

    // Claude models should include Claude Sonnet 4
    await expect(modelSelect.locator('option[value="claude-sonnet-4-20250514"]')).toBeVisible();
  });

  test('should save AI configuration and show success message', async () => {
    await page.keyboard.press('Control+,');
    const settingsPanel = page.getByTestId('writenow-settings');
    await expect(settingsPanel).toBeVisible();

    // Change provider to Claude
    await settingsPanel.locator('#settings-provider').selectOption('claude');

    // Enter API key
    await settingsPanel.locator('#settings-api-key').fill('sk-test-key-12345');

    // Click save button
    await settingsPanel.getByRole('button', { name: '保存' }).click();

    // Success message should appear
    await expect(page.getByText('设置已保存')).toBeVisible({ timeout: 5_000 });
  });
});
