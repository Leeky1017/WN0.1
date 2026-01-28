import { access, mkdtemp } from 'node:fs/promises';
import { createRequire } from 'node:module';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import { expect, test, type Page } from '@playwright/test';

import type {
  AiSkillRunRequest,
  IpcResponse,
  MemoryCreateResponse,
  MemoryDeleteResponse,
  MemoryInjectionPreviewResponse,
  MemoryListResponse,
  MemorySettingsUpdateResponse,
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

type SqliteStatement = {
  get: (...params: unknown[]) => unknown;
  all: (...params: unknown[]) => unknown[];
  run: (...params: unknown[]) => unknown;
};

type SqliteDb = {
  prepare: (sql: string) => SqliteStatement;
  close: () => void;
};

type BetterSqlite3Ctor = new (filePath: string, options?: { readonly?: boolean }) => SqliteDb;

function getBetterSqlite3Ctor(): BetterSqlite3Ctor {
  const require = createRequire(import.meta.url);
  const here = path.dirname(fileURLToPath(import.meta.url));
  const modulePath = path.resolve(here, '../../../../writenow-theia/node_modules/better-sqlite3');
  const loaded = require(modulePath) as unknown;
  if (typeof loaded !== 'function') {
    throw new Error(`better-sqlite3 not found at ${modulePath}`);
  }
  return loaded as unknown as BetterSqlite3Ctor;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === 'object' && !Array.isArray(value);
}

async function waitForFileExists(filePath: string, timeoutMs: number): Promise<void> {
  const deadline = Date.now() + timeoutMs;
  while (Date.now() < deadline) {
    try {
      await access(filePath);
      return;
    } catch {
      await new Promise((resolve) => setTimeout(resolve, 100));
    }
  }
  throw new Error(`File not found within timeout: ${filePath}`);
}

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

const MODEL_CACHE_DIR = path.join(os.tmpdir(), 'writenow-e2e-model-cache');

async function seedMemories(page: Page, projectId: string): Promise<void> {
  // Why: baseline injection selects 12 preferences first; semantic recall should then retrieve feedback memories.
  for (let i = 0; i < 12; i += 1) {
    const created = await e2eInvoke<MemoryCreateResponse>(page, 'memory:create', {
      type: 'preference',
      content: `pref-${String(i).padStart(2, '0')}`,
      projectId: null,
    });
    expect(created.ok).toBeTruthy();
    if (!created.ok) throw new Error(created.error.message);
  }

  const feedbackA = await e2eInvoke<MemoryCreateResponse>(page, 'memory:create', {
    type: 'feedback',
    content: '独角鲸',
    projectId: null,
  });
  expect(feedbackA.ok).toBeTruthy();
  if (!feedbackA.ok) throw new Error(feedbackA.error.message);

  const feedbackB = await e2eInvoke<MemoryCreateResponse>(page, 'memory:create', {
    type: 'feedback',
    content: '海豚',
    projectId: null,
  });
  expect(feedbackB.ok).toBeTruthy();
  if (!feedbackB.ok) throw new Error(feedbackB.error.message);

  // Ensure project exists and backend has a scope to resolve against (even though we use global memory items).
  expect(projectId).toBeTruthy();
}

test.describe('@write-mode ai-memory semantic recall', () => {
  test.skip(isWSL(), 'Electron E2E is unstable on WSL; run on native Linux (xvfb) or macOS/Windows.');

  test.beforeAll(async () => {
    test.setTimeout(600_000);
    // Why: first embedding encode can download/init the model; prewarm once so tests stay stable and fast.
    const userDataDir = await mkdtemp(path.join(os.tmpdir(), 'writenow-e2e-mem-recall-warm-'));
    const app = await launchWriteNowApp({
      userDataDir,
      extraEnv: {
        WN_MODEL_CACHE_DIR: MODEL_CACHE_DIR,
        WN_EMBEDDING_ALLOW_REMOTE: '1',
        WN_EMBEDDING_TIMEOUT_MS: '600000',
      },
    });

    try {
      await waitForE2EBridge(app.page);
      const encoded = await e2eInvoke<{ dimension: number; vectors: number[][] }>(app.page, 'embedding:encode', { texts: ['prefetch'] });
      expect(encoded.ok).toBeTruthy();
      if (!encoded.ok) throw new Error(encoded.error.message);
      expect(encoded.data.dimension).toBeGreaterThan(0);
      expect(Array.isArray(encoded.data.vectors)).toBeTruthy();
    } finally {
      await closeWriteNowApp(app);
    }
  });

  test('P0/P1: injection preview supports queryText + semanticMemory, stable systemPrompt, and fallbacks', async () => {
    // Why: first-time embedding model init can be slow (CI cold cache / constrained runners).
    test.setTimeout(480_000);

    const userDataDir = await mkdtemp(path.join(os.tmpdir(), 'writenow-e2e-mem-recall-'));
    const app = await launchWriteNowApp({
      userDataDir,
      extraEnv: {
        WN_MODEL_CACHE_DIR: MODEL_CACHE_DIR,
        WN_EMBEDDING_ALLOW_REMOTE: '0',
        WN_EMBEDDING_TIMEOUT_MS: '600000',
      },
    });

    try {
      const { page } = app;
      await waitForE2EBridge(page);

      const bootstrap = await e2eInvoke<ProjectBootstrapResponse>(page, 'project:bootstrap', {});
      expect(bootstrap.ok).toBeTruthy();
      if (!bootstrap.ok) throw new Error(bootstrap.error.message);
      const projectId = bootstrap.data.currentProjectId;

      const settings = await e2eInvoke<MemorySettingsUpdateResponse>(page, 'memory:settings:update', {
        injectionEnabled: true,
        privacyModeEnabled: false,
      });
      expect(settings.ok).toBeTruthy();
      if (!settings.ok) throw new Error(settings.error.message);

      await seedMemories(page, projectId);

      const previewA = await e2eInvoke<MemoryInjectionPreviewResponse>(page, 'memory:injection:preview', {
        projectId,
        queryText: '独角鲸',
      });
      expect(previewA.ok).toBeTruthy();
      if (!previewA.ok) throw new Error(previewA.error.message);
      expect(previewA.data.injected.recall?.mode).toBe('semantic');
      expect(previewA.data.injected.semanticMemory?.some((m) => m.content.includes('独角鲸'))).toBeTruthy();

      const previewB = await e2eInvoke<MemoryInjectionPreviewResponse>(page, 'memory:injection:preview', {
        projectId,
        queryText: '海豚',
      });
      expect(previewB.ok).toBeTruthy();
      if (!previewB.ok) throw new Error(previewB.error.message);
      expect(previewB.data.injected.recall?.mode).toBe('semantic');
      expect(previewB.data.injected.semanticMemory?.some((m) => m.content.includes('海豚'))).toBeTruthy();

      const baselineIdsA = previewA.data.injected.memory.map((m) => m.id);
      const baselineIdsB = previewB.data.injected.memory.map((m) => m.id);
      expect(baselineIdsB).toEqual(baselineIdsA);

      const previewEmpty = await e2eInvoke<MemoryInjectionPreviewResponse>(page, 'memory:injection:preview', {
        projectId,
        queryText: '',
      });
      expect(previewEmpty.ok).toBeTruthy();
      if (!previewEmpty.ok) throw new Error(previewEmpty.error.message);
      expect(previewEmpty.data.injected.recall?.mode).toBe('deterministic');
      expect(previewEmpty.data.injected.recall?.reason).toBe('EMPTY_QUERY');

      const assembledA = await e2eAssembleForSkill(page, {
        skillId: 'builtin:polish',
        text: '这是一段用于验证语义召回的测试文本。',
        instruction: '独角鲸',
        projectId,
        articleId: 'e2e.md',
      });
      expect(assembledA.ok).toBeTruthy();
      if (!assembledA.ok) throw new Error(assembledA.error.message);

      const assembledB = await e2eAssembleForSkill(page, {
        skillId: 'builtin:polish',
        text: '这是一段用于验证语义召回的测试文本。',
        instruction: '海豚',
        projectId,
        articleId: 'e2e.md',
      });
      expect(assembledB.ok).toBeTruthy();
      if (!assembledB.ok) throw new Error(assembledB.error.message);

      // Why: query-dependent semantic recall must NOT affect the stable-prefix system prompt.
      expect(assembledB.data.prompt.systemPrompt).toBe(assembledA.data.prompt.systemPrompt);
      expect(assembledA.data.prompt.userContent).toContain('相关用户记忆（语义召回）');
      expect(assembledA.data.prompt.userContent).toContain('独角鲸');
      expect(assembledB.data.prompt.userContent).toContain('海豚');
    } finally {
      await closeWriteNowApp(app);
    }
  });

  test('P1: fallback when sqlite-vec is unavailable (E2E env)', async () => {
    test.setTimeout(120_000);

    const userDataDir = await mkdtemp(path.join(os.tmpdir(), 'writenow-e2e-mem-recall-vec-off-'));
    const app = await launchWriteNowApp({
      userDataDir,
      extraEnv: {
        WN_MODEL_CACHE_DIR: MODEL_CACHE_DIR,
        WN_EMBEDDING_ALLOW_REMOTE: '0',
        WN_E2E_DISABLE_USER_MEMORY_VEC: '1',
        WN_EMBEDDING_TIMEOUT_MS: '600000',
      },
    });

    try {
      const { page } = app;
      await waitForE2EBridge(page);

      const bootstrap = await e2eInvoke<ProjectBootstrapResponse>(page, 'project:bootstrap', {});
      expect(bootstrap.ok).toBeTruthy();
      if (!bootstrap.ok) throw new Error(bootstrap.error.message);
      const projectId = bootstrap.data.currentProjectId;

      await seedMemories(page, projectId);

      const preview = await e2eInvoke<MemoryInjectionPreviewResponse>(page, 'memory:injection:preview', {
        projectId,
        queryText: '独角鲸',
      });
      expect(preview.ok).toBeTruthy();
      if (!preview.ok) throw new Error(preview.error.message);

      expect(preview.data.injected.recall?.mode).toBe('deterministic');
      expect(preview.data.injected.recall?.reason).toBe('VEC_UNAVAILABLE');
      expect(preview.data.injected.semanticMemory ?? []).toHaveLength(0);
    } finally {
      await closeWriteNowApp(app);
    }
  });

  test('P1: fallback when embedding dimension conflicts with stored dimension', async () => {
    test.setTimeout(180_000);

    const userDataDir = await mkdtemp(path.join(os.tmpdir(), 'writenow-e2e-mem-recall-dim-'));
    const app = await launchWriteNowApp({
      userDataDir,
      extraEnv: {
        WN_MODEL_CACHE_DIR: MODEL_CACHE_DIR,
        WN_EMBEDDING_ALLOW_REMOTE: '0',
        WN_EMBEDDING_TIMEOUT_MS: '600000',
      },
    });

    let projectId = '';
    try {
      const { page } = app;
      await waitForE2EBridge(page);

      const bootstrap = await e2eInvoke<ProjectBootstrapResponse>(page, 'project:bootstrap', {});
      expect(bootstrap.ok).toBeTruthy();
      if (!bootstrap.ok) throw new Error(bootstrap.error.message);
      projectId = bootstrap.data.currentProjectId;

      await seedMemories(page, projectId);

      const seed = await e2eInvoke<MemoryInjectionPreviewResponse>(page, 'memory:injection:preview', {
        projectId,
        queryText: '独角鲸',
      });
      expect(seed.ok).toBeTruthy();
      if (!seed.ok) throw new Error(seed.error.message);
      expect(seed.data.injected.recall?.mode).toBe('semantic');
    } finally {
      await closeWriteNowApp(app);
    }

    const dbPath = path.join(userDataDir, 'data', 'writenow.db');
    await waitForFileExists(dbPath, 30_000);

    const Database = getBetterSqlite3Ctor();
    const db = new Database(dbPath);
    try {
      db.prepare(
        "INSERT INTO settings (key, value) VALUES ('embedding.dimension', '999') ON CONFLICT(key) DO UPDATE SET value = excluded.value",
      ).run();
    } finally {
      db.close();
    }

    const app2 = await launchWriteNowApp({
      userDataDir,
      extraEnv: {
        WN_MODEL_CACHE_DIR: MODEL_CACHE_DIR,
        WN_EMBEDDING_ALLOW_REMOTE: '0',
        WN_EMBEDDING_TIMEOUT_MS: '600000',
      },
    });

    try {
      const { page } = app2;
      await waitForE2EBridge(page);

      const preview = await e2eInvoke<MemoryInjectionPreviewResponse>(page, 'memory:injection:preview', {
        projectId,
        queryText: '独角鲸',
      });
      expect(preview.ok).toBeTruthy();
      if (!preview.ok) throw new Error(preview.error.message);
      expect(preview.data.injected.recall?.mode).toBe('deterministic');
      expect(preview.data.injected.recall?.reason).toBe('DIMENSION_CONFLICT');
    } finally {
      await closeWriteNowApp(app2);
    }
  });

  test('P1: memory:delete is a soft delete (hidden by default but auditable)', async () => {
    test.setTimeout(120_000);

    const userDataDir = await mkdtemp(path.join(os.tmpdir(), 'writenow-e2e-mem-recall-soft-del-'));
    const app = await launchWriteNowApp({
      userDataDir,
      extraEnv: {
        WN_MODEL_CACHE_DIR: MODEL_CACHE_DIR,
        WN_EMBEDDING_ALLOW_REMOTE: '0',
        WN_EMBEDDING_TIMEOUT_MS: '600000',
      },
    });

    let deletedId = '';
    try {
      const { page } = app;
      await waitForE2EBridge(page);

      const bootstrap = await e2eInvoke<ProjectBootstrapResponse>(page, 'project:bootstrap', {});
      expect(bootstrap.ok).toBeTruthy();
      if (!bootstrap.ok) throw new Error(bootstrap.error.message);

      const create = await e2eInvoke<MemoryCreateResponse>(page, 'memory:create', {
        type: 'feedback',
        content: '软删除验证：这条记忆应当被隐藏但仍可审计',
        projectId: null,
      });
      expect(create.ok).toBeTruthy();
      if (!create.ok) throw new Error(create.error.message);
      deletedId = create.data.item.id;

      const del = await e2eInvoke<MemoryDeleteResponse>(page, 'memory:delete', { id: deletedId });
      expect(del.ok).toBeTruthy();
      if (!del.ok) throw new Error(del.error.message);

      const list = await e2eInvoke<MemoryListResponse>(page, 'memory:list', {
        scope: 'all',
        type: 'feedback',
        includeLearned: true,
      });
      expect(list.ok).toBeTruthy();
      if (!list.ok) throw new Error(list.error.message);
      expect(list.data.items.some((m) => m.id === deletedId)).toBeFalsy();
    } finally {
      await closeWriteNowApp(app);
    }

    const dbPath = path.join(userDataDir, 'data', 'writenow.db');
    await waitForFileExists(dbPath, 30_000);

    const Database = getBetterSqlite3Ctor();
    const db = new Database(dbPath, { readonly: true });
    try {
      const row = db.prepare('SELECT deleted_at, revision FROM user_memory WHERE id = ?').get(deletedId);
      expect(isRecord(row)).toBeTruthy();
      if (!isRecord(row)) throw new Error('user_memory row missing');
      expect(typeof row.deleted_at).toBe('string');
      expect(String(row.deleted_at)).not.toBe('');
      expect(Number(row.revision)).toBeGreaterThanOrEqual(2);
    } finally {
      db.close();
    }
  });
});

