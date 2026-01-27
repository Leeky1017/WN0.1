import { mkdtemp, readFile } from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';

import { expect, test, type Page } from '@playwright/test';

import { closeWriteNowApp, createNewFile, escapeRegExp, isWSL, launchWriteNowApp } from '../_utils/writenow';

/**
 * Why: Keybinding delivery can be flaky under CI/WSL; retry once before failing.
 */
async function openCommandPalette(page: Page): Promise<void> {
  const cmdk = page.getByTestId('cmdk');
  for (let attempt = 0; attempt < 2; attempt += 1) {
    await page.keyboard.press('Control+K');
    if (await cmdk.isVisible().catch(() => false)) return;
  }
  await expect(cmdk).toBeVisible({ timeout: 10_000 });
}

/**
 * Why: Ensure Focus/Zen enters even if the first shortcut delivery is dropped.
 */
async function enterFocusMode(page: Page): Promise<void> {
  const focusRoot = page.getByTestId('wm-focus-root');
  for (let attempt = 0; attempt < 2; attempt += 1) {
    await page.keyboard.press('Control+\\');
    if ((await focusRoot.getAttribute('data-focus-mode')) === '1') return;
  }
  await expect(focusRoot).toHaveAttribute('data-focus-mode', '1', { timeout: 10_000 });
}

/**
 * Why: Focus mode collapses panels with transitions; polling avoids flaky snapshot timing under CI.
 */
async function expectPanelCollapsed(page: Page, testId: string, maxWidth: number): Promise<void> {
  await expect
    .poll(
      async () => {
        const box = await page.getByTestId(testId).boundingBox();
        return box?.width ?? Number.POSITIVE_INFINITY;
      },
      { timeout: 5_000 },
    )
    .toBeLessThan(maxWidth);
}

test.describe('@write-mode command palette + focus/zen', () => {
  test.skip(isWSL(), 'Electron E2E is unstable on WSL; run on native Linux (xvfb) or macOS/Windows.');

  test('Cmd/Ctrl+K opens cmdk, can open file, and recent persists across restart', async () => {
    const userDataDir = await mkdtemp(path.join(os.tmpdir(), 'writenow-e2e-cmdk-'));

    const docA = `CmdkA-${Date.now()}`;
    const docB = `CmdkB-${Date.now()}`;

    const app1 = await launchWriteNowApp({ userDataDir });
    try {
      const { page } = app1;

      await createNewFile(page, docA);
      await createNewFile(page, docB);

      // Switch back to A via cmdk
      await page.getByTestId('tiptap-editor').click();
      await openCommandPalette(page);
      const cmdk = page.getByTestId('cmdk');

      const input = page.getByTestId('cmdk-input');
      await expect(input).toBeFocused();
      await page.keyboard.type(docA, { delay: 10 });

      const optionA = cmdk.getByRole('option', { name: new RegExp(`^${escapeRegExp(docA)}\\.md$`) });
      await expect(optionA).toBeVisible({ timeout: 30_000 });
      await optionA.click();

      await expect(cmdk).toBeHidden({ timeout: 10_000 });

      // Editor should regain focus after cmdk closes
      const editor = page.getByTestId('tiptap-editor');
      await expect(editor).toBeVisible();
      await expect(editor).toBeFocused({ timeout: 10_000 });

      const unique = `CMDK_${Date.now()}`;
      await page.keyboard.type(`# ${docA}\n\n${unique}`, { delay: 10 });
      await expect(page.getByTestId('statusbar-save')).toContainText('已保存', { timeout: 30_000 });

      const filePath = path.join(userDataDir, 'documents', `${docA}.md`);
      const content = await readFile(filePath, 'utf8');
      expect(content).toContain(unique);
    } finally {
      await closeWriteNowApp(app1);
    }

    // Relaunch with the same userDataDir → recent should still be there
    const app2 = await launchWriteNowApp({ userDataDir });
    try {
      const { page } = app2;

      await openCommandPalette(page);
      const cmdk = page.getByTestId('cmdk');

      // Default selection should prefer recent when query is empty → Enter should open the recent file.
      await page.keyboard.press('Enter');
      await expect(cmdk).toBeHidden({ timeout: 10_000 });
      await expect(page.getByTestId('wm-header')).toContainText(`${docA}.md`, { timeout: 10_000 });
    } finally {
      await closeWriteNowApp(app2);
    }
  });

  test('WM-002 Cmd/Ctrl+\\ toggles Focus/Zen; Esc exits Focus and editor stays usable', async () => {
    const userDataDir = await mkdtemp(path.join(os.tmpdir(), 'writenow-e2e-focus-'));
    const app = await launchWriteNowApp({ userDataDir });
    const { page } = app;
    try {
      const docName = `Focus-${Date.now()}`;
      const docPath = path.join(userDataDir, 'documents', `${docName}.md`);

      await createNewFile(page, docName);

      const editor = page.getByTestId('tiptap-editor');
      await editor.click();

      const unique = `FOCUS_${Date.now()}`;
      await page.keyboard.type(`# ${docName}\n\n${unique}`, { delay: 10 });
      await expect(page.getByTestId('statusbar-save')).toContainText('已保存', { timeout: 30_000 });

      await enterFocusMode(page);
      await expect(page.getByTestId('wm-focus-root')).toHaveAttribute('data-focus-mode', '1');
      await expect(page.getByTestId('wm-focus-hud')).toBeVisible();
      await expect(page.getByTestId('wm-header')).toBeHidden();
      await expect(page.getByTestId('statusbar')).toBeHidden();

      await expectPanelCollapsed(page, 'layout-sidebar', 2);
      await expectPanelCollapsed(page, 'layout-ai-panel', 2);

      // Still editable while in focus mode
      await editor.click();
      await page.keyboard.type('\n\nstill typing', { delay: 10 });
      await expect(page.getByTestId('wm-focus-hud')).toContainText('已保存', { timeout: 30_000 });

      await page.keyboard.press('Escape');
      await expect(page.getByTestId('wm-focus-root')).toHaveAttribute('data-focus-mode', '0');
      await expect(page.getByTestId('wm-focus-hud')).toBeHidden();
      await expect(page.getByTestId('wm-header')).toBeVisible();
      await expect(page.getByTestId('statusbar')).toBeVisible();

      const content = await readFile(docPath, 'utf8');
      expect(content).toContain(unique);
      expect(content).toContain('still typing');
    } finally {
      await closeWriteNowApp(app);
    }
  });
});
