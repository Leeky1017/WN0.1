import { mkdtemp, rm } from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';

import { expect, test, _electron as electron, type Page } from '@playwright/test';

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
    { start, end }
  );
}

test.describe('Skill System V2 (Skill Studio)', () => {
  test('create skill -> appears in list -> can trigger run', async () => {
    const userDataDir = await mkdtemp(path.join(os.tmpdir(), 'writenow-e2e-'));
    const { electronApp, page } = await launchApp(userDataDir);

    try {
      await createFile(page, 'Studio Create');
      const textarea = page.locator('textarea[placeholder="开始用 Markdown 写作…"]');
      const original = '这是一段需要改写的文本。';
      await textarea.fill(original);
      await expect(page.getByText('已保存', { exact: true })).toBeVisible({ timeout: 15_000 });

      const content = await textarea.inputValue();
      const start = content.indexOf(original);
      expect(start).toBeGreaterThanOrEqual(0);
      await setTextareaSelection(page, start, start + original.length);

      await page.getByTestId('skill-studio-new').click();
      await expect(page.getByRole('dialog')).toBeVisible();

      await page.getByLabel('Name').fill('My Studio Skill');
      await page.getByLabel('Skill ID').fill('global:my-studio-skill');
      await expect(page.getByTestId('skill-studio-save')).toBeEnabled({ timeout: 10_000 });
      await page.getByTestId('skill-studio-save').click();

      await expect(page.getByRole('dialog')).toBeHidden({ timeout: 10_000 });
      await expect(page.getByText('My Studio Skill')).toBeVisible({ timeout: 10_000 });

      const skillButton = page.getByTestId('ai-skill-global:my-studio-skill');
      await expect(skillButton).toBeVisible({ timeout: 10_000 });
      await expect(skillButton).toBeEnabled();

      await skillButton.click();
      await expect(page.getByTestId('ai-diff')).toBeVisible({ timeout: 10_000 });
    } finally {
      await electronApp.close().catch(() => undefined);
      await rm(userDataDir, { recursive: true, force: true }).catch(() => undefined);
    }
  });

  test('validation failure prevents save', async () => {
    const userDataDir = await mkdtemp(path.join(os.tmpdir(), 'writenow-e2e-'));
    const { electronApp, page } = await launchApp(userDataDir);

    try {
      await page.getByTestId('skill-studio-new').click();
      await expect(page.getByRole('dialog')).toBeVisible();

      await page.getByLabel('Name').fill('Bad Version Skill');
      await page.getByLabel('Version').fill('1.0');

      await expect(page.getByText('version must be valid SemVer')).toBeVisible({ timeout: 10_000 });
      await expect(page.getByTestId('skill-studio-save')).toBeDisabled();
    } finally {
      await electronApp.close().catch(() => undefined);
      await rm(userDataDir, { recursive: true, force: true }).catch(() => undefined);
    }
  });
});
