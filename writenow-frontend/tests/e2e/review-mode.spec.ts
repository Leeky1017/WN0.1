import { mkdtemp, readFile } from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';

import { expect, test, _electron as electron, type ElectronApplication, type Page } from '@playwright/test';

const E2E_AI_API_KEY = typeof process.env.WN_E2E_AI_API_KEY === 'string' ? process.env.WN_E2E_AI_API_KEY.trim() : '';
const E2E_AI_BASE_URL = typeof process.env.WN_E2E_AI_BASE_URL === 'string' ? process.env.WN_E2E_AI_BASE_URL.trim() : '';

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
      ...(E2E_AI_API_KEY ? { WN_AI_API_KEY: E2E_AI_API_KEY } : {}),
      ...(E2E_AI_BASE_URL ? { WN_AI_BASE_URL: E2E_AI_BASE_URL } : {}),
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

test.describe('write mode: Review Mode (AI diff)', () => {
  test.skip(Boolean(process.env.WSL_DISTRO_NAME || process.env.WSL_INTEROP), 'Electron E2E is unstable on WSL; run on native Linux (xvfb) or macOS/Windows.');
  test.skip(!E2E_AI_API_KEY, 'WN_E2E_AI_API_KEY is required to run Review Mode AI E2E');
  test.setTimeout(10 * 60_000);

  test('run → diff → accept → autosave persists', async () => {
    const userDataDir = await mkdtemp(path.join(os.tmpdir(), 'writenow-e2e-review-'));
    const { electronApp, page } = await launchApp(userDataDir);

    try {
      const docName = `Review-${Date.now()}`;
      await createNewFile(page, docName);

      const editor = page.getByTestId('tiptap-editor');
      await expect(editor).toBeVisible();
      await editor.click();

      const original = `# ${docName}\n\nA.\n\nE2E_${Date.now()}`;
      await editor.fill(original);
      await expect(page.getByTestId('statusbar-save')).toContainText('已保存', { timeout: 30_000 });

      // Select all so Review Mode applies deterministically.
      await page.keyboard.press('Control+A');

      // Pick a skill that should reliably change output length.
      const select = page.getByLabel('Select skill');
      await expect(select).toBeEnabled({ timeout: 30_000 });
      await select.selectOption('builtin:expand');

      await page.getByRole('button', { name: '发送' }).click();

      await expect(page.getByTestId('wm-review-root')).toBeVisible({ timeout: 5 * 60_000 });
      await expect(page.getByTestId('wm-review-accept')).toBeEnabled({ timeout: 5 * 60_000 });

      await page.getByTestId('wm-review-accept').click();
      await expect(page.getByTestId('wm-review-root')).toBeHidden({ timeout: 30_000 });

      await expect(page.getByTestId('statusbar-save')).toContainText('已保存', { timeout: 30_000 });

      const docPath = path.join(userDataDir, 'documents', `${docName}.md`);
      const content = await readFile(docPath, 'utf8');
      expect(content.length).toBeGreaterThan(original.length);
    } finally {
      await electronApp.close().catch(() => undefined);
    }
  });
});

