import fs from 'node:fs';
import { mkdtemp } from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';

import Database from 'better-sqlite3-node';
import { expect, test, _electron as electron } from '@playwright/test';

type IpcErr = { ok: false; error: { code: string; message: string; details?: unknown } };
type IpcOk<T> = { ok: true; data: T };
type IpcResponse<T> = IpcOk<T> | IpcErr;

const MODEL_CACHE_DIR = path.join(os.tmpdir(), 'writenow-e2e-model-cache');
const E2E_EMBEDDING_MODEL_ID = typeof process.env.WN_E2E_EMBEDDING_MODEL_ID === 'string' ? process.env.WN_E2E_EMBEDDING_MODEL_ID.trim() : '';

async function launchApp(userDataDir: string, extraEnv: Record<string, string> = {}) {
  const electronApp = await electron.launch({
    args: ['.'],
    env: {
      ...process.env,
      WN_E2E: '1',
      WN_OPEN_DEVTOOLS: '0',
      WN_USER_DATA_DIR: userDataDir,
      WN_MODEL_CACHE_DIR: MODEL_CACHE_DIR,
      ...(E2E_EMBEDDING_MODEL_ID ? { WN_E2E_EMBEDDING_MODEL_ID: E2E_EMBEDDING_MODEL_ID } : {}),
      WN_EMBEDDING_TIMEOUT_MS: '600000',
      ...extraEnv,
    },
  });

  const page = await electronApp.firstWindow();
  await expect(page.getByText('WriteNow')).toBeVisible();
  return { electronApp, page };
}

async function invoke<T>(page: { evaluate: (fn: (arg: unknown) => unknown, arg: unknown) => Promise<unknown> }, channel: string, payload: unknown) {
  const result = await page.evaluate(
    async (arg) => {
      const input = arg as { channel: string; payload: unknown };
      const api = (window as unknown as { writenow: { invoke: (c: string, p: unknown) => Promise<unknown> } }).writenow;
      return api.invoke(input.channel, input.payload);
    },
    { channel, payload }
  );
  return result as IpcResponse<T>;
}

