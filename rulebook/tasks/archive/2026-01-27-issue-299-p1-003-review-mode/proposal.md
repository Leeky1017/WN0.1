# Proposal: issue-299-p1-003-review-mode

## Why
Write Mode 的 AI 改写必须“可控/可取消/可追溯”：AI 输出需要以可读 diff 呈现，并提供确定性的 Accept/Reject（Esc=Reject），且 Accept 需要写版本历史，避免把 AI 输出直接污染正文或造成不可回退的修改。

## What Changes
- 在 TipTapEditor 统一挂载 AiDiff + Local LLM Tab completion（从 EditorPanel 抽离，避免双栈/并行冲突）。
- useAISkill 驱动 editor 内 diff 预览与 Accept/Reject，并在 Accept 时写入 version snapshots（Before AI / AI Apply）。
- AI Panel 增加 Review Mode UI（wm-review-root + Accept/Reject），并把 Esc 行为接到 rejectDiff（清理 editor decorations）。
- Header/Focus HUD 显示 “Reviewing AI changes” 以明确进入 Review Mode。

## Impact
- Affected specs:
  - openspec/specs/sprint-write-mode-ide/spec.md（AI 可控/可取消/可追溯）
  - openspec/specs/sprint-write-mode-ide/task_cards/p1/P1-003-ai-review-mode.md
- Affected code:
  - writenow-frontend/src/components/editor/TipTapEditor.tsx
  - writenow-frontend/src/features/ai-panel/useAISkill.ts
  - writenow-frontend/src/features/ai-panel/AIPanel.tsx
  - writenow-frontend/src/features/write-mode/WriteModeEditorPanel.tsx
  - writenow-frontend/src/stores/aiStore.ts
  - writenow-frontend/src/styles/globals.css
- Breaking change: NO
- User benefit: AI 改写可审阅、可拒绝、可回退；Tab 续写在 Review 时自动禁用避免冲突。
