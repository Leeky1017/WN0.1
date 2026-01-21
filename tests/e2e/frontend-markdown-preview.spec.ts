import { mkdtemp } from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';

import { expect, test, _electron as electron } from '@playwright/test';

test('Frontend P0: Markdown preview is full-fidelity and scroll-sync works', async () => {
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
  await page.getByPlaceholder('未命名').fill('MarkdownPreview');
  await page.getByPlaceholder('未命名').press('Enter');
  await expect(page.getByRole('button', { name: /^MarkdownPreview\.md/ })).toBeVisible();

  const longTail = Array.from({ length: 220 }, (_, i) => `Line ${i + 1}: lorem ipsum dolor sit amet.`).join('\n');

  const markdown = `# Preview

- [x] done
- [ ] todo

| a | b |
|---|---|
| 1 | 2 |

Inline math $E=mc^2$

$$
\\int_0^1 x^2 \\, dx
$$

\`\`\`ts
export const answer: number = 42;
\`\`\`

\`\`\`mermaid
flowchart LR
  A[Start] --> B{Choice}
  B -->|Yes| C[OK]
  B -->|No| D[Cancel]
\`\`\`

${longTail}
`;

  await page.getByPlaceholder('开始用 Markdown 写作…').fill(markdown);
  await expect(page.getByText('已保存', { exact: true })).toBeVisible({ timeout: 15_000 });

  await page.getByRole('button', { name: 'Preview', exact: true }).click();

  await expect(page.locator('.wn-markdown table')).toBeVisible();
  await expect(page.locator('.wn-markdown input[type="checkbox"]')).toHaveCount(2);
  await expect(page.locator('.wn-markdown .katex')).toHaveCount(2);
  await expect(page.locator('.wn-markdown .shiki')).toBeVisible({ timeout: 30_000 });
  await expect(page.locator('.wn-markdown .wn-mermaid svg')).toBeVisible({ timeout: 30_000 });

  await page.getByRole('button', { name: 'Split', exact: true }).click();

  const editorScroll = page.getByTestId('editor-scroll');
  const previewScroll = page.getByTestId('preview-scroll');

  const editorIsScrollable = await editorScroll.evaluate((el) => el.scrollHeight > el.clientHeight);
  expect(editorIsScrollable).toBe(true);

  await editorScroll.evaluate((el) => {
    el.scrollTop = (el.scrollHeight - el.clientHeight) * 0.75;
  });

  await expect.poll(async () => previewScroll.evaluate((el) => el.scrollTop)).toBeGreaterThan(0);

  const editorTopAfter = await editorScroll.evaluate((el) => el.scrollTop);
  await previewScroll.evaluate((el) => {
    el.scrollTop = (el.scrollHeight - el.clientHeight) * 0.2;
  });

  await expect.poll(async () => editorScroll.evaluate((el) => el.scrollTop)).toBeLessThan(editorTopAfter);

  await electronApp.close();
});
