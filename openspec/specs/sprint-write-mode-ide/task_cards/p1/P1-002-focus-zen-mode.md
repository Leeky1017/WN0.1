# P1-002: Focus/Zen 模式 + Esc 优先级（取消 AI / 退出 Review / 退出 Focus）

## 元信息

| 字段 | 值 |
|------|-----|
| ID | P1-002 |
| Phase | P1 - Write Mode UX / 交互模型 |
| 优先级 | P0 |
| 状态 | Planned |
| 依赖 | P0-001, P1-001 |

## 必读前置（执行前必须阅读）

- [ ] `openspec/specs/sprint-write-mode-ide/spec.md`（Write Mode / Focus Mode Requirements）
- [ ] `design/01-write-mode-ux.md`（Focus/Zen UI 行为 + Esc 优先级）
- [ ] `design/02-editor-performance.md`（Focus 动画/布局不应影响输入性能）
- [ ] `writenow-frontend/src/stores/layoutStore.ts`（布局持久化）

## 目标

实现“写作沉浸”子状态，且行为稳定、可测：

1) 一键进入/退出 Focus/Zen（快捷键 + cmdk）
2) Focus 时隐藏非必要 UI，但保留关键反馈（保存/AI/错误）
3) Esc 优先级稳定（避免用户困惑）

## 任务清单

- [ ] 1) 定义 Focus 状态 SSOT
  - [ ] 新增 `focusMode: boolean`（建议落在 `layoutStore`，保证持久化）
  - [ ] 明确：任何组件不得自建 `isFocus` 本地 state（防双状态机）
- [ ] 2) UI 折叠规则落地
  - [ ] Focus 时隐藏：ActivityBar / Sidebar / AI Panel / Footer（或按 spec 的折叠规则）
  - [ ] Header 变为轻量 HUD 或保持薄 header（必须可配置）
  - [ ] 保留：保存状态 / AI 状态 / 错误提示（HUD）
- [ ] 3) 快捷键与命令入口
  - [ ] `Cmd/Ctrl+\\` 切换 Focus
  - [ ] cmdk command：Toggle Focus Mode
- [ ] 4) Esc 行为优先级（必须写成代码注释 + E2E）
  - [ ] 若 Review Mode 存在：Esc 先退出 Review
  - [ ] 否则 AI 正在运行：Esc 取消 AI（第二次 Esc 再退出 Focus）
  - [ ] 否则 Focus 开启：Esc 退出 Focus
  - [ ] 否则 Esc 关闭 overlay（cmdk/settings/popover）
- [ ] 5) 稳定选择器（E2E）
  - [ ] Focus HUD：`data-testid="wm-focus-hud"`
  - [ ] Focus root：`data-testid="wm-focus-root"`（用于断言布局变化）

## 验收标准

- [ ] Focus 打开时：侧栏与 AI panel 不可见（宽度=0 或 display none）
- [ ] Focus 打开时：仍可连续输入（不会丢焦点/不会卡顿）
- [ ] Esc 优先级符合 `design/01`，且至少 1 条 E2E 覆盖（AI cancel + Focus exit）

## 产出

- `writenow-frontend/src/stores/layoutStore.ts`（新增 focusMode + 持久化）
- `writenow-frontend/src/features/write-mode/*`（Focus 状态与布局实现）
- `writenow-frontend/src/components/layout/*`（HUD/布局折叠）

