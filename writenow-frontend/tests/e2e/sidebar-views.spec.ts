import { mkdtemp, readFile } from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';

import { expect, test } from '@playwright/test';

import { createFile, launchApp, saveNow, typeInEditor } from '../utils/e2e-helpers';

test('Sidebar StatsView: displays real statistics after writing', async () => {
  const userDataDir = await mkdtemp(path.join(os.tmpdir(), 'writenow-sidebar-e2e-'));
  const { electronApp, page } = await launchApp(userDataDir);

  try {
    const fileName = `Stats-${Date.now()}.md`;
    await createFile(page, fileName);

    const unique = `hello world ${Date.now()}`;
    await typeInEditor(page, `\n${unique}\n`);
    await saveNow(page);

    await page.getByTestId('activity-stats').click();
    await expect(page.getByText('创作统计', { exact: true })).toBeVisible({ timeout: 10_000 });

    const wordCountText = await page.getByTestId('stats-today-wordcount').innerText();
    const wordCount = Number(wordCountText.replace(/[^\d]/g, ''));
    expect(wordCountText.trim()).not.toBe('1,234');
    expect(Number.isNaN(wordCount)).toBe(false);
    expect(wordCount).toBeGreaterThanOrEqual(0);
  } finally {
    await electronApp.close();
  }
});

test('Sidebar HistoryView: lists snapshots and can preview/restore', async () => {
  const userDataDir = await mkdtemp(path.join(os.tmpdir(), 'writenow-sidebar-e2e-'));
  const { electronApp, page } = await launchApp(userDataDir);

  try {
    const fileName = `History-${Date.now()}.md`;
    await createFile(page, fileName);

    const v1 = `V1-${Date.now()}`;
    await typeInEditor(page, `\n${v1}\n`);
    await saveNow(page);

    const v2 = `V2-${Date.now()}`;
    await typeInEditor(page, `\n${v2}\n`);
    await saveNow(page);

    await page.getByTestId('activity-history').click();
    await expect(page.getByText('版本历史', { exact: true })).toBeVisible({ timeout: 10_000 });

    await expect(page.getByTestId('history-list')).toBeVisible({ timeout: 10_000 });
    await page.getByTestId('history-refresh').click();

    const previewButtons = page.locator('[data-testid^="history-preview-"]');
    await expect.poll(async () => await previewButtons.count(), { timeout: 20_000 }).toBeGreaterThanOrEqual(2);

    await previewButtons.first().click({ force: true });
    await expect(page.getByText('版本预览', { exact: true })).toBeVisible({ timeout: 10_000 });
    const dialog = page.getByRole('dialog');
    await expect(dialog.locator('pre')).toContainText(v2, { timeout: 10_000 });
    await dialog.getByTitle('关闭预览').click();

    const restoreButtons = page.locator('[data-testid^="history-restore-"]');
    await restoreButtons.nth(1).click({ force: true });

    const docPath = path.join(userDataDir, 'documents', fileName);
    await expect
      .poll(async () => {
        const content = await readFile(docPath, 'utf8');
        return { hasV1: content.includes(v1), hasV2: content.includes(v2) };
      }, { timeout: 20_000 })
      .toEqual({ hasV1: true, hasV2: false });
  } finally {
    await electronApp.close();
  }
});
