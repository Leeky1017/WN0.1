import { mkdtemp, readFile } from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';

import { expect, test, type Page } from '@playwright/test';

import { closeWriteNowApp, createNewFile, isWSL, launchWriteNowApp } from '../_utils/writenow';
import { startFakeAnthropicServer, type FakeAnthropicServer } from '../_utils/fake-anthropic';

let server: FakeAnthropicServer | null = null;

/**
 * Why: Provide deterministic AI responses for cancel/timeout branches without external API flakiness.
 */
function buildAiEnv(): Record<string, string> {
  if (!server) {
    throw new Error('Fake Anthropic server is not ready');
  }
  return {
    WN_AI_API_KEY: 'e2e-key',
    WN_AI_BASE_URL: server.baseUrl,
    WN_AI_TIMEOUT_MS: '800',
    WN_AI_MODEL: 'claude-3-5-sonnet-latest',
  };
}

/**
 * Why: Ensure AI panel and skills are usable before issuing skill commands.
 */
async function ensureAiPanelReady(page: Page): Promise<void> {
  const panel = page.getByTestId('ai-panel');
  await expect(panel).toBeVisible({ timeout: 30_000 });

  const select = page.getByLabel('Select skill');
  await expect(select).toBeEnabled({ timeout: 30_000 });
}

