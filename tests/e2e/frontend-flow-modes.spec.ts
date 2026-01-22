import { mkdtemp } from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';

import { expect, test, _electron as electron, type Page } from '@playwright/test';

type FlowPreferences = {
  typewriterEnabled: boolean;
  typewriterTolerancePx: number;
  paragraphFocusEnabled: boolean;
  paragraphFocusDimOpacity: number;
  zenEnabled: boolean;
};

type PersistedPreferencesV1 = {
  version: 1;
  flow: FlowPreferences;
};

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === 'object';
}

function asBoolean(value: unknown): boolean {
  return value === true;
}

function asNumber(value: unknown): number | null {
  return typeof value === 'number' && Number.isFinite(value) ? value : null;
}

function parsePersistedPreferences(raw: string | null): PersistedPreferencesV1 | null {
  if (!raw) return null;
  let parsed: unknown;
  try {
    parsed = JSON.parse(raw);
  } catch {
    return null;
  }

  if (!isRecord(parsed)) return null;
  if (parsed.version !== 1) return null;

  const flowRaw = parsed.flow;
  if (!isRecord(flowRaw)) return null;

  const tolerance = asNumber(flowRaw.typewriterTolerancePx);
  const dimOpacity = asNumber(flowRaw.paragraphFocusDimOpacity);
  if (tolerance === null || dimOpacity === null) return null;

  return {
    version: 1,
    flow: {
      typewriterEnabled: asBoolean(flowRaw.typewriterEnabled),
      typewriterTolerancePx: tolerance,
      paragraphFocusEnabled: asBoolean(flowRaw.paragraphFocusEnabled),
      paragraphFocusDimOpacity: dimOpacity,
      zenEnabled: asBoolean(flowRaw.zenEnabled),
    },
  };
}

async function launchApp(userDataDir: string) {
  const env = {
    ...process.env,
    WN_E2E: '1',
    WN_OPEN_DEVTOOLS: '0',
    WN_USER_DATA_DIR: userDataDir,
  };

  const electronApp = await electron.launch({ args: ['.'], env });
  const page = await electronApp.firstWindow();
  await expect(page.getByText('WriteNow')).toBeVisible();

  return { electronApp, page };
}

async function createFile(page: Page, name: string) {
  await page.getByTitle(/New file|新建文件/).click();
  const nameInput = page.getByPlaceholder(/Untitled|未命名/);
  await nameInput.fill(name);
  await nameInput.press('Enter');
  await expect(page.getByTestId('layout-sidebar').getByRole('button', { name: new RegExp(`^${name}\\.md`) })).toBeVisible();
}

async function readFlowPreferences(page: Page): Promise<FlowPreferences | null> {
  const raw = await page.evaluate(() => localStorage.getItem('WN_PREFERENCES_V1'));
  const parsed = parsePersistedPreferences(raw);
  return parsed?.flow ?? null;
}

async function moveMouseToViewportCenter(page: Page) {
  const pos = await page.evaluate(() => ({
    x: Math.max(1, Math.floor(window.innerWidth / 2)),
    y: Math.max(1, Math.floor(window.innerHeight / 2)),
  }));
  await page.mouse.move(pos.x, pos.y);
}

test('P2-003: flow modes toggle + persist (typewriter/focus/zen)', async () => {
  test.setTimeout(60_000);
  const userDataDir = await mkdtemp(path.join(os.tmpdir(), 'writenow-e2e-'));

  const first = await launchApp(userDataDir);
  await createFile(first.page, 'Flow');

  await first.page.getByTestId('flow-menu').click();
  await first.page.getByTestId('toggle-typewriter').click();
  await first.page.getByTestId('flow-menu').click();
  await first.page.getByTestId('toggle-paragraph-focus').click();

  const prefsAfterEnable = await readFlowPreferences(first.page);
  expect(prefsAfterEnable).not.toBeNull();
  expect(prefsAfterEnable?.typewriterEnabled).toBe(true);
  expect(prefsAfterEnable?.paragraphFocusEnabled).toBe(true);

  await first.page.getByTestId('flow-menu').click();
  await first.page.getByTestId('toggle-zen').click();

  await moveMouseToViewportCenter(first.page);

  await expect(first.page.getByTestId('editor-tabbar')).toHaveCount(0);
  await expect(first.page.getByTestId('layout-sidebar')).toHaveCount(0);
  await expect(first.page.getByTestId('statusbar')).toHaveCount(0);
  await expect(first.page.locator('body')).toHaveAttribute('data-wn-zen', 'true');

  await first.page.keyboard.press('Escape');
  await expect(first.page.getByTestId('editor-tabbar')).toBeVisible();
  await expect(first.page.getByTestId('layout-sidebar')).toBeVisible();

  await first.page.getByTestId('flow-menu').click();
  await first.page.getByTestId('toggle-zen').click();
  await moveMouseToViewportCenter(first.page);
  await expect(first.page.locator('body')).toHaveAttribute('data-wn-zen', 'true');

  await first.electronApp.close();

  const second = await launchApp(userDataDir);
  await expect(second.page.locator('body')).toHaveAttribute('data-wn-zen', 'true');
  await moveMouseToViewportCenter(second.page);
  await expect(second.page.getByTestId('editor-tabbar')).toHaveCount(0);

  const prefsAfterRestart = await readFlowPreferences(second.page);
  expect(prefsAfterRestart).not.toBeNull();
  expect(prefsAfterRestart?.typewriterEnabled).toBe(true);
  expect(prefsAfterRestart?.paragraphFocusEnabled).toBe(true);
  expect(prefsAfterRestart?.zenEnabled).toBe(true);

  await second.page.keyboard.press('Escape');
  await expect(second.page.getByTestId('editor-tabbar')).toBeVisible();

  await second.page.getByRole('button', { name: /^(Rich Text|富文本)$/, exact: true }).click();
  await expect(second.page.locator('.ProseMirror.wn-focus-mode')).toBeVisible();

  await second.electronApp.close();
});
