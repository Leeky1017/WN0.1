import { mkdtemp } from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';

import { expect, test, type Page } from '@playwright/test';

import type {
  AiSkillRunRequest,
  CharacterCreateResponse,
  ContextWritenowSettingsListResponse,
  ContextWritenowSettingsReadResponse,
  IpcResponse,
  ProjectBootstrapResponse,
} from '../../../src/types/ipc-generated';
import { closeWriteNowApp, isWSL, launchWriteNowApp } from '../_utils/writenow';

type WnE2eBridge = {
  invoke: (channel: string, payload: unknown) => Promise<IpcResponse<unknown>>;
  assembleForSkill: (args: {
    skillId: string;
    text: string;
    instruction?: string;
    projectId?: string;
    articleId?: string;
  }) => Promise<IpcResponse<AiSkillRunRequest>>;
};

async function waitForE2EBridge(page: Page): Promise<void> {
  await page.waitForFunction(() => Boolean((window as unknown as { __WN_E2E__?: unknown }).__WN_E2E__), {}, { timeout: 30_000 });
}

async function e2eInvoke<T>(page: Page, channel: string, payload: unknown): Promise<IpcResponse<T>> {
  return (await page.evaluate(async ({ c, p }) => {
    const bridge = (window as unknown as { __WN_E2E__?: WnE2eBridge }).__WN_E2E__;
    if (!bridge) throw new Error('WN_E2E bridge is not installed');
    return await bridge.invoke(c, p);
  }, { c: channel, p: payload })) as IpcResponse<T>;
}

async function e2eAssembleForSkill(
  page: Page,
  args: { skillId: string; text: string; instruction?: string; projectId?: string; articleId?: string },
): Promise<IpcResponse<AiSkillRunRequest>> {
  return (await page.evaluate(async (input) => {
    const bridge = (window as unknown as { __WN_E2E__?: WnE2eBridge }).__WN_E2E__;
    if (!bridge) throw new Error('WN_E2E bridge is not installed');
    return await bridge.assembleForSkill(input);
  }, args)) as IpcResponse<AiSkillRunRequest>;
}

test.describe('@write-mode ai-memory P2-002 file-based settings', () => {
  test.skip(isWSL(), 'Electron E2E is unstable on WSL; run on native Linux (xvfb) or macOS/Windows.');

  test('P2-002: characters are loaded on-demand and refs are project-relative', async () => {
    const userDataDir = await mkdtemp(path.join(os.tmpdir(), 'writenow-e2e-p2-002-'));

    const app = await launchWriteNowApp({ userDataDir });
    try {
      const { page } = app;
      await waitForE2EBridge(page);

      const bootstrap = await e2eInvoke<ProjectBootstrapResponse>(page, 'project:bootstrap', {});
      expect(bootstrap.ok).toBeTruthy();
      if (!bootstrap.ok) throw new Error(bootstrap.error.message);
      const projectId = bootstrap.data.currentProjectId;

      const create = await e2eInvoke<CharacterCreateResponse>(page, 'character:create', {
        projectId,
        name: '张三',
        description: '勇敢但谨慎，擅长观察。',
        traits: { personality: ['勇敢', '谨慎'], background: '来自南方小城' },
        relationships: [{ name: '李四', type: '朋友', note: '一起经历过风暴' }],
      });
      expect(create.ok).toBeTruthy();
      if (!create.ok) throw new Error(create.error.message);
      expect(create.data.character.name).toBe('张三');

      const list = await e2eInvoke<ContextWritenowSettingsListResponse>(page, 'context:writenow:settings:list', { projectId });
      expect(list.ok).toBeTruthy();
      if (!list.ok) throw new Error(list.error.message);
      expect(list.data.characters).toContain('张三.md');

      const read = await e2eInvoke<ContextWritenowSettingsReadResponse>(page, 'context:writenow:settings:read', {
        projectId,
        characters: ['张三.md', '不存在.md'],
      });
      expect(read.ok).toBeTruthy();
      if (!read.ok) throw new Error(read.error.message);

      const zhangsan = read.data.files.find((f) => f.path.endsWith('characters/张三.md'));
      expect(zhangsan?.content).toContain('writenow:character-card:v1');
      expect(zhangsan?.path).not.toContain(userDataDir);
      expect(read.data.errors.some((e) => e.code === 'NOT_FOUND' && e.path.endsWith('characters/不存在.md'))).toBeTruthy();

      const assembledNoChars = await e2eAssembleForSkill(page, {
        skillId: 'builtin:polish',
        text: '这是一段需要润色的测试文本。',
        instruction: '',
        projectId,
        articleId: 'e2e.md',
      });
      expect(assembledNoChars.ok).toBeTruthy();
      if (!assembledNoChars.ok) throw new Error(assembledNoChars.error.message);
      expect(assembledNoChars.data.injected?.refs ?? []).not.toContain('.writenow/characters/张三.md');

      const assembledWithChars = await e2eAssembleForSkill(page, {
        skillId: 'builtin:expand',
        text: '这是一段需要扩写的测试文本。',
        instruction: '',
        projectId,
        articleId: 'e2e.md',
      });
      expect(assembledWithChars.ok).toBeTruthy();
      if (!assembledWithChars.ok) throw new Error(assembledWithChars.error.message);
      expect(assembledWithChars.data.injected?.refs ?? []).toContain('.writenow/characters/张三.md');
    } finally {
      await closeWriteNowApp(app);
    }
  });
});

