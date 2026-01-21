import fs from 'node:fs';
import { mkdtemp, readFile } from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';

import AdmZip from 'adm-zip';
import { expect, test, _electron as electron } from '@playwright/test';

test('Sprint 4: export, publish, i18n, and update UX', async () => {
  const userDataDir = await mkdtemp(path.join(os.tmpdir(), 'writenow-e2e-'));

  const launchEnv = {
    ...process.env,
    WN_E2E: '1',
    WN_OPEN_DEVTOOLS: '0',
    WN_USER_DATA_DIR: userDataDir,
  };

  const electronApp = await electron.launch({ args: ['.'], env: launchEnv });
  const page = await electronApp.firstWindow();

  await expect(page.getByText('WriteNow')).toBeVisible();

  await page.locator('button[title="新建文件"]').click();
  await page.getByPlaceholder('未命名').fill('Sprint4');
  await page.getByPlaceholder('未命名').press('Enter');

  await expect(page.getByTestId('layout-sidebar').getByRole('button', { name: /^Sprint4\.md/ })).toBeVisible();

  const markdown = `# E2E Sprint4

Hello **bold**

- item 1
- item 2
`;

  await page.getByPlaceholder('开始用 Markdown 写作…').fill(markdown);
  await expect(page.getByText('已保存', { exact: true })).toBeVisible({ timeout: 15_000 });

  const mdPath = path.join(userDataDir, 'exports', 'Sprint4.md');
  await page.getByRole('button', { name: '文件', exact: true }).click();
  await page.getByRole('button', { name: '导出 Markdown' }).click();
  await expect.poll(() => fs.existsSync(mdPath)).toBe(true);
  expect(await readFile(mdPath, 'utf8')).toBe(markdown);

  const docxPath = path.join(userDataDir, 'exports', 'Sprint4.docx');
  await page.getByRole('button', { name: '文件', exact: true }).click();
  await page.getByRole('button', { name: '导出 Word' }).click();
  await expect.poll(() => fs.existsSync(docxPath)).toBe(true);

  const zip = new AdmZip(docxPath);
  const entryNames = zip.getEntries().map((e) => e.entryName);
  expect(entryNames).toContain('word/document.xml');
  const documentXml = zip.readAsText('word/document.xml');
  expect(documentXml).toContain('E2E Sprint4');
  expect(documentXml).toContain('Hello');
  expect(documentXml).toContain('bold');

  const pdfPath = path.join(userDataDir, 'exports', 'Sprint4.pdf');
  await page.getByRole('button', { name: '文件', exact: true }).click();
  await page.getByRole('button', { name: '导出 PDF' }).click();
  await expect.poll(() => fs.existsSync(pdfPath)).toBe(true);
  const pdfBuffer = await readFile(pdfPath);
  expect(pdfBuffer.subarray(0, 4).toString('utf8')).toBe('%PDF');

  await page.locator('button[title="发布平台"]').click();
  await expect(page.getByRole('button', { name: '复制用于 微信公众号' })).toBeVisible();
  await page.getByRole('button', { name: '复制用于 微信公众号' }).click();

  const clipboardHtml = await electronApp.evaluate(({ clipboard }) => clipboard.readHTML());
  expect(clipboardHtml).toContain('<h1>');
  expect(clipboardHtml).toContain('E2E Sprint4');

  await page.locator('button[title="设置"]').click();
  await page.getByRole('button', { name: '检查更新' }).click();
  await expect(page.getByText('开发模式无法验证更新，请打包后测试')).toBeVisible();

  await page.getByLabel('English').check();
  await expect(page.getByText('Settings')).toBeVisible();

  await electronApp.close();

  const electronApp2 = await electron.launch({ args: ['.'], env: launchEnv });
  const page2 = await electronApp2.firstWindow();
  await expect(page2.getByText('WriteNow')).toBeVisible();

  await page2.locator('button[title="Settings"]').click();
  await expect(page2.getByText('Settings')).toBeVisible();
  await electronApp2.close();
});
