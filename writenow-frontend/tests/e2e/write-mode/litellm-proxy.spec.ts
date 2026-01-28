import { mkdtemp, readFile } from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';

import { expect, test, type Page } from '@playwright/test';

import { closeWriteNowApp, createNewFile, isWSL, launchWriteNowApp } from '../_utils/writenow';
import { startFakeLiteLlmServer, type FakeLiteLlmServer } from '../_utils/fake-litellm';

let server: FakeLiteLlmServer | null = null;

/**
 * Why: Deterministic OpenAI-compatible responses without external services.
 */
function buildProxyEnv(): Record<string, string> {
  if (!server) throw new Error('Fake LiteLLM server is not ready');
  return {
    WN_AI_PROXY_ENABLED: '1',
    WN_AI_PROXY_BASE_URL: server.baseUrl,
    // Intentionally empty so the test fails if the backend accidentally uses direct provider SDK.
    WN_AI_API_KEY: '',
    WN_AI_TIMEOUT_MS: '5000',
  };
}

async function ensureAiPanelReady(page: Page): Promise<void> {
  const panel = page.getByTestId('ai-panel');
  await expect(panel).toBeVisible({ timeout: 30_000 });

  const select = page.getByLabel('Select skill');
  await expect(select).toBeEnabled({ timeout: 30_000 });
}

test.describe('@write-mode LiteLLM Proxy (optional transport)', () => {
  test.skip(isWSL(), 'Electron E2E is unstable on WSL; run on native Linux (xvfb) or macOS/Windows.');

  test.beforeAll(async () => {
    server = await startFakeLiteLlmServer();
  });

  test.afterAll(async () => {
    await server?.close();
    server = null;
  });

  test('P3-001 success: proxy enabled → AI diff works → accept persists', async () => {
    const userDataDir = await mkdtemp(path.join(os.tmpdir(), 'writenow-e2e-litellm-'));
    const app = await launchWriteNowApp({ userDataDir, extraEnv: buildProxyEnv() });
    const { page } = app;

    try {
      const docName = `LiteLLM-${Date.now()}`;
      await createNewFile(page, docName);

      const editor = page.getByTestId('tiptap-editor');
      await expect(editor).toBeVisible();
      await editor.click();

      const original = `# ${docName}\n\nE2E_${Date.now()}`;
      await page.keyboard.type(original, { delay: 10 });
      await expect(page.getByTestId('statusbar-save')).toContainText('已保存', { timeout: 30_000 });

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

  test('P3-001 error: proxy enabled without baseUrl surfaces INVALID_ARGUMENT', async () => {
    const userDataDir = await mkdtemp(path.join(os.tmpdir(), 'writenow-e2e-litellm-missing-url-'));
    const app = await launchWriteNowApp({
      userDataDir,
      extraEnv: {
        WN_AI_PROXY_ENABLED: '1',
        WN_AI_PROXY_BASE_URL: '',
        WN_AI_API_KEY: '',
      },
    });
    const { page } = app;

    try {
      const docName = `LiteLLM-MissingUrl-${Date.now()}`;
      await createNewFile(page, docName);

      const editor = page.getByTestId('tiptap-editor');
      await expect(editor).toBeVisible();
      await editor.click();
      await page.keyboard.type(`# ${docName}\n\nE2E_${Date.now()}`, { delay: 10 });
      await page.keyboard.press('Control+A');

      await ensureAiPanelReady(page);
      await page.getByLabel('Select skill').selectOption('builtin:expand');
      const prompt = page.getByPlaceholder('输入指令…（Ctrl/Cmd+Enter 发送）');
      await prompt.click();
      await page.keyboard.type('E2E_SUCCESS', { delay: 10 });
      await page.getByRole('button', { name: '发送' }).click();

      await expect(page.getByText(/INVALID_ARGUMENT:\s*AI proxy baseUrl is not configured/i)).toBeVisible({ timeout: 30_000 });
      await expect(page.getByTestId('wm-review-root')).toHaveCount(0);
    } finally {
      await closeWriteNowApp(app);
    }
  });
});

