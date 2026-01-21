import fs from 'node:fs';
import { mkdtemp, readFile } from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';

import Database from 'better-sqlite3-node';
import { expect, test, _electron as electron, type Page } from '@playwright/test';

const E2E_AI_API_KEY = typeof process.env.WN_E2E_AI_API_KEY === 'string' ? process.env.WN_E2E_AI_API_KEY.trim() : '';
const E2E_AI_BASE_URL = typeof process.env.WN_E2E_AI_BASE_URL === 'string' ? process.env.WN_E2E_AI_BASE_URL.trim() : '';

async function launchApp(userDataDir: string, extraEnv: Record<string, string> = {}) {
  const electronApp = await electron.launch({
    args: ['.'],
    env: {
      ...process.env,
      WN_E2E: '1',
      WN_OPEN_DEVTOOLS: '0',
      WN_USER_DATA_DIR: userDataDir,
      WN_AI_API_KEY: E2E_AI_API_KEY,
      ...(E2E_AI_BASE_URL ? { WN_AI_BASE_URL: E2E_AI_BASE_URL } : {}),
      WN_AI_MODEL: 'claude-3-5-sonnet-latest',
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
  await page.locator('button[title="新建文件"]').click();
  await page.getByPlaceholder('未命名').fill(name);
  await page.getByPlaceholder('未命名').press('Enter');
  await expect(page.getByRole('button', { name: new RegExp(`^${escapeRegExp(name)}\\.md`) })).toBeVisible();
}

async function setTextareaSelection(page: Page, start: number, end: number) {
  await page.locator('textarea[placeholder="开始用 Markdown 写作…"]').evaluate(
    (el, arg) => {
      const input = arg as { start: number; end: number };
      el.focus();
      el.setSelectionRange(input.start, input.end);
      el.dispatchEvent(new Event('select', { bubbles: true }));
    },
    { start, end }
  );
}

test.describe('Sprint 2 (AI) user flow', () => {
  test.skip(!E2E_AI_API_KEY, 'WN_E2E_AI_API_KEY is required to run Sprint 2 AI E2E');
  test.setTimeout(10 * 60_000);

  test('constraints persist; violations are visible in diff', async () => {
    const userDataDir = await mkdtemp(path.join(os.tmpdir(), 'writenow-e2e-'));
    const { electronApp, page } = await launchApp(userDataDir);

    try {
      await createFile(page, 'Sprint2 Judge');

      const textarea = page.locator('textarea[placeholder="开始用 Markdown 写作…"]');
      const original = '我我我非常非常喜欢喜欢这个故事，但表达有点重复。';
      await textarea.fill(`# Title\n\n${original}\n`);
      await expect(page.getByText('已保存', { exact: true })).toBeVisible({ timeout: 15_000 });

      await page.locator('button[title="设置"]').click();
      await expect(page.getByTestId('constraints-panel')).toBeVisible();

      await page.getByLabel('禁用词').check();
      await page.getByPlaceholder('每行一个禁用词').fill('，\n。');

      await page.getByLabel('格式约束').check();
      await page.getByTestId('constraints-save').click();
      await expect(page.getByTestId('constraints-save')).toBeDisabled({ timeout: 15_000 });

      const content = await textarea.inputValue();
      const start = content.indexOf(original);
      expect(start).toBeGreaterThanOrEqual(0);
      await setTextareaSelection(page, start, start + original.length);

      await page.getByTestId('ai-skill-builtin:polish').click();
      await expect(page.getByTestId('ai-diff')).toBeVisible();
      await expect(page.getByTestId('ai-diff-accept')).toBeVisible({ timeout: 5 * 60_000 });

      await expect(page.getByTestId('ai-diff-violations')).toBeVisible({ timeout: 30_000 });
      await expect(page.getByTestId('diff-violation-marker').first()).toBeVisible();

      await electronApp.close();

      const dbPath = path.join(userDataDir, 'data', 'writenow.db');
      expect(fs.existsSync(dbPath)).toBe(true);
      const db = new Database(dbPath);
      const row = db.prepare('SELECT value FROM settings WHERE key = ?').get('constraints.config') as { value: string } | undefined;
      db.close();

      expect(row?.value).toBeTruthy();
      const stored = JSON.parse(row?.value ?? '{}') as { global?: { rules?: Array<{ type: string; enabled: boolean }> } };
      const rules = stored.global?.rules ?? [];
      const formatRule = rules.find((r) => r.type === 'format');
      expect(formatRule?.enabled).toBe(true);
    } finally {
      await electronApp.close().catch(() => undefined);
    }
  });

  test('streaming diff is visible; accept applies change and creates ai snapshot; history rollback works', async () => {
    const userDataDir = await mkdtemp(path.join(os.tmpdir(), 'writenow-e2e-'));
    const { electronApp, page } = await launchApp(userDataDir);

    try {
      await createFile(page, 'Sprint2 AI');

      const textarea = page.locator('textarea[placeholder="开始用 Markdown 写作…"]');
      const original = '我我我非常非常喜欢喜欢这个故事，但表达有点重复。';
      await textarea.fill(`# Title\n\n${original}\n`);
      await expect(page.getByText('已保存', { exact: true })).toBeVisible({ timeout: 15_000 });

      const content = await textarea.inputValue();
      const start = content.indexOf(original);
      expect(start).toBeGreaterThanOrEqual(0);
      await setTextareaSelection(page, start, start + original.length);

      await page.getByTestId('ai-skill-builtin:polish').click();

      await expect(page.getByTestId('ai-diff')).toBeVisible();
      await expect(page.getByTestId('ai-diff-streaming')).toBeVisible();

      await page.getByTestId('ai-context-toggle').click();
      await expect(page.getByTestId('ai-context-panel')).toBeVisible();
      await expect(page.getByTestId('ai-context-prompt-hash')).toBeVisible();
      await expect(page.getByTestId('ai-context-sent-prompt-hash')).toBeVisible();
      await expect(page.getByTestId('ai-context-prompt-hash-match')).toHaveText('match');

      await expect(page.getByTestId('ai-diff-accept')).toBeVisible({ timeout: 5 * 60_000 });

      const suggestedDuring = await page.getByTestId('ai-diff-suggested').innerText();
      expect(suggestedDuring.trim().length).toBeGreaterThan(0);

      await page.getByTestId('ai-diff-accept').click();
      await expect(page.getByText('未保存', { exact: true })).toBeVisible();

      const afterApply = await textarea.inputValue();
      expect(afterApply).not.toContain(original);

      await page.getByText('ai:builtin:polish').click();
      await expect(page.getByTestId('ai-diff')).toBeVisible();

      await textarea.fill(`${afterApply}\n\nTEMP_EDIT\n`);
      await expect(page.getByText('未保存', { exact: true })).toBeVisible();

      await page.getByText('ai:builtin:polish').click();
      await page.getByTestId('ai-diff-accept').click();

      await expect(page.getByText('已保存', { exact: true })).toBeVisible({ timeout: 15_000 });
      const rolledBack = await textarea.inputValue();
      expect(rolledBack).not.toContain('TEMP_EDIT');

      await electronApp.close();

      const dbPath = path.join(userDataDir, 'data', 'writenow.db');
      expect(fs.existsSync(dbPath)).toBe(true);
      const db = new Database(dbPath);
      const rows = db
        .prepare('SELECT id, actor, article_id, content FROM article_snapshots WHERE article_id = ? AND actor = ? ORDER BY created_at DESC')
        .all('Sprint2 AI.md', 'ai') as Array<{ id: string; actor: string; article_id: string; content: string }>;
      db.close();

      expect(rows.length).toBeGreaterThanOrEqual(1);
      expect(rows[0].content.length).toBeGreaterThan(0);
    } finally {
      await electronApp.close().catch(() => undefined);
      const logPath = path.join(userDataDir, 'logs', 'main.log');
      if (fs.existsSync(logPath)) {
        const logContent = await readFile(logPath, 'utf8').catch(() => '');
        expect(logContent.length).toBeGreaterThan(0);
      }
    }
  });

  test('cancel stops generation and does not modify editor content', async () => {
    const userDataDir = await mkdtemp(path.join(os.tmpdir(), 'writenow-e2e-'));
    const { electronApp, page } = await launchApp(userDataDir);

    try {
      await createFile(page, 'Sprint2 Cancel');

      const textarea = page.locator('textarea[placeholder="开始用 Markdown 写作…"]');
      const original = '这是一段需要扩写的短句。';
      await textarea.fill(original);
      await expect(page.getByText('已保存', { exact: true })).toBeVisible({ timeout: 15_000 });

      await setTextareaSelection(page, 0, original.length);
      await page.getByTestId('ai-skill-builtin:expand').click();

      await expect(page.getByTestId('ai-diff')).toBeVisible();
      await expect(page.getByTestId('ai-diff-cancel')).toBeVisible();
      await page.getByTestId('ai-diff-cancel').click();

      await expect(page.getByTestId('ai-diff')).toBeHidden({ timeout: 15_000 });
      const after = await textarea.inputValue();
      expect(after).toBe(original);

      await electronApp.close();

      const dbPath = path.join(userDataDir, 'data', 'writenow.db');
      const db = new Database(dbPath);
      const rows = db.prepare('SELECT id FROM article_snapshots WHERE article_id = ? AND actor = ?').all('Sprint2 Cancel.md', 'ai') as Array<{ id: string }>;
      db.close();
      expect(rows.length).toBe(0);
    } finally {
      await electronApp.close().catch(() => undefined);
    }
  });
});
