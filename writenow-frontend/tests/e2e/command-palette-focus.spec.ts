import { mkdtemp, readFile } from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';

import { expect, test, _electron as electron, type ElectronApplication, type Page } from '@playwright/test';

function escapeRegExp(text: string) {
  return text.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

async function launchApp(userDataDir: string): Promise<{ electronApp: ElectronApplication; page: Page }> {
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

  const page = await electronApp.firstWindow();
  await expect(page.getByTestId('wm-header')).toBeVisible({ timeout: 30_000 });
  return { electronApp, page };
}

async function createNewFile(page: Page, name: string): Promise<void> {
  await page.locator('button[title="新建文件"]').click();
  const nameInput = page.getByPlaceholder('未命名');
  await nameInput.fill(name);
  await nameInput.press('Enter');
  await expect(
    page.getByTestId('layout-sidebar').getByRole('treeitem', { name: new RegExp(`^${escapeRegExp(name)}\\.md$`) }),
  ).toBeVisible({ timeout: 30_000 });
}

test.describe('write mode: command palette + focus/zen', () => {
  test.skip(Boolean(process.env.WSL_DISTRO_NAME || process.env.WSL_INTEROP), 'Electron E2E is unstable on WSL; run on native Linux (xvfb) or macOS/Windows.');

  test('Cmd/Ctrl+K opens cmdk, can open file, and recent persists across restart', async () => {
    const userDataDir = await mkdtemp(path.join(os.tmpdir(), 'writenow-e2e-cmdk-'));

    const docA = `CmdkA-${Date.now()}`;
    const docB = `CmdkB-${Date.now()}`;

    const app1 = await launchApp(userDataDir);
    try {
      const { page } = app1;

      await createNewFile(page, docA);
      await createNewFile(page, docB);

      // Switch back to A via cmdk
      await page.keyboard.press('Control+K');
      const cmdk = page.getByTestId('cmdk');
      await expect(cmdk).toBeVisible();

      const input = page.getByTestId('cmdk-input');
      await expect(input).toBeFocused();
      await input.fill(docA);

      const optionA = cmdk.getByRole('option', { name: new RegExp(`^${escapeRegExp(docA)}\\.md$`) });
      await expect(optionA).toBeVisible({ timeout: 30_000 });
      await optionA.click();

      await expect(cmdk).toBeHidden({ timeout: 10_000 });

      // Editor should regain focus after cmdk closes
      const editor = page.getByTestId('tiptap-editor');
      await expect(editor).toBeVisible();
      await expect(editor).toBeFocused({ timeout: 10_000 });

      const unique = `CMDK_${Date.now()}`;
      await editor.fill(`# ${docA}\n\n${unique}`);
      await expect(page.getByTestId('statusbar-save')).toContainText('已保存', { timeout: 30_000 });

      const filePath = path.join(userDataDir, 'documents', `${docA}.md`);
      const content = await readFile(filePath, 'utf8');
      expect(content).toContain(unique);
    } finally {
      await app1.electronApp.close();
    }

    // Relaunch with the same userDataDir → recent should still be there
    const app2 = await launchApp(userDataDir);
    try {
      const { page } = app2;

      await page.keyboard.press('Control+K');
      const cmdk = page.getByTestId('cmdk');
      await expect(cmdk).toBeVisible();

      // Default selection should prefer recent when query is empty → Enter should open the recent file.
      await page.keyboard.press('Enter');
      await expect(cmdk).toBeHidden({ timeout: 10_000 });
      await expect(page.getByTestId('wm-header')).toContainText(`${docA}.md`, { timeout: 10_000 });
    } finally {
      await app2.electronApp.close();
    }
  });

  test('Cmd/Ctrl+\\\\ toggles Focus/Zen; Esc exits Focus and editor stays usable', async () => {
    const userDataDir = await mkdtemp(path.join(os.tmpdir(), 'writenow-e2e-focus-'));
    const { electronApp, page } = await launchApp(userDataDir);
    try {
      const docName = `Focus-${Date.now()}`;
      await createNewFile(page, docName);

      const editor = page.getByTestId('tiptap-editor');
      await editor.click();

      const unique = `FOCUS_${Date.now()}`;
      await editor.fill(`# ${docName}\n\n${unique}`);
      await expect(page.getByTestId('statusbar-save')).toContainText('已保存', { timeout: 30_000 });

      await page.keyboard.press('Control+\\');
      await expect(page.getByTestId('wm-focus-root')).toHaveAttribute('data-focus-mode', '1');
      await expect(page.getByTestId('wm-focus-hud')).toBeVisible();
      await expect(page.getByTestId('wm-header')).toBeHidden();
      await expect(page.getByTestId('statusbar')).toBeHidden();

      const sidebarBox = await page.getByTestId('layout-sidebar').boundingBox();
      expect(sidebarBox).not.toBeNull();
      expect((sidebarBox as NonNullable<typeof sidebarBox>).width).toBeLessThan(2);

      const aiBox = await page.getByTestId('layout-ai-panel').boundingBox();
      expect(aiBox).not.toBeNull();
      expect((aiBox as NonNullable<typeof aiBox>).width).toBeLessThan(2);

      // Still editable while in focus mode
      await editor.click();
      await page.keyboard.type('\n\nstill typing', { delay: 10 });
      await expect(page.getByTestId('wm-focus-hud')).toContainText('已保存', { timeout: 30_000 });

      await page.keyboard.press('Escape');
      await expect(page.getByTestId('wm-focus-root')).toHaveAttribute('data-focus-mode', '0');
      await expect(page.getByTestId('wm-focus-hud')).toBeHidden();
      await expect(page.getByTestId('wm-header')).toBeVisible();
      await expect(page.getByTestId('statusbar')).toBeVisible();
    } finally {
      await electronApp.close();
    }
  });
});

