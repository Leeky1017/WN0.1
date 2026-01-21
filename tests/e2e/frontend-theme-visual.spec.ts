import { mkdtemp } from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';

import { expect, test, _electron as electron } from '@playwright/test';

async function setTheme(page: import('@playwright/test').Page, theme: 'dark' | 'light') {
  await page.evaluate((next) => {
    document.documentElement.dataset.theme = next;
  }, theme);
  await page.waitForTimeout(50);
}

test('Frontend P0: theme mapping is visually stable (dark/light baseline)', async () => {
  const userDataDir = await mkdtemp(path.join(os.tmpdir(), 'writenow-e2e-'));

  const launchEnv = {
    ...process.env,
    WN_E2E: '1',
    WN_OPEN_DEVTOOLS: '0',
    WN_USER_DATA_DIR: userDataDir,
  };

  const electronApp = await electron.launch({ args: ['.'], env: launchEnv });
  const page = await electronApp.firstWindow();
  await expect(page.getByText('WriteNow')).toBeVisible();

  await page.locator('button[title="新建文件"]').click();
  await page.getByPlaceholder('未命名').fill('ThemeBaseline');
  await page.getByPlaceholder('未命名').press('Enter');
  await expect(page.getByTestId('layout-sidebar').getByRole('button', { name: /^ThemeBaseline\.md/ })).toBeVisible();

  await page.getByPlaceholder('开始用 Markdown 写作…').fill('# Theme Baseline\n\nHello world.\n');
  await expect(page.getByText('已保存', { exact: true })).toBeVisible({ timeout: 15_000 });

  const statusBar = page.getByTestId('statusbar');
  await expect(statusBar).toContainText('ThemeBaseline.md');

  await page.addStyleTag({
    content: `
      *, *::before, *::after {
        animation-duration: 0ms !important;
        animation-delay: 0ms !important;
        transition-duration: 0ms !important;
        caret-color: transparent !important;
      }
    `,
  });

  await setTheme(page, 'dark');
  await expect(page).toHaveScreenshot('frontend-theme-dark.png', { animations: 'disabled' });

  await setTheme(page, 'light');
  await expect(page).toHaveScreenshot('frontend-theme-light.png', { animations: 'disabled' });

  await electronApp.close();
});
