import { expect, _electron as electron, type ElectronApplication, type Page } from '@playwright/test';

/**
 * Launch the WriteNow Electron app for E2E tests.
 *
 * Why: E2E must exercise the real Electron main process + real backend + real persistence.
 * We always pass an isolated `WN_USER_DATA_DIR` to keep tests hermetic and reproducible.
 */
export async function launchApp(
  userDataDir: string,
  extraEnv: Record<string, string> = {},
): Promise<{ electronApp: ElectronApplication; page: Page }> {
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
  // Why: Backend boot happens before creating the window; renderer still needs extra time to hydrate once loaded.
  await expect(page.getByTestId('layout-sidebar')).toBeVisible({ timeout: 30_000 });
  await expect(page.getByTestId('layout-ai-panel')).toBeVisible({ timeout: 30_000 });

  return { electronApp, page };
}

/**
 * Create a new markdown file via FilesView's create dialog.
 *
 * Why: E2E should use real UI interactions instead of backend shortcuts.
 */
export async function createFile(page: Page, fileName: string): Promise<void> {
  const sidebar = page.getByTestId('layout-sidebar');
  await sidebar.getByTestId('activity-files').click();

  const trigger = sidebar.getByTestId('file-create-trigger');
  await expect(trigger).toBeEnabled({ timeout: 30_000 });
  await trigger.click();

  const dialog = page.getByTestId('file-create-dialog');
  await expect(dialog).toBeVisible({ timeout: 10_000 });
  await dialog.getByTestId('file-create-input').fill(fileName);
  await dialog.getByTestId('file-create-confirm').click();
  await expect(dialog).toBeHidden({ timeout: 10_000 });

  await expect(sidebar.getByText(fileName)).toBeVisible({ timeout: 30_000 });
}

/**
 * Type text into TipTap editor.
 *
 * Why: TipTap is contenteditable; Playwright's `.fill()` is unreliable unless the element is editable.
 */
export async function typeInEditor(page: Page, text: string): Promise<void> {
  const editor = page.getByTestId('tiptap-editor');
  await expect(editor).toBeVisible();
  await editor.click();
  await page.keyboard.type(text, { delay: 10 });
}

export function getModKey(): 'Meta' | 'Control' {
  return process.platform === 'darwin' ? 'Meta' : 'Control';
}

/**
 * Trigger manual save (Ctrl/Cmd+S) and wait until the UI reports "已保存".
 *
 * Why: History snapshots for sidebar HistoryView are produced as part of the save path (best-effort snapshot write).
 */
export async function saveNow(page: Page): Promise<void> {
  await page.keyboard.press(`${getModKey()}+S`);
  await expect(page.getByTestId('statusbar')).toContainText(/已保存/, { timeout: 20_000 });
}
