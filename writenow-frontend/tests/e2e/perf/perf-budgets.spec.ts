import { mkdtemp } from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';

import { expect, test, type Page } from '@playwright/test';

import { createNewFile, escapeRegExp, isWSL, launchWriteNowApp } from '../_utils/writenow';

// CI guardrails: keep slightly higher than product budgets to reduce flake on shared runners.
const EDITOR_READY_BUDGET_MS = 400;
const FILE_OPEN_BUDGET_MS = 400;
const INPUT_LATENCY_BUDGET_MS = 120;
const AUTOSAVE_BUDGET_MS = 1800;

/**
 * Why: E2E should assert against the latest measure only, not leftovers from previous steps.
 */
async function resetPerfMeasures(page: Page): Promise<void> {
  await page.evaluate(() => {
    const bridge = (window as unknown as { __WN_PERF__?: { measures: Record<string, number> } }).__WN_PERF__;
    if (bridge) {
      bridge.measures = {};
    }
  });
}

/**
 * Why: Perf measures are async; wait until the bridge reports a numeric value.
 */
async function waitForPerfMeasure(page: Page, name: string): Promise<number> {
  await page.waitForFunction(
    (measureName) => {
      const measures = (window as unknown as { __WN_PERF__?: { measures: Record<string, number> } }).__WN_PERF__?.measures;
      const value = measures?.[measureName as keyof typeof measures];
      return typeof value === 'number' && value >= 0;
    },
    name,
    { timeout: 30_000 },
  );

  const value = await page.evaluate(
    (measureName) =>
      (window as unknown as { __WN_PERF__?: { measures: Record<string, number> } }).__WN_PERF__?.measures?.[
        measureName as keyof Record<string, number>
      ] ?? null,
    name,
  );

  if (typeof value !== 'number') {
    throw new Error(`Perf measure ${name} not found`);
  }

  return value;
}

test.describe('write mode perf budgets', () => {
  test.skip(isWSL(), 'Electron E2E is unstable on WSL; run on native Linux (xvfb) or macOS/Windows.');

  test('perf budgets: editor ready, file open, input latency, autosave', async () => {
    const userDataDir = await mkdtemp(path.join(os.tmpdir(), 'writenow-e2e-perf-'));

    const docA = `PerfA-${Date.now()}`;
    const docB = `PerfB-${Date.now()}`;

    const app = await launchWriteNowApp({ userDataDir });
    try {
      const { page } = app;

      await createNewFile(page, docA);
      await page.waitForFunction(
        () => Boolean((window as unknown as { __WN_PERF__?: { measures: Record<string, number> } }).__WN_PERF__),
        {},
        { timeout: 30_000 },
      );

      const editorReady = await waitForPerfMeasure(page, 'wm.editor.ready');
      expect(editorReady).toBeLessThan(EDITOR_READY_BUDGET_MS);

      await createNewFile(page, docB);

      await resetPerfMeasures(page);
      const entryA = page
        .getByTestId('layout-sidebar')
        .getByRole('treeitem', { name: new RegExp(`^${escapeRegExp(docA)}\\.md$`) });
      await entryA.click();
      await expect(page.getByTestId('wm-header')).toContainText(`${docA}.md`, { timeout: 30_000 });

      const fileOpen = await waitForPerfMeasure(page, 'wm.file.open');
      expect(fileOpen).toBeLessThan(FILE_OPEN_BUDGET_MS);

      await resetPerfMeasures(page);
      const editor = page.getByTestId('tiptap-editor');
      await editor.click();
      await page.keyboard.type('A', { delay: 10 });
      const inputLatency = await waitForPerfMeasure(page, 'wm.input.latency');
      expect(inputLatency).toBeLessThan(INPUT_LATENCY_BUDGET_MS);

      await resetPerfMeasures(page);
      await page.keyboard.type(` PERF_${Date.now()}`, { delay: 10 });
      await expect(page.getByTestId('statusbar-save')).toContainText('已保存', { timeout: 30_000 });

      const autosave = await waitForPerfMeasure(page, 'wm.save.autosave');
      expect(autosave).toBeLessThan(AUTOSAVE_BUDGET_MS);
    } finally {
      await app.electronApp.close();
    }
  });
});
