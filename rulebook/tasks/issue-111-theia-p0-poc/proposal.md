# Proposal: issue-111-theia-p0-poc

## Why
Sprint `openspec/specs/sprint-theia-migration/spec.md` 要求在全面迁移前先完成 Phase 0 的 3 个关键 PoC（TipTap 集成、native DB 依赖、存储语义），用最短路径验证 Theia 迁移的生死线并固化可复现证据。

## What Changes
- 新增独立 PoC 目录 `theia-poc/`：用 `generator-theia-extension` 生成最小 Theia app，并实现：
  - `.md` 文件用 TipTap Editor Widget 打开/编辑/保存（含焦点与快捷键冲突治理）
  - backend 中加载 `better-sqlite3` + `sqlite-vec` 并完成最小 CRUD + vec0 查询（含 Electron 目标验证）
- 新增 PoC 结论文档到 `openspec/specs/sprint-theia-migration/poc-results/`（001/002/003）。
- Closeout P0 task cards：更新 `openspec/specs/sprint-theia-migration/task_cards/p0/*` 验收勾选与完成元数据。

## Impact
- Affected specs: `openspec/specs/sprint-theia-migration/spec.md` + `task_cards/p0/*`
- Affected code: `theia-poc/**`
- Breaking change: NO
- User benefit: 在投入大规模迁移前获得可复现的可行性结论与风险清单，降低迁移决策的不确定性。
