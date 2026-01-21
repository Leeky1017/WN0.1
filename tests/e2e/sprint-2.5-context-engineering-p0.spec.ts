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

async function getProjectId(page: Page) {
  const current = await invoke<{ projectId: string | null }>(page, 'project:getCurrent', {});
  expect(current.ok).toBe(true);
  if (!current.ok || !current.data.projectId) throw new Error('project:getCurrent failed');
  return current.data.projectId;
}

test('writenow: rules load + watch refresh (no silent failure)', async () => {
  const userDataDir = await mkdtemp(path.join(os.tmpdir(), 'writenow-e2e-'));
  const { electronApp, page } = await launchApp(userDataDir);

  try {
    const projectId = await getProjectId(page);
    const ensured = await invoke<{ projectId: string; rootPath: string; ensured: true }>(page, 'context:writenow:ensure', { projectId });
    expect(ensured.ok).toBe(true);
    if (!ensured.ok) throw new Error('context:writenow:ensure failed');

    const stylePath = path.join(ensured.data.rootPath, 'rules', 'style.md');
    await writeFile(stylePath, 'STYLE_V1\n', 'utf8');

    await page.evaluate(() => {
      const w = window as unknown as { __wnEvents?: unknown[]; writenow: { on: (e: string, cb: (...args: unknown[]) => void) => void } };
      w.__wnEvents = [];
      w.writenow.on('context:writenow:changed', (payload) => {
        w.__wnEvents?.push(payload);
      });
    });

    const watch = await invoke<{ watching: true }>(page, 'context:writenow:watch:start', { projectId });
    expect(watch.ok).toBe(true);

    const rules = await invoke<{
      fragments: Array<{ kind: string; path: string; content: string }>;
      errors: Array<{ path: string; code: string }>;
    }>(page, 'context:writenow:rules:get', { projectId, refresh: true });
    expect(rules.ok).toBe(true);
    if (rules.ok) {
      const style = rules.data.fragments.find((f) => f.path === 'rules/style.md');
      expect(style?.content).toContain('STYLE_V1');
      const errorPaths = new Set(rules.data.errors.map((e) => e.path));
      expect(errorPaths.has('rules/terminology.json')).toBe(true);
      expect(errorPaths.has('rules/constraints.json')).toBe(true);
    }

    await writeFile(stylePath, 'STYLE_V2\n', 'utf8');

    await page.waitForFunction(
      () => {
        const w = window as unknown as { __wnEvents?: Array<{ changedPaths?: unknown }> };
        const events = w.__wnEvents ?? [];
        return events.some((e) => Array.isArray(e.changedPaths) && e.changedPaths.includes('rules/style.md'));
      },
      {},
      { timeout: 15_000 },
    );

    const refreshed = await invoke<{ fragments: Array<{ path: string; content: string }> }>(page, 'context:writenow:rules:get', {
      projectId,
    });
    expect(refreshed.ok).toBe(true);
    if (refreshed.ok) {
      const style = refreshed.data.fragments.find((f) => f.path === 'rules/style.md');
      expect(style?.content).toContain('STYLE_V2');
    }
  } finally {
    await electronApp.close().catch(() => undefined);
  }
});

test('context: assembler enforces layered budget and outputs KV-cache friendly prompt structure', async () => {
  const userDataDir = await mkdtemp(path.join(os.tmpdir(), 'writenow-e2e-'));
  const { electronApp, page } = await launchApp(userDataDir);

  try {
    const projectId = await getProjectId(page);
    const ensured = await invoke<{ projectId: string; rootPath: string; ensured: true }>(page, 'context:writenow:ensure', { projectId });
    expect(ensured.ok).toBe(true);
    if (!ensured.ok) throw new Error('context:writenow:ensure failed');

    await writeFile(path.join(ensured.data.rootPath, 'rules', 'style.md'), 'STYLE_RULES\n', 'utf8');
    await writeFile(path.join(ensured.data.rootPath, 'settings', 'world.md'), '设定'.repeat(800), 'utf8');

    await invoke(page, 'context:writenow:watch:start', { projectId });

    await page.waitForFunction(() => (window as unknown as { __WN_E2E__?: { ready?: boolean } }).__WN_E2E__?.ready === true, {});

    const assembled = await page.evaluate(async (arg) => {
      const input = arg as { projectId: string };
      type DebugApi = { assembleContext?: (input: unknown) => Promise<unknown> };
      const w = window as unknown as { __WN_E2E__?: DebugApi };
      if (!w.__WN_E2E__?.assembleContext) throw new Error('__WN_E2E__.assembleContext is not ready');

      return w.__WN_E2E__.assembleContext({
        projectId: input.projectId,
        model: 'test',
        budget: {
          totalLimit: 500,
          layerBudgets: { rules: 150, settings: 200, retrieved: 200, immediate: 200 },
        },
        skill: { id: 'builtin:polish', name: 'Polish' },
        editorContext: {
          selectedText: '正文'.repeat(80),
          cursorLine: 1,
          cursorColumn: 1,
          currentParagraph: '当前段落',
          surroundingParagraphs: { before: ['前文'.repeat(60)], after: ['后文'.repeat(60)] },
          detectedEntities: [],
        },
        userInstruction: '请润色选区内容。',
        settings: { settings: ['world.md'] },
        retrieved: [
          {
            id: 'retrieved-low',
            layer: 'retrieved',
            source: { kind: 'module', id: 'rag' },
            content: '检索'.repeat(500),
            priority: 1,
          },
          {
            id: 'retrieved-high',
            layer: 'retrieved',
            source: { kind: 'module', id: 'rag' },
            content: '检索'.repeat(500),
            priority: 9,
          },
        ],
      });
    }, { projectId });

    const result = assembled as {
      systemPrompt: string;
      userContent: string;
      tokenStats: { total: { used: number; limit: number } };
      budgetEvidence: { removed: Array<{ fragmentId: string; layer: string }>; compressed: Array<{ fromFragmentId: string }> } | null;
      fragments: Array<{ id: string; layer: string; required?: boolean }>;
    };

    expect(result.tokenStats.total.used).toBeLessThanOrEqual(result.tokenStats.total.limit);
    expect(result.budgetEvidence).not.toBeNull();
    expect(result.systemPrompt).toContain('# Skill');
    expect(result.systemPrompt).toContain('# Rules');
    expect(result.userContent).toContain('# Context (dynamic)');
    expect(result.systemPrompt).not.toContain('请润色选区内容。');
    expect(result.userContent).toContain('请润色选区内容。');

    const removed = new Set(result.budgetEvidence?.removed.map((r) => `${r.layer}:${r.fragmentId}`) ?? []);
    expect(removed.has('retrieved:retrieved-low')).toBe(true);

    const hasCompressedSettings = (result.budgetEvidence?.compressed ?? []).some((c) => c.fromFragmentId.startsWith('settings:'));
    expect(hasCompressedSettings).toBe(true);

    const requiredIds = new Set(result.fragments.filter((f) => f.required).map((f) => f.id));
    expect(requiredIds.has('immediate:user-instruction')).toBe(true);
  } finally {
    await electronApp.close().catch(() => undefined);
  }
});
