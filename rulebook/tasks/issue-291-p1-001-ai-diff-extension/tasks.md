## 1. Implementation
- [x] 1.1 创建 `RUN_LOG`：`openspec/_ops/task_runs/ISSUE-291.md`（记录关键命令与关键输出）
- [x] 1.2 新增编辑器扩展文件：`writenow-frontend/src/lib/editor/extensions/ai-diff.ts`
- [x] 1.3 实现 ProseMirror `Plugin` + `DecorationSet`：可随 transaction mapping 更新，避免位置漂移
- [x] 1.4 实现 commands：`showAiDiff` / `acceptAiDiff` / `rejectAiDiff`（并提供 `clearAiDiff` 以覆盖 cancel/timeout）
- [x] 1.5 失败语义：Accept 在选区漂移时返回可判定错误（`CONFLICT` / `UNSUPPORTED`），并保证可重试

## 2. Testing
- [x] 2.1 前端 lint/typecheck 通过（至少覆盖新增文件）
- [x] 2.2 `openspec validate --specs --strict --no-interactive` 通过 + `rulebook task validate issue-291-p1-001-ai-diff-extension` 通过

## 3. Documentation
- [x] 3.1 补齐 delta spec：`rulebook/tasks/issue-291-p1-001-ai-diff-extension/specs/sprint-open-source-opt/spec.md`
- [x] 3.2 `proposal.md` 与 `tasks.md` 完成且与实现保持一致（不漂移）
