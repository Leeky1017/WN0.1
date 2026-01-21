import { mkdtemp } from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';

import { expect, test, _electron as electron, type Page } from '@playwright/test';

async function launchApp(userDataDir: string) {
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
  await expect(page.getByText('WriteNow')).toBeVisible();
  return { electronApp, page };
}

function escapeRegExp(text: string) {
  return text.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

async function openProjectManager(page: Page) {
  await page.locator('button[title="项目管理"]').first().click();
  await expect(page.getByText('项目管理')).toBeVisible();
}

async function createProject(page: Page, name: string) {
  await openProjectManager(page);
  await page.getByPlaceholder('项目名称').fill(name);
  await page.getByPlaceholder('项目名称').press('Enter');
  await expect(page.locator('button[title="项目管理"]').first()).toContainText(name);
}

async function createFile(page: Page, name: string) {
  await page.locator('button[title="新建文件"]').click();
  await page.getByPlaceholder('未命名').fill(name);
  await page.getByPlaceholder('未命名').press('Enter');
  await expect(
    page.getByTestId('layout-sidebar').getByRole('button', { name: new RegExp(`^${escapeRegExp(name)}\\.md`) }),
  ).toBeVisible({ timeout: 15_000 });
}

async function openCardsView(page: Page) {
  await page.locator('button[title="卡片"]').click();
  await expect(page.getByTestId('cards-list')).toBeVisible();
}

async function readCardOrder(page: Page) {
  return page
    .locator('[data-testid="cards-list"] > [data-testid^="card-"]')
    .evaluateAll((nodes) => nodes.map((node) => node.getAttribute('data-testid')).filter(Boolean)) as Promise<string[]>;
}

test('card view: drag reorder + status persist after restart', async () => {
  const userDataDir = await mkdtemp(path.join(os.tmpdir(), 'writenow-e2e-'));
  const first = await launchApp(userDataDir);

  try {
    await createProject(first.page, 'Alpha');
    await createFile(first.page, 'Chapter 1');
    await createFile(first.page, 'Chapter 2');

    await openCardsView(first.page);

    const initialOrder = await readCardOrder(first.page);
    expect(initialOrder).toEqual(['card-Chapter 2.md', 'card-Chapter 1.md']);

    await first.page.getByTestId('card-Chapter 1.md').dragTo(first.page.getByTestId('card-Chapter 2.md'));

    const reordered = await readCardOrder(first.page);
    expect(reordered).toEqual(['card-Chapter 1.md', 'card-Chapter 2.md']);

    await first.page.getByTestId('card-status-Chapter 1.md').selectOption('done');
    await expect(first.page.getByTestId('card-status-Chapter 1.md')).toHaveValue('done');

    await first.page.getByTestId('card-Chapter 2.md').locator('button').click();
    await expect(first.page.getByTestId('statusbar')).toContainText('Chapter 2.md');
  } finally {
    await first.electronApp.close();
  }

  const second = await launchApp(userDataDir);
  try {
    await openCardsView(second.page);

    const persistedOrder = await readCardOrder(second.page);
    expect(persistedOrder).toEqual(['card-Chapter 1.md', 'card-Chapter 2.md']);
    await expect(second.page.getByTestId('card-status-Chapter 1.md')).toHaveValue('done');
  } finally {
    await second.electronApp.close();
  }
});
