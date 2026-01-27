# P0-001: Write Mode 单链路（SSOT）—— 替换 demo UI，接通真实数据/编辑器/AI

## 元信息

| 字段 | 值 |
|------|-----|
| ID | P0-001 |
| Phase | P0 - 单链路统一（SSOT） |
| 优先级 | P0 |
| 状态 | Planned |
| 依赖 | - |

## 必读前置（执行前必须阅读）

- [ ] `openspec/specs/sprint-write-mode-ide/spec.md`（Write Mode Requirements）
- [ ] `design/00-strategy.md`（单链路 + DoD/DoR）
- [ ] `design/01-write-mode-ux.md`（Write Mode 形态 + 状态机）
- [ ] `design/04-migration-unification.md`（删除/统一清单）
- [ ] `openspec/specs/api-contract/spec.md`（错误码与 Envelope）

## 目标

把 Write Mode 变成“真实主路径”（SSOT）：

1) **主画布必须是 TipTapEditor**（禁止 demo contentEditable 进入主路径）
2) **AI Panel 必须连接真实 AI 编排**（skills/stream/cancel/diff）
3) **Explorer 必须使用真实 file:list 数据**（禁止静态 FileItem 列表）
4) **删除 demo 入口**（不保留双路径）

## 任务清单

- [ ] 1) 识别并列出当前主路径的 demo/stub 入口（必须具体到 import 关系）
  - [ ] `writenow-frontend/src/components/layout/AppShell.tsx` 引用 `../editor/Editor`（demo）
  - [ ] `writenow-frontend/src/components/layout/AppShell.tsx` 引用 `../ai-panel/AIPanel`（demo）
  - [ ] `AppShell` 内部硬编码 `FileItem` 列表（stub Explorer）
- [ ] 2) 新增/改造 Write Mode 容器（建议：`features/write-mode/WriteModePage.tsx`）
  - [ ] 容器负责：连接 store/hook，向下传递“薄 props”
  - [ ] 禁止在 presentational component 中直接调用 RPC（保持可测/可维护）
- [ ] 3) 用 TipTapEditor 替换 demo Editor
  - [ ] 主画布改为渲染 `TipTapEditor`（`data-testid="tiptap-editor"` 必须保留）
  - [ ] 建立 editor runtime 接口：activeEditor + selection snapshot（复用 `editorRuntimeStore`）
- [ ] 4) AI Panel 接入真实 AI store/hook
  - [ ] 新建 `writenow-frontend/src/features/ai-panel/AIPanel.tsx`（连接 `useAISkill` + `useAIStore`）
  - [ ] 删除或移出主路径：`writenow-frontend/src/components/ai-panel/AIPanel.tsx`
  - [ ] AppShell 右侧改为渲染 features AIPanel
- [ ] 5) Explorer 接入真实文件树
  - [ ] 使用 `features/file-tree/useFileTree.ts` 替换 AppShell 的静态文件列表
  - [ ] 文件操作（新建/删除/重命名）必须走 `file:*` 通道（真实后端）
- [ ] 6) 统一布局状态（避免双状态机）
  - [ ] AppShell 不再维护 `isSidebarOpen/isAiPanelOpen/...` 本地 state
  - [ ] 改为使用 `stores/layoutStore.ts` 作为唯一来源（并确保可持久化）
- [ ] 7) 删除策略（强制）
  - [ ] 删除 demo 入口或将其移动到 dev-only（且 CI guard 禁止主路径引用）
  - [ ] 在同一 PR 内完成“替换 + 删除”（不接受长期并存）

## 验收标准

- [ ] Write Mode 主画布不再引用 `components/editor/Editor.tsx`（可用 `rg` 验证）
- [ ] Write Mode 右侧 AI Panel 可加载真实 skills，并可发起一次 run（成功或可诊断失败均可）
- [ ] Explorer 展示真实 `file:list` 返回的文件（不是静态 mock）
- [ ] 不存在双入口：同一功能只有唯一入口/状态机/持久化来源（按 `design/04` 自查）
- [ ] E2E 可使用稳定选择器定位（至少：`tiptap-editor`, `ai-panel`, `wm-file-tree`）

## 产出

- `writenow-frontend/src/features/write-mode/WriteModePage.tsx`（或等价容器）
- `writenow-frontend/src/components/layout/AppShell.tsx`（替换为真实链路）
- `writenow-frontend/src/features/ai-panel/AIPanel.tsx`（真实 AI Panel UI）
- 删除/移除：`writenow-frontend/src/components/ai-panel/AIPanel.tsx`、`writenow-frontend/src/components/editor/Editor.tsx`（或移到 dev-only 并加 guard）

## 备注 / 风险

- 风险：Theia backend 未连接时 UI 需要明确降级（只读/不可保存），否则会造成“看起来能写但其实不落盘”的信任灾难。
- 风险：迁移期间最容易出现“双状态机”（local state + store）。必须把“唯一来源”写清并删掉另一套。

