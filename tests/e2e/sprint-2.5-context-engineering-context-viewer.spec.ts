import { mkdtemp, writeFile } from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';

import { expect, test, _electron as electron, type Page } from '@playwright/test';

type IpcErr = { ok: false; error: { code: string; message: string; details?: unknown } };
type IpcOk<T> = { ok: true; data: T };
type IpcResponse<T> = IpcOk<T> | IpcErr;

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

async function invoke<T>(page: Page, channel: string, payload: unknown) {
  const result = await page.evaluate(
    async (arg) => {
      const input = arg as { channel: string; payload: unknown };
      const api = (window as unknown as { writenow: { invoke: (c: string, p: unknown) => Promise<unknown> } }).writenow;
      return api.invoke(input.channel, input.payload);
    },
    { channel, payload },
  );
  return result as IpcResponse<T>;
}

async function waitForE2EReady(page: Page) {
  await page.waitForFunction(() => (window as unknown as { __WN_E2E__?: { ready?: boolean } }).__WN_E2E__?.ready === true, {});
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
    { start, end },
  );
}

test('context viewer: layers + token stats + trimming evidence + redaction', async () => {
  const userDataDir = await mkdtemp(path.join(os.tmpdir(), 'writenow-e2e-'));
  const { electronApp, page } = await launchApp(userDataDir);

  try {
    await waitForE2EReady(page);

    await createFile(page, 'Context Viewer');

    const current = await invoke<{ projectId: string | null }>(page, 'project:getCurrent', {});
    expect(current.ok).toBe(true);
    if (!current.ok || !current.data.projectId) throw new Error('project:getCurrent failed');
    const projectId = current.data.projectId;

    const ensured = await invoke<{ projectId: string; rootPath: string; ensured: true }>(page, 'context:writenow:ensure', { projectId });
    expect(ensured.ok).toBe(true);
    if (!ensured.ok) throw new Error('context:writenow:ensure failed');

    await invoke(page, 'context:writenow:watch:start', { projectId });

    await writeFile(path.join(ensured.data.rootPath, 'rules', 'style.md'), 'STYLE_RULES\napiKey=sk-ant-THIS_SHOULD_BE_REDACTED\n', 'utf8');
    await writeFile(path.join(ensured.data.rootPath, 'rules', 'terminology.json'), JSON.stringify({ terms: [] }, null, 2) + '\n', 'utf8');
    await writeFile(path.join(ensured.data.rootPath, 'rules', 'constraints.json'), JSON.stringify({ forbidden: [] }, null, 2) + '\n', 'utf8');

    const hugeSettings = `${'设定'.repeat(6000)}\n`;
    await writeFile(path.join(ensured.data.rootPath, 'settings', '世界观.md'), hugeSettings, 'utf8');

    await page.waitForTimeout(400);

    const textarea = page.locator('textarea[placeholder="开始用 Markdown 写作…"]');
    const original = '这里是一段关于世界观的内容，用于触发 Settings 注入与裁剪证据。';
    await textarea.fill(`# Title\n\n${original}\n`);

    const content = await textarea.inputValue();
    const start = content.indexOf(original);
    expect(start).toBeGreaterThanOrEqual(0);
    await setTextareaSelection(page, start, start + original.length);

    await page.waitForFunction(
      () => {
        type DebugApi = { getEditorContext?: () => { settingsPrefetch?: { status?: string; resolved?: { settings?: string[] } } } };
        const w = window as unknown as { __WN_E2E__?: DebugApi };
        const prefetch = w.__WN_E2E__?.getEditorContext?.().settingsPrefetch;
        return prefetch?.status === 'ready' && Array.isArray(prefetch.resolved?.settings) && prefetch.resolved.settings.includes('世界观.md');
      },
      {},
      { timeout: 10_000 },
    );

    await page.getByTestId('ai-skill-builtin:polish').click();
    await expect(page.getByTestId('ai-diff')).toBeVisible();

    await expect(page.getByTestId('ai-context-toggle')).toBeEnabled({ timeout: 10_000 });
    await page.getByTestId('ai-context-toggle').click();
    await expect(page.getByTestId('ai-context-panel')).toBeVisible();

    await expect(page.getByTestId('ai-context-layer-rules')).toBeVisible();
    await expect(page.getByTestId('ai-context-layer-settings')).toBeVisible();
    await expect(page.getByTestId('ai-context-layer-retrieved')).toBeVisible();
    await expect(page.getByTestId('ai-context-layer-immediate')).toBeVisible();

    await expect(page.getByTestId('ai-context-layer-settings')).toContainText('.writenow/settings/世界观.md');
    await expect(page.getByTestId('ai-context-trim')).toBeVisible();

    await expect(page.getByTestId('ai-context-panel')).toContainText('***REDACTED***');
    await expect(page.getByTestId('ai-context-panel')).not.toContainText('sk-ant-THIS_SHOULD_BE_REDACTED');
  } finally {
    await electronApp.close().catch(() => undefined);
  }
});

