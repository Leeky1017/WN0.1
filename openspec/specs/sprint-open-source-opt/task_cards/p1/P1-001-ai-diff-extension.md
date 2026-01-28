# P1-001: 自研 TipTap AI Diff/Suggestion Extension

## 元信息

| 字段 | 值 |
|------|-----|
| ID | P1-001 |
| Phase | 1 - 编辑器 AI 交互 |
| 优先级 | P0 |
| 状态 | done |
| 依赖 | P0-001（推荐：先稳定云端请求层与错误语义） |
| Issue | #291 |
| PR | #294 |
| RUN_LOG | openspec/_ops/task_runs/ISSUE-291.md |

## 必读前置（执行前必须阅读）

- [ ] `openspec/specs/sprint-open-source-opt/spec.md`
- [ ] `openspec/specs/sprint-open-source-opt/design/02-tiptap-ai-extension.md`
- [ ] `writenow-frontend/src/components/editor/TipTapEditor.tsx`（集成点）
- [ ] `src/types/ipc-generated.ts`（错误码：TIMEOUT/CANCELED/UPSTREAM_ERROR 等）

## 目标

- 在 TipTap 编辑器内以可控方式呈现 AI 改写 diff：新增/删除/替换具备明确视觉语义。
- 提供 Accept/Reject 并保证取消/失败路径不会留下残留状态。

## 任务清单

- [x] 设计 Diff 表达模型（range + type + source runId），明确与版本系统的关系。
- [x] 实现 TipTap Extension：
  - [x] ProseMirror Plugin + DecorationSet（渲染 diff）
  - [x] commands：`showAiDiff` / `acceptAiDiff` / `rejectAiDiff` / `clearAiDiff`
- [x] AI 面板/技能执行链路接入：
  - [x] streaming delta 聚合（或 chunk）与 diff 计算策略
  - [x] cancel/timeout/error 时清理 decorations
- [x] 样式：新增 token-friendly CSS class（避免硬编码颜色；兼容主题）。
- [x] 可用性：键盘可操作（Accept/Reject 快捷键或按钮焦点）。
- [x] E2E：覆盖“生成 → 显示 diff → Accept/Reject → 重开验证版本/内容一致”。

## 验收标准

- [x] Diff 展示在内容区可读、稳定；不会随着输入/滚动出现错位或残留。
- [x] Reject / cancel / timeout 之后编辑器回到一致状态（无幽灵高亮）。
- [x] Accept 后内容与版本历史一致且可追溯 runId。
- [x] Playwright E2E 覆盖成功 + 取消/超时 + 错误分支。

## 产出

- 代码：新增 TipTap AI Diff/Suggestion Extension 与集成代码。
- 样式：新增 diff/suggestion 的语义化样式。
- 测试：新增 E2E 覆盖 + 必要的单元测试。