test.describe('Sprint 3 (RAG) IPC', () => {
  test.setTimeout(12 * 60_000);

  test.beforeAll(async ({}, testInfo) => {
    testInfo.setTimeout(12 * 60_000);
    const userDataDir = await mkdtemp(path.join(os.tmpdir(), 'writenow-e2e-prewarm-'));
    const { electronApp, page } = await launchApp(userDataDir, { WN_EMBEDDING_ALLOW_REMOTE: '1' });
    try {
      const encoded = await invoke<{ dimension: number; vectors: number[][] }>(page, 'embedding:encode', { texts: ['prefetch'] });
      if (!encoded.ok) throw new Error(`${encoded.error.code}: ${encoded.error.message}`);
      expect(encoded.data.dimension).toBeGreaterThan(0);
      expect(encoded.data.vectors).toHaveLength(1);
      expect(encoded.data.vectors[0]).toHaveLength(encoded.data.dimension);
    } finally {
      await electronApp.close();
    }
  });

  test('FTS5 fulltext index updates on save/delete', async () => {
    const userDataDir = await mkdtemp(path.join(os.tmpdir(), 'writenow-e2e-'));
    const { electronApp, page } = await launchApp(userDataDir, { WN_EMBEDDING_ALLOW_REMOTE: '0' });

    try {
      const created = await invoke<{ path: string }>(page, 'file:create', { name: 'Fulltext' });
      expect(created.ok).toBe(true);
      if (!created.ok) throw new Error(`${created.error.code}: ${created.error.message}`);
      const docPath = created.data.path;

      const needle = '独角鲸';
      const wrote1 = await invoke<{ written: true }>(page, 'file:write', { path: docPath, content: `# Fulltext\n\n这里有一个词：${needle}\n` });
      expect(wrote1.ok).toBe(true);
      if (!wrote1.ok) throw new Error(`${wrote1.error.code}: ${wrote1.error.message}`);

      const search1 = await invoke<{ items: Array<{ id: string; snippet: string }> }>(page, 'search:fulltext', {
        query: needle,
        limit: 10,
      });
      expect(search1.ok).toBe(true);
      if (search1.ok) {
        expect(search1.data.items.some((hit) => hit.id === docPath && hit.snippet.includes(needle))).toBe(true);
      }

      const wrote2 = await invoke<{ written: true }>(page, 'file:write', { path: docPath, content: '# Fulltext\n\n这里没有关键词。\n' });
      expect(wrote2.ok).toBe(true);
      if (!wrote2.ok) throw new Error(`${wrote2.error.code}: ${wrote2.error.message}`);

      const search2 = await invoke<{ items: Array<{ id: string }> }>(page, 'search:fulltext', { query: needle, limit: 10 });
      expect(search2.ok).toBe(true);
      if (search2.ok) {
        expect(search2.data.items.find((hit) => hit.id === docPath)).toBeUndefined();
      }

      const deleted = await invoke<{ deleted: true }>(page, 'file:delete', { path: docPath });
      expect(deleted.ok).toBe(true);

      const search3 = await invoke<{ items: Array<{ id: string }> }>(page, 'search:fulltext', { query: needle, limit: 10 });
      expect(search3.ok).toBe(true);
      if (search3.ok) {
        expect(search3.data.items.find((hit) => hit.id === docPath)).toBeUndefined();
      }
    } finally {
      await electronApp.close();
    }
  });

  test('embedding encode works offline after first download; semantic search and dimension mismatch are observable', async () => {
    const userDataDir = await mkdtemp(path.join(os.tmpdir(), 'writenow-e2e-'));
    const { electronApp, page } = await launchApp(userDataDir, { WN_EMBEDDING_ALLOW_REMOTE: '0' });

    let docAPath = 'Doc A.md';
    try {
      const encoded = await invoke<{ model: string; dimension: number; vectors: number[][] }>(page, 'embedding:encode', {
        texts: ['你好'],
      });
      expect(encoded.ok).toBe(true);
      if (!encoded.ok) throw new Error(`${encoded.error.code}: ${encoded.error.message}`);
      expect(encoded.data.model).toBe('text2vec-base-chinese');
      expect(encoded.data.dimension).toBeGreaterThan(0);
      expect(encoded.data.vectors).toHaveLength(1);
      expect(encoded.data.vectors[0]).toHaveLength(encoded.data.dimension);

      const createdA = await invoke<{ path: string }>(page, 'file:create', { name: 'Doc A' });
      const createdB = await invoke<{ path: string }>(page, 'file:create', { name: 'Doc B' });
      expect(createdA.ok).toBe(true);
      expect(createdB.ok).toBe(true);
      if (!createdA.ok || !createdB.ok) throw new Error('file:create failed');

      docAPath = createdA.data.path;
      const docBPath = createdB.data.path;

      const wroteA = await invoke<{ written: true }>(page, 'file:write', { path: docAPath, content: '# A\n\n今天很开心。' });
      const wroteB = await invoke<{ written: true }>(page, 'file:write', { path: docBPath, content: '# B\n\n今天很难过。' });
      expect(wroteA.ok).toBe(true);
      expect(wroteB.ok).toBe(true);

      const indexed = await invoke<{ indexedCount: number; dimension: number }>(page, 'embedding:index', {
        namespace: 'articles',
        items: [
          { id: docAPath, text: '今天很开心。' },
          { id: docBPath, text: '今天很难过。' },
        ],
      });
      expect(indexed.ok).toBe(true);
      if (!indexed.ok) throw new Error(`${indexed.error.code}: ${indexed.error.message}`);
      expect(indexed.data.indexedCount).toBe(2);
      expect(indexed.data.dimension).toBeGreaterThan(0);

      const semantic = await invoke<{ items: Array<{ id: string; score: number }> }>(page, 'search:semantic', {
        query: '开心',
        limit: 5,
      });
      expect(semantic.ok).toBe(true);
      if (!semantic.ok) throw new Error(`${semantic.error.code}: ${semantic.error.message}`);
      expect(semantic.data.items.length).toBeGreaterThan(0);
      expect(semantic.data.items[0].score).toBeGreaterThan(0);
      expect(semantic.data.items.some((hit) => hit.id === docAPath)).toBe(true);
    } finally {
      await electronApp.close();
    }

    const dbPath = path.join(userDataDir, 'data', 'writenow.db');
    expect(fs.existsSync(dbPath)).toBe(true);
    const db = new Database(dbPath);
    db.prepare(
      "INSERT INTO settings(key, value) VALUES ('embedding.dimension', ?) ON CONFLICT(key) DO UPDATE SET value = excluded.value"
    ).run(JSON.stringify(123));
    db.close();

    const relaunched = await launchApp(userDataDir, { WN_EMBEDDING_ALLOW_REMOTE: '0' });
    try {
      const mismatch = await invoke<{ indexedCount: number }>(relaunched.page, 'embedding:index', {
        namespace: 'articles',
        items: [{ id: docAPath, text: '今天很开心。' }],
      });
      expect(mismatch.ok).toBe(false);
      if (!mismatch.ok) {
        expect(mismatch.error.code).toBe('CONFLICT');
      }
    } finally {
      await relaunched.electronApp.close();
    }

    const offlineUserDataDir = await mkdtemp(path.join(os.tmpdir(), 'writenow-e2e-'));
    const offlineApp = await launchApp(offlineUserDataDir, { WN_EMBEDDING_ALLOW_REMOTE: '0' });
    try {
      const offlineEncode = await invoke<{ dimension: number; vectors: number[][] }>(offlineApp.page, 'embedding:encode', {
        texts: ['离线可用'],
      });
      expect(offlineEncode.ok).toBe(true);
      if (!offlineEncode.ok) throw new Error(`${offlineEncode.error.code}: ${offlineEncode.error.message}`);
    } finally {
      await offlineApp.electronApp.close();
    }
  });

  test('RAG retrieval returns entity cards + passages with budget control', async () => {
    const userDataDir = await mkdtemp(path.join(os.tmpdir(), 'writenow-e2e-'));
    const { electronApp, page } = await launchApp(userDataDir, { WN_EMBEDDING_ALLOW_REMOTE: '0' });

    const characterCard = `---\ntype: character\nname: 张三\naliases: [老张]\n---\n\n# 张三\n\n性格：冷静。\n动机：寻找真相。\n`;
    const chapter = `# 第一章\n\n张三走进房间，微微一笑。\n\n他低声说道：今天我很开心。\n`;

    try {
      await invoke(page, 'file:create', { name: '角色-张三' });
      await invoke(page, 'file:write', { path: '角色-张三.md', content: characterCard });
      await invoke(page, 'file:create', { name: '第一章' });
      await invoke(page, 'file:write', { path: '第一章.md', content: chapter });

      const rag = await invoke<{
        characters: Array<{ name: string; sourceArticleId?: string }>;
        settings: Array<unknown>;
        passages: Array<{ articleId: string }>;
        budget: { maxChunks: number };
      }>(page, 'rag:retrieve', {
        queryText: '请让@张三用冷静的语气说一句话',
        budget: { maxChunks: 1, maxChars: 1500 },
      });

      expect(rag.ok).toBe(true);
      if (rag.ok) {
        expect(rag.data.characters.some((c) => c.name === '张三' && c.sourceArticleId === '角色-张三.md')).toBe(true);
        expect(rag.data.passages.some((p) => p.articleId === '第一章.md')).toBe(true);
        expect(rag.data.budget.maxChunks).toBe(1);
      }
    } finally {
      await electronApp.close();
    }
  });
});
