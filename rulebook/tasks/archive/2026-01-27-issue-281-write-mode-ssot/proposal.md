# Proposal: issue-281-write-mode-ssot

## Why
当前 `writenow-frontend` 的 Write Mode 仍停留在 demo（静态文件树 + contentEditable editor + demo AI panel），无法形成“真实写作主路径”的信任闭环；必须接通真实 `file:*` 与保存状态 SSOT，避免双栈与 silent failure（不丢稿）。

## What Changes
- 替换 `AppShell` 主路径 demo UI：接入真实 `file:list/read/write`、使用 `TipTapEditor` 作为主画布，并将 AI Panel 接到真实 `useAISkill` 编排。
- 建立 Write Mode 容器（`features/write-mode/*`）承接“连接/文件打开/保存调度”，让布局与展示组件保持薄 props。
- 统一保存状态 SSOT（`statusBarStore.saveStatus` + `editorFilesStore` per-file dirty/saveStatus），贯穿 Header/StatusBar/FileTree，并在断连时明确降级为“不可保存/只读”。

## Impact
- Affected specs:
  - `openspec/specs/sprint-write-mode-ide/spec.md`（Write Mode SSOT；数据可靠性与可观测性）
  - `openspec/specs/sprint-write-mode-ide/design/01-write-mode-ux.md`（布局/状态机/稳定选择器）
- Affected code:
  - `writenow-frontend/src/App.tsx`
  - `writenow-frontend/src/components/layout/AppShell.tsx`
  - `writenow-frontend/src/components/layout/{header,footer}.tsx`
  - `writenow-frontend/src/features/{write-mode,ai-panel,file-tree}/*`
  - `writenow-frontend/src/stores/{statusBarStore,editorFilesStore,layoutStore}.ts`
- Breaking change: YES（删除 demo 主路径引用；统一到单链路）
- User benefit: Explorer/编辑器/保存/AI 进入真实链路，用户可持续看到“是否已保存/是否可保存”，降低丢稿风险并便于排障。
