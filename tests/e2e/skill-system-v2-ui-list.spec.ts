import { mkdtemp, mkdir, rm, writeFile } from 'node:fs/promises';
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
  await expect(page.getByTestId(`editor-tab-${name}.md`)).toBeVisible();
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

test.describe('Skill System V2 (UI list)', () => {
  test('lists skills from IPC and persists enabled toggles', async () => {
    const userDataDir = await mkdtemp(path.join(os.tmpdir(), 'writenow-e2e-'));
    const { electronApp, page } = await launchApp(userDataDir);

    try {
      await createFile(page, 'SkillList Toggle');
      const textarea = page.locator('textarea[placeholder="开始用 Markdown 写作…"]');
      await textarea.fill('这是一段需要润色的文本。');
      await expect(page.getByText('已保存', { exact: true })).toBeVisible({ timeout: 15_000 });

      const content = await textarea.inputValue();
      const start = content.indexOf('这是一段需要润色的文本。');
      expect(start).toBeGreaterThanOrEqual(0);
      await setTextareaSelection(page, start, start + '这是一段需要润色的文本。'.length);

      const polishButton = page.getByTestId('ai-skill-builtin:polish');
      await expect(polishButton).toBeVisible();

      const polishRow = page.locator('.wn-elevated', { has: polishButton }).first();
      const checkbox = polishRow.locator('input[type="checkbox"]').first();
      await expect(checkbox).toBeChecked();

      await checkbox.uncheck();
      await expect(checkbox).not.toBeChecked();
      await expect(polishButton).toBeDisabled();

      await electronApp.close();

      const relaunched = await launchApp(userDataDir);
      try {
        const reloadPolishButton = relaunched.page.getByTestId('ai-skill-builtin:polish');
        await expect(reloadPolishButton).toBeVisible();
        const reloadRow = relaunched.page.locator('.wn-elevated', { has: reloadPolishButton }).first();
        await expect(reloadRow.locator('input[type="checkbox"]').first()).not.toBeChecked();
      } finally {
        await relaunched.electronApp.close().catch(() => undefined);
      }
    } finally {
      await electronApp.close().catch(() => undefined);
      await rm(userDataDir, { recursive: true, force: true }).catch(() => undefined);
    }
  });

  test('shows invalid skills and updates after deletion', async () => {
    const userDataDir = await mkdtemp(path.join(os.tmpdir(), 'writenow-e2e-'));
    const { electronApp, page } = await launchApp(userDataDir);

    const skillDir = path.join(userDataDir, 'skills', 'packages', 'pkg.e2e.invalid', '1.0.0', 'skills', 'bad');
    const skillPath = path.join(skillDir, 'SKILL.md');

    try {
      await mkdir(skillDir, { recursive: true });
      await writeFile(skillPath, `---\nid: global:e2e-invalid\nname: Invalid Skill\nversion: \"1.0\"\ntags: [rewrite]\nprompt: { system: \"S\", user: \"U\" }\n---\n`, 'utf8');

      const invalid = page.getByText('Invalid Skill');
      await expect(invalid).toBeVisible({ timeout: 10_000 });
      await expect(page.getByText('version must be valid SemVer')).toBeVisible({ timeout: 10_000 });

      await rm(skillPath, { force: true });
      await expect(invalid).toBeHidden({ timeout: 10_000 });
    } finally {
      await electronApp.close().catch(() => undefined);
      await rm(userDataDir, { recursive: true, force: true }).catch(() => undefined);
    }
  });
});
