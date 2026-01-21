import fs from 'node:fs';
import { mkdtemp, readFile } from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';

import Database from 'better-sqlite3-node';
import { expect, test, _electron as electron } from '@playwright/test';

test('app launch, create file, and initialize storage', async () => {
  const userDataDir = await mkdtemp(path.join(os.tmpdir(), 'writenow-e2e-'));

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

  await page.locator('button[title="新建文件"]').click();
  await page.getByPlaceholder('未命名').fill('E2E Test');
  await page.getByPlaceholder('未命名').press('Enter');

  await expect(page.getByTestId('layout-sidebar').getByRole('button', { name: /^E2E Test\.md/ })).toBeVisible();
  await page.getByPlaceholder('开始用 Markdown 写作…').fill('# E2E\n\nHello');
  await expect(page.getByText('已保存', { exact: true })).toBeVisible({ timeout: 15_000 });

  await electronApp.close();

  const docPath = path.join(userDataDir, 'documents', 'E2E Test.md');
  expect(fs.existsSync(docPath)).toBe(true);

  const dbPath = path.join(userDataDir, 'data', 'writenow.db');
  expect(fs.existsSync(dbPath)).toBe(true);
  const db = new Database(dbPath);
  const rows = db.prepare("SELECT name FROM sqlite_master WHERE type='table'").all() as Array<{ name: string }>;
  db.close();

  const tableNameSet = new Set(rows.map((r) => r.name));
  const expectedTables = [
    'articles',
    'articles_fts',
    'article_snapshots',
    'projects',
    'characters',
    'skills',
    'user_memory',
    'writing_stats',
    'writing_constraints',
    'terminology',
    'forbidden_words',
    'settings',
  ];

  for (const name of expectedTables) {
    expect(tableNameSet.has(name)).toBe(true);
  }

  const logPath = path.join(userDataDir, 'logs', 'main.log');
  expect(fs.existsSync(logPath)).toBe(true);
  const logContent = await readFile(logPath, 'utf8');
  expect(logContent.length).toBeGreaterThan(0);
});
