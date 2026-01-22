import { mkdtemp } from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';

import { expect, test, _electron as electron } from '@playwright/test';

test('Frontend P1: StatusBar is unified (≤24px) and supports progressive disclosure', async () => {
  const userDataDir = await mkdtemp(path.join(os.tmpdir(), 'writenow-e2e-'));

  const launchEnv = {
    ...process.env,
    WN_E2E: '1',
    WN_OPEN_DEVTOOLS: '0',
    WN_USER_DATA_DIR: userDataDir,
    WN_POMODORO_TIME_SCALE: '0.05',
  };

  const electronApp = await electron.launch({ args: ['.'], env: launchEnv });
  const page = await electronApp.firstWindow();
  await expect(page.getByText('WriteNow')).toBeVisible();

  await page.getByTitle(/New file|新建文件/).click();
  const nameInput = page.getByPlaceholder(/Untitled|未命名/);
  await nameInput.fill('StatusBar');
  await nameInput.press('Enter');
  await expect(page.getByTestId('layout-sidebar').getByRole('button', { name: /^StatusBar\.md/ })).toBeVisible();

  await page
    .getByPlaceholder(/Start typing in Markdown…|开始用 Markdown 写作…/)
    .fill('# StatusBar\n\nHello\n\n' + 'line\n'.repeat(40));

  const statusBar = page.getByTestId('statusbar');
  await expect(statusBar).toBeVisible();
  await expect(page.locator('[data-testid="statusbar"]')).toHaveCount(1);

  const box = await statusBar.boundingBox();
  expect(box).not.toBeNull();
  expect((box as NonNullable<typeof box>).height).toBeLessThanOrEqual(24);

  await expect(statusBar.getByText(/Ln\s+\d+|行\s+\d+/)).toBeVisible();

  const timerLabel = statusBar.getByText(/\d{2}:\d{2}/);
  const timerBefore = await timerLabel.innerText();

  await page.getByRole('button', { name: /Expand status details|展开状态详情/ }).click();
  await expect(page.getByText(/Today|今日/)).toBeVisible();

  const timerToggle = page.getByRole('button', { name: /\d{2}:\d{2}/ }).first();
  await timerToggle.click();

  await expect.poll(async () => timerLabel.innerText()).not.toBe(timerBefore);

  await page.keyboard.press('Escape');
  await expect(page.getByText(/Today|今日/)).toBeHidden();

  await electronApp.close();
});
