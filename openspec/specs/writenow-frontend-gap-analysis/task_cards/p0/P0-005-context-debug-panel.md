# P0-005: 上下文调试器入口（Context Debug）

Status: pending

## Goal

提供 `writenow-frontend` 的“上下文调试/可观测”面板入口，让用户与开发者能看到：

- `.writenow/` 上下文目录是否存在、是否在监听
- 规则片段（style/terminology/constraints）的加载结果与错误
- 设定文件（characters/settings）的清单与内容（最小可用：可预览 + 可刷新）

## Dependencies

- `openspec/specs/writenow-frontend-gap-analysis/spec.md`
- `openspec/specs/writenow-frontend-gap-analysis/design/02-p0-feature-entrypoints.md`
- `openspec/specs/api-contract/spec.md`
- `openspec/specs/sprint-ai-memory/spec.md`（上下文/记忆相关术语与失败语义）

## Expected File Changes

| 操作 | 文件路径 |
|------|---------|
| Add | `writenow-frontend/src/features/context/ContextPanel.tsx` |
| Add | `writenow-frontend/src/features/context/useContext.ts` |
| Add | `writenow-frontend/src/features/context/index.ts` |
| Update | `writenow-frontend/src/components/layout/activity-bar.tsx` |
| Update | `writenow-frontend/src/stores/layoutStore.ts` |
| Update | `writenow-frontend/src/components/layout/AppShell.tsx` |
| Update | `writenow-frontend/src/locales/zh-CN.json` |
| Update | `writenow-frontend/src/locales/en.json` |
| Add | `writenow-frontend/tests/e2e/write-mode/context-panel.spec.ts` |

## Acceptance Criteria

- [ ] ActivityBar 存在 “上下文”入口并可打开面板（稳定选择器：`data-testid="activity-tab-context"` 或等价）
- [ ] 面板展示 `context:writenow:status`：exists/watching/rootPath（rootPath 需去敏/可移植）
- [ ] 面板可展示规则片段：
  - [ ] 调用 `context:writenow:rules:get` 并展示 fragments 列表与摘要
  - [ ] `errors[]` 以可读方式展示（不得只打印 console）
- [ ] 面板可展示设定文件清单与读取：
  - [ ] 调用 `context:writenow:settings:list`
  - [ ] 支持读取选中文件：`context:writenow:settings:read`
- [ ] 支持监听控制：
  - [ ] “开始监听/停止监听”按钮分别调用 `context:writenow:watch:start/stop`
  - [ ] UI 状态与 watching 字段一致
- [ ] 安全约束：
  - [ ] UI 不得展示用户机器绝对路径（优先 project-relative 或脱敏显示）

## Tests

- [ ] Playwright E2E：打开 Context 面板 → 能看到 status 区块（exists/watching 字段之一）
- [ ] Playwright E2E：点击刷新/读取动作不会导致崩溃（至少验证按钮存在且链路可运行）

