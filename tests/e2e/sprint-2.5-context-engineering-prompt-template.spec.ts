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

test('prompt template: stable prefix deterministic + dynamic suffix ordered', async () => {
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

    await writeFile(path.join(ensured.data.rootPath, 'rules', 'style.md'), 'STYLE_RULES\n', 'utf8');
    await writeFile(path.join(ensured.data.rootPath, 'rules', 'terminology.json'), JSON.stringify({ terms: [] }, null, 2) + '\n', 'utf8');
    await writeFile(path.join(ensured.data.rootPath, 'rules', 'constraints.json'), JSON.stringify({ forbidden: [] }, null, 2) + '\n', 'utf8');

    await page.waitForTimeout(300);

    const run = async (userInstruction: string) =>
      page.evaluate(async (arg) => {
        const input = arg as { projectId: string; userInstruction: string };
        type DebugApi = { assembleContext?: (input: unknown) => Promise<unknown> };
        const w = window as unknown as { __WN_E2E__?: DebugApi };
        if (!w.__WN_E2E__?.assembleContext) throw new Error('__WN_E2E__.assembleContext is not ready');

        return w.__WN_E2E__.assembleContext({
          projectId: input.projectId,
          model: 'test',
          budget: {
            totalLimit: 8_000,
            layerBudgets: { rules: 3_000, settings: 3_000, retrieved: 3_000, immediate: 3_000 },
          },
          skill: {
            id: 'builtin:polish',
            name: 'Polish',
            outputConstraints: ['output only rewritten text', 'no explanations', 'no code blocks'],
            outputFormat: 'plain text',
          },
          editorContext: {
            selectedText: 'Hello',
            cursorLine: 1,
            cursorColumn: 1,
            currentParagraph: 'Hello',
            surroundingParagraphs: { before: [], after: [] },
            detectedEntities: [],
          },
          userInstruction: input.userInstruction,
        });
      }, { projectId, userInstruction }) as Promise<{ systemPrompt: string; userContent: string }>;

    const first = await run('FIRST');
    const second = await run('SECOND');

    expect(first.systemPrompt).toEqual(second.systemPrompt);
    expect(first.systemPrompt).toContain('# PromptTemplate');
    expect(first.systemPrompt).toContain('- version: 1');
    expect(first.systemPrompt).toContain('# Output');
    expect(first.systemPrompt).not.toContain('FIRST');
    expect(first.systemPrompt).not.toContain('SECOND');

    const stylePos = first.systemPrompt.indexOf('.writenow/rules/style.md');
    const termsPos = first.systemPrompt.indexOf('.writenow/rules/terminology.json');
    const constraintsPos = first.systemPrompt.indexOf('.writenow/rules/constraints.json');
    expect(stylePos).toBeGreaterThanOrEqual(0);
    expect(termsPos).toBeGreaterThanOrEqual(0);
    expect(constraintsPos).toBeGreaterThanOrEqual(0);
    expect(stylePos).toBeLessThan(termsPos);
    expect(termsPos).toBeLessThan(constraintsPos);

    const settingsPos = first.userContent.indexOf('## Settings');
    const retrievedPos = first.userContent.indexOf('## Retrieved');
    const immediatePos = first.userContent.indexOf('## Immediate');
    expect(settingsPos).toBeGreaterThanOrEqual(0);
    expect(retrievedPos).toBeGreaterThanOrEqual(0);
    expect(immediatePos).toBeGreaterThanOrEqual(0);
    expect(settingsPos).toBeLessThan(retrievedPos);
    expect(retrievedPos).toBeLessThan(immediatePos);

    expect(first.userContent).toContain('FIRST');
    expect(second.userContent).toContain('SECOND');
  } finally {
    await electronApp.close().catch(() => undefined);
  }
});

