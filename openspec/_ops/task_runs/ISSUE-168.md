# ISSUE-168

- Issue: #168
- Branch: task/168-schema-sql-copy
- PR: <fill-after-created>

## Plan

1. 在 writenow-core 的构建脚本中添加 schema.sql 复制步骤
2. 验证构建后 schema.sql 存在于 lib/node/database/
3. 验证服务器启动时数据库正常初始化

## Runs

### 2026-01-24 22:30 Initial setup

- Command: `git worktree add -b "task/168-schema-sql-copy" ".worktrees/issue-168-schema-sql-copy" origin/main`
- Key output: `HEAD is now at 9aca3f3`
- Evidence: Worktree created at `.worktrees/issue-168-schema-sql-copy/`

### 2026-01-24 22:25 Implement fix

- Change: Modified `writenow-core/package.json` to add `copy-assets` script
- Key change:
  ```json
  "build": "tsc && yarn run copy-assets",
  "copy-assets": "cp src/node/database/schema.sql lib/node/database/",
  ```

### 2026-01-24 22:26 Verify fix

- Command: `cd writenow-theia && yarn install --frozen-lockfile`
- Key output:
  ```
  writenow-core: $ tsc && yarn run copy-assets
  writenow-core: $ cp src/node/database/schema.sql lib/node/database/
  writenow-core: Done in 14.28s.
  ```
- Command: `ls writenow-theia/writenow-core/lib/node/database/schema.sql`
- Key output: File exists (6939 bytes)
- Evidence: `schema.sql` successfully copied to lib directory during build
