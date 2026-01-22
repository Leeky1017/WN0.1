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

test('entity detection triggers settings prefetch and assembler injects prefetched settings', async () => {
  const userDataDir = await mkdtemp(path.join(os.tmpdir(), 'writenow-e2e-'));
  const { electronApp, page } = await launchApp(userDataDir);

  try {
    await waitForE2EReady(page);

    const current = await invoke<{ projectId: string | null }>(page, 'project:getCurrent', {});
    expect(current.ok).toBe(true);
    if (!current.ok || !current.data.projectId) throw new Error('project:getCurrent failed');
    const projectId = current.data.projectId;

    const ensured = await invoke<{ projectId: string; rootPath: string; ensured: true }>(page, 'context:writenow:ensure', { projectId });
    expect(ensured.ok).toBe(true);
    if (!ensured.ok) throw new Error('context:writenow:ensure failed');

    await invoke(page, 'context:writenow:watch:start', { projectId });

    await writeFile(path.join(ensured.data.rootPath, 'characters', 'Alice.md'), 'ALICE_PROFILE\n', 'utf8');

    await page.getByRole('button', { name: /Rich Text|富文本/ }).click();
    const editor = page.locator('.ProseMirror');
    await expect(editor).toBeVisible();
    await editor.click();
    await page.keyboard.press('Control+A');
    await page.keyboard.press('Backspace');
    await page.keyboard.type('Alice 走进了房间。');

    await page.waitForFunction(
      () => {
        type Snapshot = {
          context?: { detectedEntities?: string[] } | null;
          settingsPrefetch?: { status?: string; resolved?: { characters?: string[] } } | null;
        };
        type DebugApi = { getEditorContext?: () => Snapshot };
        const w = window as unknown as { __WN_E2E__?: DebugApi };
        const snap = w.__WN_E2E__?.getEditorContext?.();
        const entities = snap?.context?.detectedEntities ?? [];
        const status = snap?.settingsPrefetch?.status ?? '';
        const characters = snap?.settingsPrefetch?.resolved?.characters ?? [];
        return entities.includes('Alice') && status === 'ready' && characters.includes('Alice.md');
      },
      {},
      { timeout: 15_000 },
    );

    const assembled = await page.evaluate(async (arg) => {
      const input = arg as { projectId: string };
      type DebugApi = {
        assembleContext?: (input: unknown) => Promise<unknown>;
        getEditorContext?: () => { context?: unknown };
      };
      const w = window as unknown as { __WN_E2E__?: DebugApi };
      if (!w.__WN_E2E__?.assembleContext) throw new Error('__WN_E2E__.assembleContext is not ready');
      const ctx = w.__WN_E2E__?.getEditorContext?.().context;
      if (!ctx) throw new Error('Editor context is not ready');

      return w.__WN_E2E__.assembleContext({
        projectId: input.projectId,
        model: 'test',
        budget: {
          totalLimit: 5_000,
          layerBudgets: { rules: 1_500, settings: 1_500, retrieved: 1_500, immediate: 1_500 },
        },
        skill: { id: 'builtin:polish', name: 'Polish' },
        editorContext: ctx,
        userInstruction: '请润色。',
      });
    }, { projectId });

    const result = assembled as { userContent: string; fragments: Array<{ layer: string; source: { kind: string; path?: string } }> };
    expect(result.userContent).toContain('.writenow/characters/Alice.md');
    expect(result.userContent).toContain('ALICE_PROFILE');
    expect(result.fragments.some((f) => f.layer === 'settings' && f.source.kind === 'file' && f.source.path === '.writenow/characters/Alice.md')).toBe(true);
  } finally {
    await electronApp.close().catch(() => undefined);
  }
});
