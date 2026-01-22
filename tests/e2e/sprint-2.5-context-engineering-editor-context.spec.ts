import { mkdtemp } from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';

import { expect, test, _electron as electron, type Page } from '@playwright/test';

type IpcErr = { ok: false; error: { code: string; message: string; details?: unknown } };
type IpcOk<T> = { ok: true; data: T };
type IpcResponse<T> = IpcOk<T> | IpcErr;

type EditorContextSnapshot = {
  config: { debounceMs: number; windowParagraphs: number };
  context: {
    selectedText: string | null;
    cursorLine: number;
    cursorColumn: number;
    currentParagraph: string;
    surroundingParagraphs: { before: string[]; after: string[] };
    detectedEntities: string[];
  } | null;
  entityHits: Array<{ entity: string; kind: string; ruleId: string; source: string }>;
  settingsPrefetch: { status: string; entities: string[]; resolved: { characters: string[]; settings: string[] } };
  syncError: string | null;
  lastSyncedAtMs: number | null;
};

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

async function getEditorContext(page: Page): Promise<EditorContextSnapshot> {
  return page.evaluate(() => {
    type DebugApi = { getEditorContext?: () => unknown };
    const w = window as unknown as { __WN_E2E__?: DebugApi };
    if (!w.__WN_E2E__?.getEditorContext) throw new Error('__WN_E2E__.getEditorContext is not ready');
    return w.__WN_E2E__.getEditorContext();
  }) as Promise<EditorContextSnapshot>;
}

test('editor context sync: selection + paragraph window updates within debounce', async () => {
  const userDataDir = await mkdtemp(path.join(os.tmpdir(), 'writenow-e2e-'));
  const { electronApp, page } = await launchApp(userDataDir);

  try {
    await waitForE2EReady(page);

    await page.getByTitle(/New file|新建文件/).click();
    const nameInput = page.getByPlaceholder(/Untitled|未命名/);
    await nameInput.fill('Context Sync');
    await nameInput.press('Enter');
    await expect(page.getByTestId('layout-sidebar').getByRole('button', { name: /^Context Sync\.md/ })).toBeVisible();

    await page.getByPlaceholder(/Start typing in Markdown…|开始用 Markdown 写作…/).fill('');

    await page.getByRole('button', { name: /Rich Text|富文本/ }).click();
    const editor = page.locator('.ProseMirror');
    await expect(editor).toBeVisible();
    await editor.click();

    await page.keyboard.type('第一段内容');
    await page.keyboard.press('Enter');
    await page.keyboard.type('第二段内容');
    await page.keyboard.press('Enter');
    await page.keyboard.type('第三段内容');

    await page.keyboard.press('Control+A');

    await page.waitForFunction(
      () => {
        type DebugApi = { getEditorContext?: () => { context?: { selectedText?: string | null } | null } };
        const w = window as unknown as { __WN_E2E__?: DebugApi };
        const ctx = w.__WN_E2E__?.getEditorContext?.().context;
        return Boolean(ctx?.selectedText && ctx.selectedText.includes('第一段内容') && ctx.selectedText.includes('第三段内容'));
      },
      {},
      { timeout: 5_000 },
    );

    const p2 = page.locator('.ProseMirror p').nth(1);
    await expect(p2).toContainText('第二段内容');
    await p2.click();

    await page.waitForFunction(
      () => {
        type DebugApi = { getEditorContext?: () => { context?: { currentParagraph?: string; cursorLine?: number } | null } };
        const w = window as unknown as { __WN_E2E__?: DebugApi };
        const ctx = w.__WN_E2E__?.getEditorContext?.().context;
        return ctx?.currentParagraph === '第二段内容' && ctx?.cursorLine === 2;
      },
      {},
      { timeout: 5_000 },
    );

    const snapshot = await getEditorContext(page);
    expect(snapshot.syncError).toBeNull();
    expect(snapshot.context?.selectedText).toBeNull();
    expect(snapshot.context?.cursorLine).toBe(2);
    expect(snapshot.context?.currentParagraph).toBe('第二段内容');
    expect(snapshot.context?.surroundingParagraphs.before).toEqual(['第一段内容']);
    expect(snapshot.context?.surroundingParagraphs.after).toEqual(['第三段内容']);

    const project = await invoke<{ projectId: string | null }>(page, 'project:getCurrent', {});
    expect(project.ok).toBe(true);
  } finally {
    await electronApp.close().catch(() => undefined);
  }
});
