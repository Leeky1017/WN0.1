import { mkdtemp } from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';

import { expect, test, _electron as electron } from '@playwright/test';

async function dragSeparatorBy(page: import('@playwright/test').Page, ariaLabel: string, deltaX: number) {
  const handle = page.getByRole('separator', { name: ariaLabel });
  await expect(handle).toBeVisible();
  const box = await handle.boundingBox();
  expect(box).not.toBeNull();
  const safeBox = box as NonNullable<typeof box>;

  const startX = safeBox.x + safeBox.width / 2;
  const startY = safeBox.y + safeBox.height / 2;

  await page.mouse.move(startX, startY);
  await page.mouse.down();
  await page.mouse.move(startX + deltaX, startY, { steps: 12 });
  await page.mouse.up();
}

test('Frontend P1: resizable panels persist across restart', async () => {
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

  const sidebar = page.getByTestId('layout-sidebar');
  const aiPanel = page.getByTestId('layout-ai-panel');

  const sidebarBefore = await sidebar.boundingBox();
  const aiBefore = await aiPanel.boundingBox();
  expect(sidebarBefore).not.toBeNull();
  expect(aiBefore).not.toBeNull();

  const sidebarBeforeWidth = (sidebarBefore as NonNullable<typeof sidebarBefore>).width;
  const aiBeforeWidth = (aiBefore as NonNullable<typeof aiBefore>).width;

  await dragSeparatorBy(page, 'Resize sidebar', 120);
  await dragSeparatorBy(page, 'Resize AI panel', -120);

  const sidebarAfter = await sidebar.boundingBox();
  const aiAfter = await aiPanel.boundingBox();
  expect(sidebarAfter).not.toBeNull();
  expect(aiAfter).not.toBeNull();

  const sidebarAfterWidth = (sidebarAfter as NonNullable<typeof sidebarAfter>).width;
  const aiAfterWidth = (aiAfter as NonNullable<typeof aiAfter>).width;

  expect(sidebarAfterWidth).toBeGreaterThan(sidebarBeforeWidth + 8);
  expect(aiAfterWidth).toBeGreaterThan(aiBeforeWidth + 8);

  await electronApp.close();

  const electronApp2 = await electron.launch({ args: ['.'], env: launchEnv });
  const page2 = await electronApp2.firstWindow();
  await expect(page2.getByText('WriteNow')).toBeVisible();

  const sidebarRestored = await page2.getByTestId('layout-sidebar').boundingBox();
  const aiRestored = await page2.getByTestId('layout-ai-panel').boundingBox();
  expect(sidebarRestored).not.toBeNull();
  expect(aiRestored).not.toBeNull();

  const sidebarRestoredWidth = (sidebarRestored as NonNullable<typeof sidebarRestored>).width;
  const aiRestoredWidth = (aiRestored as NonNullable<typeof aiRestored>).width;

  expect(Math.abs(sidebarRestoredWidth - sidebarAfterWidth)).toBeLessThan(4);
  expect(Math.abs(aiRestoredWidth - aiAfterWidth)).toBeLessThan(4);

  await electronApp2.close();
});
