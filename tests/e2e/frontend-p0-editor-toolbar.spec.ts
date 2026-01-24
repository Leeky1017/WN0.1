/**
 * E2E tests for P0-003 Editor Toolbar.
 *
 * Why: Validates the TipTap editor toolbar displays formatting buttons,
 * applies formatting correctly, and reflects active state.
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
  // Wait for file to be created
  await expect(
    page.getByTestId('layout-sidebar').getByRole('button', { name: new RegExp(`^${name}\\.md`) }),
  ).toBeVisible({ timeout: 10_000 });
}

test.describe('P0-003: Editor Toolbar', () => {
  let electronApp: ElectronApplication;
  let page: Page;
  let userDataDir: string;

  test.beforeEach(async () => {
    userDataDir = await mkdtemp(path.join(os.tmpdir(), 'writenow-e2e-toolbar-'));
    const app = await launchApp(userDataDir);
    electronApp = app.electronApp;
    page = app.page;
    // Create a new file to have an active editor
    await createNewFile(page, 'ToolbarTest');
  });

  test.afterEach(async () => {
    await electronApp.close();
  });

  test('should display editor toolbar with formatting buttons', async () => {
    // Toolbar should be visible
    const toolbar = page.locator('.wn-editor-toolbar');
    await expect(toolbar).toBeVisible({ timeout: 5_000 });

    // Check for Undo/Redo buttons
    await expect(toolbar.getByTitle(/撤销|Undo/)).toBeVisible();
    await expect(toolbar.getByTitle(/重做|Redo/)).toBeVisible();

    // Check for formatting buttons
    await expect(toolbar.getByTitle(/加粗|Bold/)).toBeVisible();
    await expect(toolbar.getByTitle(/斜体|Italic/)).toBeVisible();
    await expect(toolbar.getByTitle(/删除线|Strikethrough/)).toBeVisible();

    // Check for heading dropdown
    await expect(toolbar.locator('.wn-toolbar-dropdown')).toBeVisible();
  });

  test('should apply bold formatting when bold button is clicked', async () => {
    const editor = page.locator('.ProseMirror');
    await expect(editor).toBeVisible();

    // Type some text
    await editor.click();
    await page.keyboard.type('Hello World');

    // Select the text
    await page.keyboard.press('Control+A');

    // Click bold button
    const toolbar = page.locator('.wn-editor-toolbar');
    await toolbar.getByTitle(/加粗|Bold/).click();

    // Check that text is now bold (wrapped in <strong>)
    await expect(editor.locator('strong')).toContainText('Hello World');
  });

  test('should apply italic formatting when italic button is clicked', async () => {
    const editor = page.locator('.ProseMirror');
    await expect(editor).toBeVisible();

    // Type and select text
    await editor.click();
    await page.keyboard.type('Italic text');
    await page.keyboard.press('Control+A');

    // Click italic button
    const toolbar = page.locator('.wn-editor-toolbar');
    await toolbar.getByTitle(/斜体|Italic/).click();

    // Check that text is now italic
    await expect(editor.locator('em')).toContainText('Italic text');
  });

  test('should toggle formatting state on button when text is formatted', async () => {
    const editor = page.locator('.ProseMirror');
    await expect(editor).toBeVisible();

    const toolbar = page.locator('.wn-editor-toolbar');
    const boldButton = toolbar.getByTitle(/加粗|Bold/);

    // Type some text and make it bold
    await editor.click();
    await page.keyboard.type('Bold text');
    await page.keyboard.press('Control+A');
    await boldButton.click();

    // Bold button should now have active state
    await expect(boldButton).toHaveClass(/wn-toolbar-button--active/);

    // Click bold again to remove formatting
    await boldButton.click();

    // Bold button should no longer have active state
    await expect(boldButton).not.toHaveClass(/wn-toolbar-button--active/);
  });

  test('should apply heading from dropdown', async () => {
    const editor = page.locator('.ProseMirror');
    await expect(editor).toBeVisible();

    // Type some text
    await editor.click();
    await page.keyboard.type('My Heading');

    // Select the text
    await page.keyboard.press('Control+A');

    // Open heading dropdown and select H1
    const toolbar = page.locator('.wn-editor-toolbar');
    const headingDropdown = toolbar.locator('.wn-toolbar-dropdown');
    await headingDropdown.click();

    // Select H1 option
    await page.locator('.wn-toolbar-dropdown-option').filter({ hasText: 'H1' }).click();

    // Check that text is now in h1
    await expect(editor.locator('h1')).toContainText('My Heading');
  });

  test('should undo last action when undo button is clicked', async () => {
    const editor = page.locator('.ProseMirror');
    await expect(editor).toBeVisible();

    // Type some text
    await editor.click();
    await page.keyboard.type('Original text');

    // Add more text
    await page.keyboard.type(' and more');

    // Click undo button
    const toolbar = page.locator('.wn-editor-toolbar');
    await toolbar.getByTitle(/撤销|Undo/).click();

    // The "and more" should be undone
    await expect(editor).toContainText('Original text');
    await expect(editor).not.toContainText('and more');
  });

  test('should toggle ordered list when list button is clicked', async () => {
    const editor = page.locator('.ProseMirror');
    await expect(editor).toBeVisible();

    // Type some text
    await editor.click();
    await page.keyboard.type('List item');

    // Click ordered list button
    const toolbar = page.locator('.wn-editor-toolbar');
    await toolbar.getByTitle(/有序列表|Ordered list/).click();

    // Check that text is in an ordered list
    await expect(editor.locator('ol')).toBeVisible();
    await expect(editor.locator('li')).toContainText('List item');
  });

  test('should toggle unordered list when bullet list button is clicked', async () => {
    const editor = page.locator('.ProseMirror');
    await expect(editor).toBeVisible();

    // Type some text
    await editor.click();
    await page.keyboard.type('Bullet item');

    // Click unordered list button
    const toolbar = page.locator('.wn-editor-toolbar');
    await toolbar.getByTitle(/无序列表|Bullet list/).click();

    // Check that text is in an unordered list
    await expect(editor.locator('ul')).toBeVisible();
    await expect(editor.locator('li')).toContainText('Bullet item');
  });
});
