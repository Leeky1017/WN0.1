import fs from 'node:fs';
import { mkdtemp, readdir, readFile } from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';

import { expect, test, _electron as electron, type Page } from '@playwright/test';

async function launchApp(userDataDir: string, extraEnv: Record<string, string> = {}) {
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
  await expect(page.getByText('WriteNow')).toBeVisible();

  return { electronApp, page };
}

function escapeRegExp(text: string) {
  return text.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

async function createFile(page: Page, name: string) {
  await page.getByTitle(/New file|新建文件/).click();
  const nameInput = page.getByPlaceholder(/Untitled|未命名/);
  await nameInput.fill(name);
  await nameInput.press('Enter');
  await expect(
    page.getByTestId('layout-sidebar').getByRole('button', { name: new RegExp(`^${escapeRegExp(name)}\\.md`) }),
  ).toBeVisible();
}

async function waitForSnapshot(userDataDir: string, options: { timeoutMs?: number; contains?: string } = {}) {
  const snapshotsDir = path.join(userDataDir, 'snapshots');
  const startedAt = Date.now();
  const timeoutMs = options.timeoutMs ?? 10_000;
  const contains = options.contains;

  while (Date.now() - startedAt <= timeoutMs) {
    const files = await readdir(snapshotsDir).catch(() => []);
    const json = files.filter((f) => f.toLowerCase().endsWith('.json'));
    if (json.length > 0 && !contains) return json;
    if (json.length > 0 && contains) {
      for (const name of json) {
        const raw = await readFile(path.join(snapshotsDir, name), 'utf8').catch(() => '');
        if (raw.includes(contains)) return json;
      }
    }
    await new Promise((r) => setTimeout(r, 200));
  }
  throw new Error(`Timed out waiting for snapshot in ${snapshotsDir}`);
}

test('dual-mode: richtext edits roundtrip back to markdown', async () => {
  const userDataDir = await mkdtemp(path.join(os.tmpdir(), 'writenow-e2e-'));
  const { electronApp, page } = await launchApp(userDataDir);

  await createFile(page, 'Mode Switch');

  await page.getByRole('button', { name: /Rich Text|富文本/ }).click();
  const richText = page.locator('.ProseMirror');
  await expect(richText).toBeVisible();

  await richText.click();
  await page.getByTitle(/Heading 1|标题 1/).click();
  await richText.type('Title');
  await richText.press('Enter');
  await richText.press('Enter');

  await page.getByTitle(/Bold|加粗/).click();
  await richText.type('Bold');
  await page.getByTitle(/Bold|加粗/).click();
  await richText.type(' Normal');
  await richText.press('Enter');

  await page.getByTitle(/Bullet list|无序列表/).click();
  await richText.type('item1');
  await richText.press('Enter');
  await richText.type('item2');

  await page.getByRole('button', { name: /Markdown/ }).click();
  const textarea = page.getByPlaceholder(/Start typing in Markdown…|开始用 Markdown 写作…/);
  await expect(textarea).toBeVisible();
  const markdown = await textarea.inputValue();

  expect(markdown).toContain('# Title');
  expect(markdown).toContain('**Bold**');
  expect(markdown).toMatch(/- item1/);

  await electronApp.close();
});

test('file delete removes file and closes editor', async () => {
  const userDataDir = await mkdtemp(path.join(os.tmpdir(), 'writenow-e2e-'));
  const { electronApp, page } = await launchApp(userDataDir);

  await createFile(page, 'Delete Me');

  await page.getByTitle(/Delete file|删除文件/).click();
  await expect(page.getByText(/Delete article|删除文章/)).toBeVisible();
  await page.getByRole('button', { name: /^(Delete|删除)$/ }).click();

  await expect(page.getByTestId('layout-sidebar').getByRole('button', { name: /^Delete Me\.md/ })).toBeHidden();

  const docPath = path.join(userDataDir, 'documents', 'Delete Me.md');
  expect(fs.existsSync(docPath)).toBe(false);

  await expect(page.getByTestId('editor-tabbar').getByRole('button', { name: 'Delete Me.md', exact: true })).toHaveCount(0);
  await expect(page.locator('textarea[placeholder="开始用 Markdown 写作…"]')).toBeVisible();
  await electronApp.close();
});

test('crash recovery restores latest snapshot on next launch', async () => {
  const userDataDir = await mkdtemp(path.join(os.tmpdir(), 'writenow-e2e-'));
  const unique = `CRASH_RECOVER_${Date.now()}`;

  const first = await launchApp(userDataDir, { WN_SNAPSHOT_INTERVAL_MS: '200' });
  await createFile(first.page, 'Crash');

  const textarea = first.page.getByPlaceholder(/Start typing in Markdown…|开始用 Markdown 写作…/);
  await textarea.fill(`# Crash\n\n${unique}`);
  await waitForSnapshot(userDataDir, { contains: unique });

  first.electronApp.process()?.kill('SIGKILL');
  await new Promise((r) => setTimeout(r, 500));

  const second = await launchApp(userDataDir, { WN_SNAPSHOT_INTERVAL_MS: '200' });
  await expect(second.page.getByText(/Unexpected shutdown detected|检测到上次异常退出/)).toBeVisible();
  await second.page.getByRole('button', { name: /Restore snapshot|恢复快照/ }).click();

  const textarea2 = second.page.getByPlaceholder(/Start typing in Markdown…|开始用 Markdown 写作…/);
  await expect(textarea2).toBeVisible();
  const restored = await textarea2.inputValue();
  expect(restored).toContain(unique);

  await expect(second.page.getByText(/Saved|已保存/, { exact: true })).toBeVisible({ timeout: 15_000 });

  const docPath = path.join(userDataDir, 'documents', 'Crash.md');
  const diskContent = await readFile(docPath, 'utf8');
  expect(diskContent).toContain(unique);

  await second.electronApp.close();
});