test.describe('@write-mode Review Mode (AI diff) + boundary branches', () => {
  test.skip(isWSL(), 'Electron E2E is unstable on WSL; run on native Linux (xvfb) or macOS/Windows.');

  test.beforeAll(async () => {
    server = await startFakeAnthropicServer();
  });

  test.afterAll(async () => {
    await server?.close();
    server = null;
  });

  test('WM-003 success: run → diff → accept → autosave persists', async () => {
    const userDataDir = await mkdtemp(path.join(os.tmpdir(), 'writenow-e2e-review-'));
    const app = await launchWriteNowApp({ userDataDir, extraEnv: buildAiEnv() });
    const { page } = app;

    try {
      const docName = `Review-${Date.now()}`;
      await createNewFile(page, docName);

      const editor = page.getByTestId('tiptap-editor');
      await expect(editor).toBeVisible();
      await editor.click();

      const original = `# ${docName}\n\nA.\n\nE2E_${Date.now()}`;
      await page.keyboard.type(original, { delay: 10 });
      await expect(page.getByTestId('statusbar-save')).toContainText('已保存', { timeout: 30_000 });

      // Select all so Review Mode applies deterministically.
      await page.keyboard.press('Control+A');

      await ensureAiPanelReady(page);
      await page.getByLabel('Select skill').selectOption('builtin:expand');
      const prompt = page.getByPlaceholder('输入指令…（Ctrl/Cmd+Enter 发送）');
      await prompt.click();
      await page.keyboard.type('E2E_SUCCESS', { delay: 10 });
      await page.getByRole('button', { name: '发送' }).click();

      await expect(page.getByTestId('wm-review-root')).toBeVisible({ timeout: 30_000 });
      await expect(page.getByTestId('wm-review-accept')).toBeEnabled({ timeout: 30_000 });

      await page.getByTestId('wm-review-accept').click();
      await expect(page.getByTestId('wm-review-root')).toBeHidden({ timeout: 30_000 });
      await expect(page.getByTestId('statusbar-save')).toContainText('已保存', { timeout: 30_000 });

      const docPath = path.join(userDataDir, 'documents', `${docName}.md`);
      const content = await readFile(docPath, 'utf8');
      expect(content).toContain('E2E_RESULT');
      expect(content.length).toBeGreaterThan(original.length);
    } finally {
      await closeWriteNowApp(app);
    }
  });

  test('WM-004 Esc cancels run and leaves document unchanged', async () => {
    const userDataDir = await mkdtemp(path.join(os.tmpdir(), 'writenow-e2e-cancel-'));
    const app = await launchWriteNowApp({ userDataDir, extraEnv: buildAiEnv() });
    const { page } = app;

    try {
      const docName = `Cancel-${Date.now()}`;
      await createNewFile(page, docName);

      const editor = page.getByTestId('tiptap-editor');
      await editor.click();

      const unique = `CANCEL_${Date.now()}`;
      const original = `# ${docName}\n\n${unique}`;
      await page.keyboard.type(original, { delay: 10 });
      await expect(page.getByTestId('statusbar-save')).toContainText('已保存', { timeout: 30_000 });

      await page.keyboard.press('Control+A');
      await ensureAiPanelReady(page);
      await page.getByLabel('Select skill').selectOption('builtin:expand');
      const prompt = page.getByPlaceholder('输入指令…（Ctrl/Cmd+Enter 发送）');
      await prompt.click();
      await page.keyboard.type('E2E_DELAY', { delay: 10 });
      await page.getByRole('button', { name: '发送' }).click();

      const cancelButton = page.getByRole('button', { name: '取消' });
      await expect(cancelButton).toBeVisible({ timeout: 30_000 });
      await page.keyboard.press('Escape');

      // Should return to a sendable idle state (no diff, no error banner).
      await expect(page.getByTestId('wm-review-root')).toHaveCount(0);
      await expect(page.getByRole('button', { name: '发送' })).toBeVisible({ timeout: 30_000 });
      await expect(page.getByText(/^(TIMEOUT|UPSTREAM_ERROR):/)).toHaveCount(0);

      const docPath = path.join(userDataDir, 'documents', `${docName}.md`);
      const content = await readFile(docPath, 'utf8');
      expect(content).toContain(unique);
      expect(content).not.toContain('E2E_RESULT');
    } finally {
      await closeWriteNowApp(app);
    }
  });

  test('AI upstream error: surfaces UPSTREAM_ERROR', async () => {
    const userDataDir = await mkdtemp(path.join(os.tmpdir(), 'writenow-e2e-upstream-error-'));
    const app = await launchWriteNowApp({ userDataDir, extraEnv: buildAiEnv() });
    const { page } = app;

    try {
      const docName = `Upstream-${Date.now()}`;
      await createNewFile(page, docName);

      const editor = page.getByTestId('tiptap-editor');
      await editor.click();
      await page.keyboard.type(`# ${docName}\n\nUPSTREAM_${Date.now()}`, { delay: 10 });
      await expect(page.getByTestId('statusbar-save')).toContainText('已保存', { timeout: 30_000 });

      await page.keyboard.press('Control+A');
      await ensureAiPanelReady(page);
      await page.getByLabel('Select skill').selectOption('builtin:expand');
      const prompt = page.getByPlaceholder('输入指令…（Ctrl/Cmd+Enter 发送）');
      await prompt.click();
      await page.keyboard.type('E2E_UPSTREAM_ERROR', { delay: 10 });
      await page.getByRole('button', { name: '发送' }).click();

      await expect(page.getByText(/^UPSTREAM_ERROR:/)).toBeVisible({ timeout: 30_000 });
      await expect(page.getByTestId('wm-review-root')).toHaveCount(0);
    } finally {
      await closeWriteNowApp(app);
    }
  });

  test('WM-004 timeout: surfaces TIMEOUT and keeps content', async () => {
    const userDataDir = await mkdtemp(path.join(os.tmpdir(), 'writenow-e2e-timeout-'));
    const app = await launchWriteNowApp({ userDataDir, extraEnv: buildAiEnv() });
    const { page } = app;

    try {
      const docName = `Timeout-${Date.now()}`;
      await createNewFile(page, docName);

      const editor = page.getByTestId('tiptap-editor');
      await editor.click();
      await page.keyboard.type(`# ${docName}\n\nTIMEOUT_${Date.now()}`, { delay: 10 });
      await expect(page.getByTestId('statusbar-save')).toContainText('已保存', { timeout: 30_000 });

      await page.keyboard.press('Control+A');
      await ensureAiPanelReady(page);
      await page.getByLabel('Select skill').selectOption('builtin:expand');
      const prompt = page.getByPlaceholder('输入指令…（Ctrl/Cmd+Enter 发送）');
      await prompt.click();
      await page.keyboard.type('E2E_TIMEOUT', { delay: 10 });
      await page.getByRole('button', { name: '发送' }).click();

      await expect(page.getByText(/^TIMEOUT:/)).toBeVisible({ timeout: 30_000 });
      await expect(page.getByTestId('wm-review-root')).toHaveCount(0);

      const docPath = path.join(userDataDir, 'documents', `${docName}.md`);
      const content = await readFile(docPath, 'utf8');
      expect(content).toContain('TIMEOUT_');
      expect(content).not.toContain('E2E_RESULT');
    } finally {
      await closeWriteNowApp(app);
    }
  });
});
