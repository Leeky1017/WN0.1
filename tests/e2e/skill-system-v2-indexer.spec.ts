import fs from 'node:fs';
import { mkdtemp, mkdir, rm, writeFile } from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';

import Database from 'better-sqlite3-node';
import { expect, test, _electron as electron } from '@playwright/test';

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

function tryOpenDb(userDataDir: string) {
  const dbPath = path.join(userDataDir, 'data', 'writenow.db');
  if (!fs.existsSync(dbPath)) return null;
  return new Database(dbPath);
}

function openDbOrThrow(userDataDir: string) {
  const db = tryOpenDb(userDataDir);
  expect(db).not.toBeNull();
  return db as Database;
}

async function waitFor<T>(fn: () => T | null, timeoutMs = 5000, intervalMs = 100) {
  const started = Date.now();
  while (Date.now() - started < timeoutMs) {
    const value = fn();
    if (value !== null) return value;
    await new Promise((resolve) => setTimeout(resolve, intervalMs));
  }
  return null;
}

test.describe('Skill System V2 (indexer)', () => {
  test('indexes builtin SKILL.md on startup', async () => {
    const userDataDir = await mkdtemp(path.join(os.tmpdir(), 'writenow-e2e-'));
    const { electronApp } = await launchApp(userDataDir);

    try {
      await electronApp.close();

      const db = openDbOrThrow(userDataDir);
      const rows = db
        .prepare("SELECT id, scope, package_id, source_uri, is_valid FROM skills WHERE scope = 'builtin' ORDER BY id")
        .all() as Array<{ id: string; scope: string; package_id: string | null; source_uri: string | null; is_valid: number }>;
      db.close();

      const ids = rows.map((r) => r.id);
      expect(ids).toEqual(['builtin:condense', 'builtin:expand', 'builtin:polish']);
      for (const row of rows) {
        expect(row.is_valid).toBe(1);
        expect(row.package_id).toBe('pkg.writenow.builtin');
        expect(typeof row.source_uri).toBe('string');
        expect((row.source_uri ?? '').length).toBeGreaterThan(0);
      }
    } finally {
      await electronApp.close().catch(() => undefined);
      await rm(userDataDir, { recursive: true, force: true }).catch(() => undefined);
    }
  });

  test('watches global SKILL.md add/update/delete', async () => {
    const userDataDir = await mkdtemp(path.join(os.tmpdir(), 'writenow-e2e-'));
    const { electronApp } = await launchApp(userDataDir);

    const skillDir = path.join(userDataDir, 'skills', 'packages', 'pkg.e2e.test', '1.0.0', 'skills', 'hello');
    const skillPath = path.join(skillDir, 'SKILL.md');

    try {
      await mkdir(skillDir, { recursive: true });
      await writeFile(
        skillPath,
        `---\nid: global:e2e-hello\nname: E2E Hello\nversion: 1.0.0\ntags: [rewrite]\nprompt: { system: \"S\", user: \"U\" }\n---\n`,
        'utf8'
      );

      const inserted = await waitFor(() => {
        const db = tryOpenDb(userDataDir);
        if (!db) return null;
        const row = db
          .prepare('SELECT id, name, scope, source_uri, is_valid FROM skills WHERE id = ?')
          .get('global:e2e-hello') as { id: string; name: string; scope: string; source_uri: string | null; is_valid: number } | undefined;
        db.close();
        return row ?? null;
      });

      expect(inserted).not.toBeNull();
      expect(inserted?.scope).toBe('global');
      expect(inserted?.name).toBe('E2E Hello');
      expect(inserted?.is_valid).toBe(1);
      expect(inserted?.source_uri).toBe(skillPath);

      await writeFile(
        skillPath,
        `---\nid: global:e2e-hello\nname: E2E Hello Updated\nversion: 1.0.1\ntags: [rewrite]\nprompt: { system: \"S\", user: \"U\" }\n---\n`,
        'utf8'
      );

      const updated = await waitFor(() => {
        const db = tryOpenDb(userDataDir);
        if (!db) return null;
        const row = db
          .prepare('SELECT name, version FROM skills WHERE id = ?')
          .get('global:e2e-hello') as { name: string; version: string | null } | undefined;
        db.close();
        return row?.name === 'E2E Hello Updated' ? row : null;
      });

      expect(updated).not.toBeNull();
      expect(updated?.version).toBe('1.0.1');

      await rm(skillPath, { force: true });

      const deleted = await waitFor(() => {
        const db = tryOpenDb(userDataDir);
        if (!db) return null;
        const row = db.prepare('SELECT 1 FROM skills WHERE id = ?').get('global:e2e-hello') as { 1: number } | undefined;
        db.close();
        return row ? null : true;
      });

      expect(deleted).toBe(true);
    } finally {
      await electronApp.close().catch(() => undefined);
      await rm(userDataDir, { recursive: true, force: true }).catch(() => undefined);
    }
  });

  test('indexes project-scoped skills after project bootstrap', async () => {
    const userDataDir = await mkdtemp(path.join(os.tmpdir(), 'writenow-e2e-'));
    const { electronApp } = await launchApp(userDataDir);

    try {
      const projectId = await waitFor(() => {
        const db = tryOpenDb(userDataDir);
        if (!db) return null;
        const row = db.prepare("SELECT value FROM settings WHERE key = 'current_project_id'").get() as { value: string } | undefined;
        db.close();
        const raw = typeof row?.value === 'string' ? row.value : '';
        try {
          const parsed = JSON.parse(raw) as unknown;
          return typeof parsed === 'string' && parsed.trim() ? parsed.trim() : null;
        } catch {
          return null;
        }
      }, 8000);

      expect(projectId).not.toBeNull();

      const skillDir = path.join(
        userDataDir,
        'projects',
        projectId as string,
        '.writenow',
        'skills',
        'packages',
        'pkg.e2e.project',
        '1.0.0',
        'skills',
        'proj'
      );
      const skillPath = path.join(skillDir, 'SKILL.md');

      await mkdir(skillDir, { recursive: true });
      await writeFile(
        skillPath,
        `---\nid: project:e2e-proj\nname: E2E Project\nversion: 1.0.0\ntags: [rewrite]\nprompt: { system: \"S\", user: \"U\" }\n---\n`,
        'utf8'
      );

      const inserted = await waitFor(() => {
        const db = tryOpenDb(userDataDir);
        if (!db) return null;
        const row = db
          .prepare('SELECT id, scope, source_uri FROM skills WHERE id = ?')
          .get('project:e2e-proj') as { id: string; scope: string; source_uri: string | null } | undefined;
        db.close();
        return row ?? null;
      }, 8000);

      expect(inserted).not.toBeNull();
      expect(inserted?.scope).toBe('project');
      expect(inserted?.source_uri).toBe(skillPath);

      await rm(skillPath, { force: true });
      const deleted = await waitFor(() => {
        const db = tryOpenDb(userDataDir);
        if (!db) return null;
        const row = db.prepare('SELECT 1 FROM skills WHERE id = ?').get('project:e2e-proj') as { 1: number } | undefined;
        db.close();
        return row ? null : true;
      }, 8000);

      expect(deleted).toBe(true);
    } finally {
      await electronApp.close().catch(() => undefined);
      await rm(userDataDir, { recursive: true, force: true }).catch(() => undefined);
    }
  });
});
