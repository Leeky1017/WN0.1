# ISSUE-158
- Issue: #158
- Branch: task/158-theia-version-history-widget
- PR: https://github.com/Leeky1017/WN0.1/pull/160

## Plan
- Audit/complete Theia version snapshot service + RPC surface
- Implement Version History Widget (list/detail/diff/rollback) and editor/AI integrations
- Add E2E coverage and capture CRUD/Diff/Rollback/AI evidence

## Runs
### 2026-01-24 00:00 Bootstrap
- Command: `gh issue create -t "[THEIA-P3] Task 013: Version History Widget" ...`
- Key output: `https://github.com/Leeky1017/WN0.1/issues/158`
- Command: `git worktree add -b task/158-theia-version-history-widget .worktrees/issue-158-theia-version-history-widget origin/main`
- Key output: `Preparing worktree (new branch 'task/158-theia-version-history-widget')`
- Evidence: `openspec/_ops/task_runs/ISSUE-158.md`

### 2026-01-24 10:55 UTC Rulebook task bootstrap
- Command: `rulebook task create issue-158-theia-version-history-widget`
- Key output: `✅ Task issue-158-theia-version-history-widget created successfully`
- Command: `rulebook task validate issue-158-theia-version-history-widget`
- Key output: `✅ Task issue-158-theia-version-history-widget is valid`
- Evidence:
  - `rulebook/tasks/issue-158-theia-version-history-widget/{proposal.md,tasks.md,specs/**}`

### 2026-01-24 11:00 UTC Build: writenow-core (TypeScript)
- Command: `yarn --cwd writenow-theia install --ignore-scripts`
- Key output: `warning Ignored scripts due to flag. (native-keymap build requires pkg-config in this environment)`
- Command: `yarn --cwd writenow-theia/writenow-core build`
- Key output: `tsc (exit 0)`
- Evidence: `writenow-theia/writenow-core/lib/**`

### 2026-01-24 11:03 UTC Native module rebuild: better-sqlite3 (for runtime smoke)
- Command: `npm --prefix writenow-theia rebuild better-sqlite3`
- Key output: `rebuilt dependencies successfully`
- Evidence: `writenow-theia/node_modules/better-sqlite3/**`

### 2026-01-24 11:05 UTC Snapshot CRUD + diff verification (SQLite real)
- Command: `node - <<'NODE' ... NODE`
- Key output: `created { snapshotId: ... }; list count 1; restored Untracked.md true`
- Evidence:
  - `writenow-theia/writenow-core/src/node/services/version-service.ts`
  - `writenow-theia/writenow-core/src/node/database/articles.ts`

### 2026-01-24 11:10 UTC Snapshot create can upsert missing article rows (FK-safe)
- Command:
  ```bash
  node - <<'NODE'
  const os = require('node:os');
  const path = require('node:path');
  const fs = require('node:fs/promises');
  const { WritenowSqliteDb } = require('./writenow-theia/writenow-core/lib/node/database/writenow-sqlite-db');
  const { VersionService } = require('./writenow-theia/writenow-core/lib/node/services/version-service');
  const logger = { error: console.error, warn: console.warn, info: console.log, debug: () => undefined };
  (async () => {
    const dataDir = await fs.mkdtemp(path.join(os.tmpdir(), 'wn-version-upsert-'));
    const db = new WritenowSqliteDb(logger, dataDir);
    db.ensureReady();
    const version = new VersionService(logger, db);
    const created = await version.create({ articleId: 'Untracked.md', content: '# Untracked\\n\\nhello', name: 'v1', actor: 'user' });
    const listed = await version.list({ articleId: 'Untracked.md', limit: 10, cursor: '0' });
    const restored = await version.restore({ snapshotId: created.snapshotId });
    console.log('created', created, 'listed', listed.items.length, 'restored', restored.articleId);
  })();
  NODE
  ```
- Key output: `created { snapshotId: ... } listed 1 restored Untracked.md`
- Evidence: `writenow-theia/writenow-core/src/node/services/version-service.ts`

### 2026-01-24 11:15 UTC Lint/build/contract/openspec gates
- Command: `npm run contract:check`
- Key output: `exit 0`
- Command: `npm run lint`
- Key output: `0 errors (warnings only)`
- Command: `npm run build`
- Key output: `vite build (exit 0)`
- Command: `npx -y @fission-ai/openspec@0.17.2 validate --specs --strict --no-interactive`
- Key output: `Totals: 14 passed, 0 failed`

### 2026-01-24 11:18 UTC Rollback + AI snapshot integration wiring (code path evidence)
- Command: `rg -n \"version:create\" writenow-theia/writenow-core/src/browser/ai-panel/ai-panel-widget.tsx writenow-theia/writenow-core/src/browser/version-history/version-history-widget.tsx`
- Key output: `AI Apply creates pre/post snapshots; Version History uses version:list/diff/restore + editor.setMarkdown`
- Evidence:
  - `writenow-theia/writenow-core/src/browser/ai-panel/ai-panel-widget.tsx`
  - `writenow-theia/writenow-core/src/browser/version-history/version-history-widget.tsx`
  - `writenow-theia/writenow-core/src/browser/tiptap-markdown-editor-widget.tsx`
