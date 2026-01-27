# P1-003: Review Mode —— AI Diff 可读 + Accept/Reject + 可回退

Status: done  
Issue: #299  
PR: https://github.com/Leeky1017/WN0.1/pull/300  
RUN_LOG: openspec/_ops/task_runs/ISSUE-299.md

## 元信息

| 字段 | 值 |
|------|-----|
| ID | P1-003 |
| Phase | P1 - Write Mode UX / 交互模型 |
| 优先级 | P0 |
| 状态 | Done |
| 依赖 | P0-001, P0-002 |

## 必读前置（执行前必须阅读）

- [x] `openspec/specs/sprint-write-mode-ide/spec.md`（AI 可控/可取消/可追溯 Requirement）
- [x] `design/01-write-mode-ux.md`（Review Mode 语义 + Accept/Reject 不变量）
- [x] `design/02-editor-performance.md`（diff decorations 的降级策略）
- [x] 现有实现资产：
  - [x] `writenow-frontend/src/features/ai-panel/useAISkill.ts`（diff 计算）
  - [x] `writenow-frontend/src/stores/aiStore.ts`（diff 状态机）
  - [x] `writenow-frontend/src/stores/editorRuntimeStore.ts`（selection snapshot + active editor）

## 目标

让 AI 修改“永远可控”：

1) AI 输出必须以 diff 形式展示（panel 或 editor inline）
2) 用户确认（Accept）才应用到正文；Reject 不改正文
3) Accept 必须可回退（形成版本节点或至少可 Undo）
4) 取消/错误必须清理所有 pending 状态（不残留 diff 高亮）

## 任务清单

- [x] 1) 定义 Review Mode 的 UI 进入条件（SSOT）
  - [x] `useAIStore().diff != null` ⇒ 进入 Review Mode
  - [x] Header/HUD 显示“Reviewing AI changes”
- [x] 2) Diff 呈现（低成本实现优先）
  - [x] Panel diff：在 AI Panel 中渲染 original/suggested + hunks（复用 `computeDiff` 结果）
  - [x] （可选）Editor inline：仅对 selection 范围做 decorations（避免全局开销）
- [x] 3) Accept/Reject 行为（必须 deterministic）
  - [x] Accept：基于 selection snapshot 把 suggestedText 应用回 TipTap editor
  - [x] Reject：清理 diff 状态，恢复 Normal
  - [x] Esc：退出 Review（等价于 Reject，但不应标记 error）
- [x] 4) 可回退语义
  - [x] 最小：Accept 通过 TipTap transaction 可 Undo（用户 Cmd/Ctrl+Z 可撤回）
  - [x] 推荐：Accept 形成一个版本节点（版本/历史系统按 `writenow-spec`）
- [x] 5) 取消/错误清理
  - [x] AI run cancel/timeout/error 时必须清理：runId、streaming 状态、diff decorations、panel pending UI
  - [x] 状态栏显示：`canceled` 与 `error` 区分（并可重试）
- [x] 6) 稳定选择器（E2E）
  - [x] Review root：`data-testid="wm-review-root"`
  - [x] Accept/Reject 按钮：`data-testid="wm-review-accept" / "wm-review-reject"`

## 验收标准

- [x] AI run 完成后可看到 diff（至少 panel diff）
- [x] Accept 后正文发生可验证变化，且用户可 Undo 回退
- [x] Reject/Esc 不改变正文，且所有 diff UI 被清理
- [x] AI cancel 后 editor 可继续输入，且 UI 不残留“输出中…/diff 高亮”
- [x] 至少 1 条 E2E 覆盖：run → diff → accept → 保存落盘（或 run → cancel → 清理）

## 产出

- `writenow-frontend/src/features/ai-panel/AIPanel.tsx`（diff UI + Review controls）
- `writenow-frontend/src/features/editor/*`（apply diff to TipTap）
- `writenow-frontend/src/stores/aiStore.ts`（必要时扩展：review 状态/accepted hunks）
