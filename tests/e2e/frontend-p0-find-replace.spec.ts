/**
 * E2E tests for P0-004 Find/Replace.
 *
 * Why: Validates the find/replace widget opens via Cmd+F/Cmd+H,
 * highlights matches, navigates between results, and performs replacements.
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

async function createNewFile(page: Page, name: string): Promise<void> {
  await page.getByTitle(/New file|新建文件/).click();
  const nameInput = page.getByPlaceholder(/Untitled|未命名/);
  await nameInput.fill(name);
  await nameInput.press('Enter');
  await expect(
    page.getByTestId('layout-sidebar').getByRole('button', { name: new RegExp(`^${name}\\.md`) }),
  ).toBeVisible({ timeout: 10_000 });
}

async function typeInEditor(page: Page, text: string): Promise<void> {
  const editor = page.locator('.ProseMirror');
  await editor.click();
  await page.keyboard.type(text, { delay: 10 });
}

test.describe('P0-004: Find/Replace', () => {
  let electronApp: ElectronApplication;
  let page: Page;
  let userDataDir: string;

  test.beforeEach(async () => {
    userDataDir = await mkdtemp(path.join(os.tmpdir(), 'writenow-e2e-findreplace-'));
    const app = await launchApp(userDataDir);
    electronApp = app.electronApp;
    page = app.page;
    // Create a new file with content
    await createNewFile(page, 'FindReplaceTest');
  });

  test.afterEach(async () => {
    await electronApp.close();
  });

  test('should open find panel via Cmd+F', async () => {
    // Type some content
    await typeInEditor(page, 'Hello World');

    // Press Cmd+F
    await page.keyboard.press('Control+F');

    // Find panel should be visible
    const findPanel = page.getByTestId('writenow-find-replace');
    await expect(findPanel).toBeVisible({ timeout: 5_000 });

    // Find input should be visible and focused
    const findInput = page.getByTestId('writenow-find-input');
    await expect(findInput).toBeVisible();
    await expect(findInput).toBeFocused();
  });

  test('should open find+replace panel via Cmd+H', async () => {
    // Type some content
    await typeInEditor(page, 'Hello World');

    // Press Cmd+H
    await page.keyboard.press('Control+H');

    // Find panel should be visible with replace row
    const findPanel = page.getByTestId('writenow-find-replace');
    await expect(findPanel).toBeVisible();

    // Replace input should be visible
    const replaceInput = page.getByTestId('writenow-replace-input');
    await expect(replaceInput).toBeVisible();
  });

  test('should find and count matches', async () => {
    // Type content with repeated word
    await typeInEditor(page, 'apple orange apple banana apple');

    // Open find
    await page.keyboard.press('Control+F');
    const findPanel = page.getByTestId('writenow-find-replace');
    await expect(findPanel).toBeVisible();

    // Type search term
    const findInput = page.getByTestId('writenow-find-input');
    await findInput.fill('apple');

    // Should show count
    await expect(findPanel.locator('.wn-find-replace-count')).toContainText('1/3');
  });

  test('should navigate between matches', async () => {
    // Type content with repeated word
    await typeInEditor(page, 'cat dog cat bird cat');

    // Open find
    await page.keyboard.press('Control+F');
    const findPanel = page.getByTestId('writenow-find-replace');
    await expect(findPanel).toBeVisible();

    // Search for "cat"
    const findInput = page.getByTestId('writenow-find-input');
    await findInput.fill('cat');

    // Should show 1/3
    await expect(findPanel.locator('.wn-find-replace-count')).toContainText('1/3');

    // Click next
    await findPanel.getByTitle(/下一个|next/i).click();
    await expect(findPanel.locator('.wn-find-replace-count')).toContainText('2/3');

    // Click next again
    await findPanel.getByTitle(/下一个|next/i).click();
    await expect(findPanel.locator('.wn-find-replace-count')).toContainText('3/3');

    // Click next to wrap around
    await findPanel.getByTitle(/下一个|next/i).click();
    await expect(findPanel.locator('.wn-find-replace-count')).toContainText('1/3');

    // Click previous
    await findPanel.getByTitle(/上一个|previous/i).click();
    await expect(findPanel.locator('.wn-find-replace-count')).toContainText('3/3');
  });

  test('should close find panel via Escape', async () => {
    await typeInEditor(page, 'Some text');

    await page.keyboard.press('Control+F');
    const findPanel = page.getByTestId('writenow-find-replace');
    await expect(findPanel).toBeVisible();

    // Press Escape
    await page.keyboard.press('Escape');

    // Panel should be hidden
    await expect(findPanel).toBeHidden();
  });

  test('should close find panel via close button', async () => {
    await typeInEditor(page, 'Some text');

    await page.keyboard.press('Control+F');
    const findPanel = page.getByTestId('writenow-find-replace');
    await expect(findPanel).toBeVisible();

    // Click close button
    await findPanel.getByTitle(/关闭|Close/i).click();

    await expect(findPanel).toBeHidden();
  });

  test('should show "无结果" when no matches found', async () => {
    await typeInEditor(page, 'Hello World');

    await page.keyboard.press('Control+F');
    const findPanel = page.getByTestId('writenow-find-replace');
    await expect(findPanel).toBeVisible();

    const findInput = page.getByTestId('writenow-find-input');
    await findInput.fill('xyz123');

    await expect(findPanel.locator('.wn-find-replace-count')).toContainText('无结果');
  });

  test('should toggle case-sensitive search', async () => {
    await typeInEditor(page, 'Apple apple APPLE');

    await page.keyboard.press('Control+F');
    const findPanel = page.getByTestId('writenow-find-replace');
    await expect(findPanel).toBeVisible();

    const findInput = page.getByTestId('writenow-find-input');
    await findInput.fill('Apple');

    // Case-insensitive by default, should find 3
    await expect(findPanel.locator('.wn-find-replace-count')).toContainText('1/3');

    // Toggle case-sensitive
    await findPanel.getByTitle(/区分大小写|Case sensitive/i).click();

    // Should now find only 1
    await expect(findPanel.locator('.wn-find-replace-count')).toContainText('1/1');
  });

  test('should replace current match', async () => {
    await typeInEditor(page, 'old new old');

    await page.keyboard.press('Control+H');
    const findPanel = page.getByTestId('writenow-find-replace');
    await expect(findPanel).toBeVisible();

    const findInput = page.getByTestId('writenow-find-input');
    await findInput.fill('old');

    const replaceInput = page.getByTestId('writenow-replace-input');
    await replaceInput.fill('NEW');

    // Should show 2 matches
    await expect(findPanel.locator('.wn-find-replace-count')).toContainText('1/2');

    // Click replace current
    await findPanel.getByTitle(/替换当前|Replace/i).click();

    // Should now show 1 match
    await expect(findPanel.locator('.wn-find-replace-count')).toContainText('1/1');

    // Editor should have replaced content
    const editor = page.locator('.ProseMirror');
    await expect(editor).toContainText('NEW');
  });

  test('should replace all matches', async () => {
    await typeInEditor(page, 'foo bar foo baz foo');

    await page.keyboard.press('Control+H');
    const findPanel = page.getByTestId('writenow-find-replace');
    await expect(findPanel).toBeVisible();

    const findInput = page.getByTestId('writenow-find-input');
    await findInput.fill('foo');

    const replaceInput = page.getByTestId('writenow-replace-input');
    await replaceInput.fill('qux');

    // Should show 3 matches
    await expect(findPanel.locator('.wn-find-replace-count')).toContainText('1/3');

    // Click replace all
    await findPanel.getByTitle(/全部替换|Replace all/i).click();

    // Should now show no matches
    await expect(findPanel.locator('.wn-find-replace-count')).toContainText('无结果');

    // Editor should have all replaced
    const editor = page.locator('.ProseMirror');
    await expect(editor).not.toContainText('foo');
    await expect(editor).toContainText('qux bar qux baz qux');
  });

  test('should navigate using Enter/Shift+Enter', async () => {
    await typeInEditor(page, 'a b a c a');

    await page.keyboard.press('Control+F');
    const findPanel = page.getByTestId('writenow-find-replace');
    const findInput = page.getByTestId('writenow-find-input');
    await findInput.fill('a');

    await expect(findPanel.locator('.wn-find-replace-count')).toContainText('1/3');

    // Press Enter to go to next
    await findInput.press('Enter');
    await expect(findPanel.locator('.wn-find-replace-count')).toContainText('2/3');

    // Press Shift+Enter to go to previous
    await findInput.press('Shift+Enter');
    await expect(findPanel.locator('.wn-find-replace-count')).toContainText('1/3');
  });
});
