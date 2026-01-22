import { mkdtemp } from 'node:fs/promises';
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

function escapeRegExp(text: string) {
  return text.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

async function openProjectManager(page: Page) {
  await page.locator('button[title="项目管理"]').first().click();
  await expect(page.getByText('项目管理')).toBeVisible();
}

async function createProject(page: Page, name: string) {
  await openProjectManager(page);
  await page.getByPlaceholder('项目名称').fill(name);
  await page.getByPlaceholder('项目名称').press('Enter');
  await expect(page.locator('button[title="项目管理"]').first()).toContainText(name);
}

async function switchToProject(page: Page, name: string) {
  await openProjectManager(page);
  const modal = page.locator('.wn-elevated').filter({ hasText: '项目管理' });
  await modal.getByRole('button', { name }).click();
  await expect(page.locator('button[title="项目管理"]').first()).toContainText(name);
}

async function createFile(page: Page, name: string) {
  await page.locator('button[title="新建文件"]').click();
  await page.getByPlaceholder('未命名').fill(name);
  await page.getByPlaceholder('未命名').press('Enter');
  await expect(
    page.getByTestId('layout-sidebar').getByRole('button', { name: new RegExp(`^${escapeRegExp(name)}\\.md`) }),
  ).toBeVisible({ timeout: 15_000 });
}

test('projects: create/switch isolates documents', async () => {
  const userDataDir = await mkdtemp(path.join(os.tmpdir(), 'writenow-e2e-'));
  const { electronApp, page } = await launchApp(userDataDir);

  try {
    await createProject(page, 'Alpha');
    await createFile(page, 'Alpha Doc');

    await createProject(page, 'Beta');
    await expect(page.getByTestId('layout-sidebar').getByRole('button', { name: /^Alpha Doc\.md/ })).toBeHidden();

    await createFile(page, 'Beta Doc');
    await expect(page.getByTestId('layout-sidebar').getByRole('button', { name: /^Beta Doc\.md/ })).toBeVisible();

    await switchToProject(page, 'Alpha');
    await expect(page.getByTestId('layout-sidebar').getByRole('button', { name: /^Alpha Doc\.md/ })).toBeVisible();
    await expect(page.getByTestId('layout-sidebar').getByRole('button', { name: /^Beta Doc\.md/ })).toBeHidden();
  } finally {
    await electronApp.close();
  }
});

test('characters: CRUD + JSON fields persist per project', async () => {
  const userDataDir = await mkdtemp(path.join(os.tmpdir(), 'writenow-e2e-'));
  const first = await launchApp(userDataDir);

  try {
    await createProject(first.page, 'Alpha');

    await first.page.locator('button[title="人物设定"]').click();
    await first.page.locator('button[title="新建人物"]').click();
    await first.page.getByPlaceholder('未命名').fill('Alice');
    await first.page.getByPlaceholder('未命名').press('Enter');
    await expect(first.page.getByRole('button', { name: /Alice/ })).toBeVisible();

    await first.page.getByPlaceholder('输入 trait 后回车').fill('冷静');
    await first.page.getByPlaceholder('输入 trait 后回车').press('Enter');

    await first.page.getByRole('button', { name: '添加', exact: true }).click();
    await first.page.getByPlaceholder('对象（如：李四）').fill('Bob');
    await first.page.getByPlaceholder('关系类型').fill('朋友');
    await first.page.getByPlaceholder('备注（可选）').fill('相识于第一章');

    await first.page.getByRole('button', { name: '保存', exact: true }).click();
    await expect(first.page.getByText('已保存', { exact: true })).toBeVisible();

    await createProject(first.page, 'Beta');
    await first.page.locator('button[title="人物设定"]').click();
    await expect(first.page.getByRole('button', { name: /Alice/ })).toBeHidden();

    await switchToProject(first.page, 'Alpha');
    await first.page.locator('button[title="人物设定"]').click();
    await first.page.getByRole('button', { name: /Alice/ }).click();
    await expect(first.page.getByText('冷静')).toBeVisible();
    await expect(first.page.getByPlaceholder('对象（如：李四）')).toHaveValue('Bob');
    await expect(first.page.getByPlaceholder('备注（可选）')).toHaveValue('相识于第一章');
  } finally {
    await first.electronApp.close();
  }

  const second = await launchApp(userDataDir);
  try {
    await second.page.locator('button[title="人物设定"]').click();
    await second.page.getByRole('button', { name: /Alice/ }).click();
    await expect(second.page.getByText('冷静')).toBeVisible();
    await expect(second.page.getByPlaceholder('备注（可选）')).toHaveValue('相识于第一章');
  } finally {
    await second.electronApp.close();
  }
});

test('outline: edit persists and node click locates editor', async () => {
  const userDataDir = await mkdtemp(path.join(os.tmpdir(), 'writenow-e2e-'));
  const first = await launchApp(userDataDir);

  try {
    await createProject(first.page, 'Alpha');
    await createFile(first.page, 'Outline Doc');

    const textarea = first.page.locator('textarea[placeholder="开始用 Markdown 写作…"]');
    await textarea.fill('# 第一章\n## 小节A\n# 第二章\n');

    await first.page.locator('button[title="文档大纲"]').click();
    await expect(first.page.getByTestId('outline-node-title-0')).toHaveValue('第一章');
    await expect(first.page.getByTestId('outline-node-title-1')).toHaveValue('小节A');

    await first.page.getByTestId('outline-node-title-2').fill('第二章（改）');
    await first.page.locator('button[title="保存大纲"]').click();

    await first.page.getByTestId('outline-node-1').click();

    const jump = await first.page.evaluate(() => {
      const textarea = document.querySelector('textarea[placeholder="开始用 Markdown 写作…"]') as HTMLTextAreaElement | null;
      if (!textarea) return null;
      return { selectionStart: textarea.selectionStart, value: textarea.value };
    });
    expect(jump).not.toBeNull();
    if (jump) {
      expect(jump.selectionStart).toBe(jump.value.indexOf('## 小节A'));
    }
  } finally {
    await first.electronApp.close();
  }

  const second = await launchApp(userDataDir);
  try {
    await second.page.getByTestId('layout-sidebar').getByRole('button', { name: /^Outline Doc\.md/ }).click();
    await second.page.locator('button[title="文档大纲"]').click();
    await expect(second.page.getByTestId('outline-node-title-2')).toHaveValue('第二章（改）');
  } finally {
    await second.electronApp.close();
  }
});

test('knowledge graph: nodes/edges CRUD persists', async () => {
  test.setTimeout(60_000);
  const userDataDir = await mkdtemp(path.join(os.tmpdir(), 'writenow-e2e-'));
  const first = await launchApp(userDataDir);

  try {
    await createProject(first.page, 'Alpha');
    await first.page.locator('button[title="知识图谱"]').click();

    await first.page.locator('button[title="新增节点"]').click();
    await first.page.getByPlaceholder('节点名称').fill('Alice');
    await first.page.getByRole('button', { name: '创建', exact: true }).click();
    await expect(first.page.getByText('新增节点', { exact: true })).toBeHidden({ timeout: 15_000 });

    await first.page.locator('button[title="新增节点"]').click();
    await first.page.getByPlaceholder('节点名称').fill('Bob');
    await first.page.getByRole('button', { name: '创建', exact: true }).click();
    await expect(first.page.getByText('新增节点', { exact: true })).toBeHidden({ timeout: 15_000 });

    await first.page.locator('button[title="新增关系"]').click();
    await first.page.getByRole('combobox', { name: /From|从/ }).selectOption({ label: 'Alice' });
    await first.page.getByRole('combobox', { name: /To|到/ }).selectOption({ label: 'Bob' });
    await first.page.getByPlaceholder('关系类型').fill('朋友');
    await first.page.getByRole('button', { name: '创建', exact: true }).click();
    await expect(first.page.getByText('新增关系', { exact: true })).toBeHidden({ timeout: 15_000 });

    const current = await invoke<{ projectId: string | null }>(first.page, 'project:getCurrent', {});
    expect(current.ok).toBe(true);
    if (!current.ok || !current.data.projectId) throw new Error('project:getCurrent failed');

    const graph = await invoke<{ entities: unknown[]; relations: unknown[] }>(first.page, 'kg:graph:get', { projectId: current.data.projectId });
    expect(graph.ok).toBe(true);
    if (graph.ok) {
      expect(graph.data.entities.length).toBeGreaterThanOrEqual(2);
      expect(graph.data.relations.length).toBeGreaterThanOrEqual(1);
    }
  } finally {
    await first.electronApp.close();
  }

  const second = await launchApp(userDataDir);
  try {
    const current = await invoke<{ projectId: string | null }>(second.page, 'project:getCurrent', {});
    expect(current.ok).toBe(true);
    if (!current.ok || !current.data.projectId) throw new Error('project:getCurrent failed');

    const graph = await invoke<{ entities: unknown[]; relations: unknown[] }>(second.page, 'kg:graph:get', { projectId: current.data.projectId });
    expect(graph.ok).toBe(true);
    if (graph.ok) {
      expect(graph.data.entities.length).toBeGreaterThanOrEqual(2);
      expect(graph.data.relations.length).toBeGreaterThanOrEqual(1);
    }
  } finally {
    await second.electronApp.close();
  }
});
