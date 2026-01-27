import { mkdtemp, readFile } from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';

import { expect, test } from '@playwright/test';

import { createNewFile, isWSL, launchWriteNowApp } from './_utils/writenow';
import { startFakeAnthropicServer, type FakeAnthropicServer } from './_utils/fake-anthropic';

let server: FakeAnthropicServer | null = null;

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

async function ensureAiPanelReady(page: import('@playwright/test').Page): Promise<void> {
  const panel = page.getByTestId('ai-panel');
  await expect(panel).toBeVisible({ timeout: 30_000 });

  const select = page.getByLabel('Select skill');
  await expect(select).toBeEnabled({ timeout: 30_000 });
}

test.describe('write mode: Review Mode (AI diff) + boundary branches', () => {
  test.skip(isWSL(), 'Electron E2E is unstable on WSL; run on native Linux (xvfb) or macOS/Windows.');

  test.beforeAll(async () => {
    server = await startFakeAnthropicServer();
  });

  test.afterAll(async () => {
    await server?.close();
    server = null;
  });

  test('success: run → diff → accept → autosave persists', async () => {
    const userDataDir = await mkdtemp(path.join(os.tmpdir(), 'writenow-e2e-review-'));
    const { electronApp, page } = await launchWriteNowApp({ userDataDir, extraEnv: buildAiEnv() });

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

      await ensureAiPanelReady(page);
      await page.getByLabel('Select skill').selectOption('builtin:expand');
      await page.getByPlaceholder('输入指令…（Ctrl/Cmd+Enter 发送）').fill('E2E_SUCCESS');
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
      await electronApp.close().catch(() => undefined);
    }
  });

  test('canceled: cancel clears pending state and does not modify document', async () => {
    const userDataDir = await mkdtemp(path.join(os.tmpdir(), 'writenow-e2e-cancel-'));
    const { electronApp, page } = await launchWriteNowApp({ userDataDir, extraEnv: buildAiEnv() });

    try {
      const docName = `Cancel-${Date.now()}`;
      await createNewFile(page, docName);

      const editor = page.getByTestId('tiptap-editor');
      await editor.click();

      const unique = `CANCEL_${Date.now()}`;
      const original = `# ${docName}\n\n${unique}`;
      await editor.fill(original);
      await expect(page.getByTestId('statusbar-save')).toContainText('已保存', { timeout: 30_000 });

      await page.keyboard.press('Control+A');
      await ensureAiPanelReady(page);
      await page.getByLabel('Select skill').selectOption('builtin:expand');
      await page.getByPlaceholder('输入指令…（Ctrl/Cmd+Enter 发送）').fill('E2E_DELAY');
      await page.getByRole('button', { name: '发送' }).click();

      const cancelButton = page.getByRole('button', { name: '取消' });
      await expect(cancelButton).toBeVisible({ timeout: 30_000 });
      await cancelButton.click();

      // Should return to a sendable idle state (no diff, no error banner).
      await expect(page.getByTestId('wm-review-root')).toHaveCount(0);
      await expect(page.getByRole('button', { name: '发送' })).toBeVisible({ timeout: 30_000 });
      await expect(page.getByText(/^(TIMEOUT|UPSTREAM_ERROR):/)).toHaveCount(0);

      const docPath = path.join(userDataDir, 'documents', `${docName}.md`);
      const content = await readFile(docPath, 'utf8');
      expect(content).toContain(unique);
      expect(content).not.toContain('E2E_RESULT');
    } finally {
      await electronApp.close().catch(() => undefined);
    }
  });

  test('upstream error: surfaces UPSTREAM_ERROR', async () => {
    const userDataDir = await mkdtemp(path.join(os.tmpdir(), 'writenow-e2e-upstream-error-'));
    const { electronApp, page } = await launchWriteNowApp({ userDataDir, extraEnv: buildAiEnv() });

    try {
      const docName = `Upstream-${Date.now()}`;
      await createNewFile(page, docName);

      const editor = page.getByTestId('tiptap-editor');
      await editor.click();
      await editor.fill(`# ${docName}\n\nUPSTREAM_${Date.now()}`);
      await expect(page.getByTestId('statusbar-save')).toContainText('已保存', { timeout: 30_000 });

      await page.keyboard.press('Control+A');
      await ensureAiPanelReady(page);
      await page.getByLabel('Select skill').selectOption('builtin:expand');
      await page.getByPlaceholder('输入指令…（Ctrl/Cmd+Enter 发送）').fill('E2E_UPSTREAM_ERROR');
      await page.getByRole('button', { name: '发送' }).click();

      await expect(page.getByText(/^UPSTREAM_ERROR:/)).toBeVisible({ timeout: 30_000 });
      await expect(page.getByTestId('wm-review-root')).toHaveCount(0);
    } finally {
      await electronApp.close().catch(() => undefined);
    }
  });

  test('timeout: surfaces TIMEOUT', async () => {
    const userDataDir = await mkdtemp(path.join(os.tmpdir(), 'writenow-e2e-timeout-'));
    const { electronApp, page } = await launchWriteNowApp({ userDataDir, extraEnv: buildAiEnv() });

    try {
      const docName = `Timeout-${Date.now()}`;
      await createNewFile(page, docName);

      const editor = page.getByTestId('tiptap-editor');
      await editor.click();
      await editor.fill(`# ${docName}\n\nTIMEOUT_${Date.now()}`);
      await expect(page.getByTestId('statusbar-save')).toContainText('已保存', { timeout: 30_000 });

      await page.keyboard.press('Control+A');
      await ensureAiPanelReady(page);
      await page.getByLabel('Select skill').selectOption('builtin:expand');
      await page.getByPlaceholder('输入指令…（Ctrl/Cmd+Enter 发送）').fill('E2E_TIMEOUT');
      await page.getByRole('button', { name: '发送' }).click();

      await expect(page.getByText(/^TIMEOUT:/)).toBeVisible({ timeout: 30_000 });
      await expect(page.getByTestId('wm-review-root')).toHaveCount(0);
    } finally {
      await electronApp.close().catch(() => undefined);
    }
  });
});

