import { access, mkdtemp, readFile } from 'node:fs/promises';
import { createRequire } from 'node:module';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import { expect, test, type Page } from '@playwright/test';

import type {
  AiSkillRunRequest,
  ContextWritenowConversationsSaveResponse,
  IpcResponse,
  ProjectBootstrapResponse,
  WritenowConversationMessage,
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

test.describe('@write-mode ai-memory P2-001 full→compact compaction', () => {
  test.skip(isWSL(), 'Electron E2E is unstable on WSL; run on native Linux (xvfb) or macOS/Windows.');

  test('P2-001: compaction is deterministic and refs are injectable', async () => {
    const userDataDir = await mkdtemp(path.join(os.tmpdir(), 'writenow-e2e-p2-001-'));

    const app = await launchWriteNowApp({ userDataDir });
    try {
      const { page } = app;
      await waitForE2EBridge(page);

      const bootstrap = await e2eInvoke<ProjectBootstrapResponse>(page, 'project:bootstrap', {});
      expect(bootstrap.ok).toBeTruthy();
      if (!bootstrap.ok) throw new Error(bootstrap.error.message);
      const projectId = bootstrap.data.currentProjectId;

      const unique = Date.now();
      const conversationId = `conv_long_${unique}`;
      const lastAssistant = `最后助手_${unique}`;
      const lastUser = `最后用户_${unique}`;

      const baseTime = Date.now();
      const messages: WritenowConversationMessage[] = [];
      for (let i = 0; i < 31; i += 1) {
        const role: WritenowConversationMessage['role'] = i % 2 === 0 ? 'user' : 'assistant';
        const content =
          i === 29
            ? lastAssistant
            : i === 30
              ? lastUser
              : role === 'user'
                ? `U${i}: 内容_${unique}`
                : `A${i}: 回复_${unique}`;
        messages.push({ role, content, createdAt: new Date(baseTime + i * 1000).toISOString() });
      }

      const save1 = await e2eInvoke<ContextWritenowConversationsSaveResponse>(page, 'context:writenow:conversations:save', {
        projectId,
        conversation: {
          id: conversationId,
          articleId: 'e2e.md',
          messages,
          skillsUsed: ['builtin:expand'],
          userPreferences: { accepted: [], rejected: [] },
        },
      });
      expect(save1.ok).toBeTruthy();
      if (!save1.ok) throw new Error(save1.error.message);
      expect(save1.data.index.summaryQuality).toBe('heuristic');
      expect(save1.data.index.summary).toContain(lastUser);
      expect(save1.data.index.summary).toContain(lastAssistant);

      const dbPath = path.join(userDataDir, 'data', 'writenow.db');
      await waitForFileExists(dbPath, 30_000);

      const Database = getBetterSqlite3Ctor();
      const db = new Database(dbPath, { readonly: true });
      try {
        const row1 = db
          .prepare(
            'SELECT full_ref, compact_json, summary, summary_quality, message_count, token_estimate FROM conversation_compacts WHERE project_id = ? AND conversation_id = ?',
          )
          .get(projectId, conversationId);
        expect(isRecord(row1)).toBeTruthy();
        if (!isRecord(row1)) throw new Error('conversation_compacts row missing');

        const fullRef = typeof row1.full_ref === 'string' ? row1.full_ref : '';
        const compactJson1 = typeof row1.compact_json === 'string' ? row1.compact_json : '';
        expect(fullRef).toBe(`.writenow/conversations/${conversationId}.json`);
        expect(fullRef).not.toContain(userDataDir);
        expect(typeof row1.summary).toBe('string');
        expect(row1.summary_quality).toBe('heuristic');
        expect(row1.message_count).toBe(31);
        expect(compactJson1).toContain(`"conversationId": "${conversationId}"`);

        const compactParsed = JSON.parse(compactJson1) as unknown;
        expect(isRecord(compactParsed)).toBeTruthy();
        if (isRecord(compactParsed)) {
          expect(compactParsed.fullRef).toBe(fullRef);
          expect(compactParsed.summaryQuality).toBe('heuristic');
          expect(typeof compactParsed.summary).toBe('string');
        }

        const events = db
          .prepare(
            'SELECT reason, threshold_json, stats_json, full_ref FROM conversation_compaction_events WHERE project_id = ? AND conversation_id = ? ORDER BY triggered_at DESC',
          )
          .all(projectId, conversationId);
        expect(Array.isArray(events)).toBeTruthy();
        const hasThreshold = events.some((e) => isRecord(e) && e.reason === 'threshold');
        expect(hasThreshold).toBeTruthy();

        const save2 = await e2eInvoke<ContextWritenowConversationsSaveResponse>(page, 'context:writenow:conversations:save', {
          projectId,
          conversation: {
            id: conversationId,
            articleId: 'e2e.md',
            messages,
            skillsUsed: ['builtin:expand'],
            userPreferences: { accepted: [], rejected: [] },
          },
        });
        expect(save2.ok).toBeTruthy();
        if (!save2.ok) throw new Error(save2.error.message);

        const row2 = db
          .prepare('SELECT compact_json FROM conversation_compacts WHERE project_id = ? AND conversation_id = ?')
          .get(projectId, conversationId);
        expect(isRecord(row2)).toBeTruthy();
        if (!isRecord(row2)) throw new Error('conversation_compacts row missing (second read)');
        const compactJson2 = typeof row2.compact_json === 'string' ? row2.compact_json : '';
        expect(compactJson2).toBe(compactJson1);

        const fullPathOnDisk = path.join(userDataDir, 'projects', projectId, fullRef);
        await waitForFileExists(fullPathOnDisk, 30_000);
        const fullText = await readFile(fullPathOnDisk, 'utf8');
        const fullParsed = JSON.parse(fullText) as unknown;
        expect(isRecord(fullParsed)).toBeTruthy();
        if (isRecord(fullParsed)) {
          const parsedMessages = fullParsed.messages;
          expect(Array.isArray(parsedMessages)).toBeTruthy();
          expect(Array.isArray(parsedMessages) ? parsedMessages.length : 0).toBe(31);
        }
      } finally {
        db.close();
      }

      const assembled = await e2eAssembleForSkill(page, {
        skillId: 'builtin:polish',
        text: '这是一段需要润色的测试文本。',
        instruction: '',
        projectId,
        articleId: 'e2e.md',
      });
      expect(assembled.ok).toBeTruthy();
      if (!assembled.ok) throw new Error(assembled.error.message);

      const refs = assembled.data.injected?.refs ?? [];
      expect(refs).toContain(`.writenow/conversations/${conversationId}.json`);
      expect(assembled.data.prompt.userContent).toContain(lastUser);
      expect(assembled.data.prompt.userContent).toContain('[heuristic]');
    } finally {
      await closeWriteNowApp(app);
    }
  });
});

