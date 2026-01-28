# Proposal: issue-321-e2e-write-mode-flake-fixes

## Why
CI 的 `e2e-write-mode` 仍会因两类 flake 失败：WM-003 Accept 后 Review UI（`wm-review-root`）不消失、以及 WM-005/teardown 触发 “port 3000 in use” 级联并导致 worker teardown timeout。需要让 Accept 的清理具备确定性兜底，同时让 E2E 在超时/异常路径也能强制释放 backend/electron，避免级联失败。

## What Changes
- 在 E2E 模式下，将 backend PID 文件写入稳定位置（OS tmpdir），使其跨随机 `WN_USER_DATA_DIR` 可被下次启动检测并清理。
- 强化 Playwright E2E 的 teardown：对 `electronApp.close()` 增加有界超时与 SIGKILL 兜底，确保即使 `firstWindow` 失败也会清理 backend。
- 强化 Review Accept：当 editor diff session 丢失/无法重建时，为 “全量选区（Ctrl+A）” 提供安全兜底应用路径，并在成功后强制清理 diff UI 状态。

## Impact
- Affected specs:
  - `openspec/specs/sprint-write-mode-ide/spec.md`（质量门禁：真实 E2E 稳定性）
- Affected code:
  - `writenow-frontend/electron/main.ts`
  - `writenow-frontend/tests/e2e/_utils/writenow.ts`
  - `writenow-frontend/src/features/ai-panel/useAISkill.ts`
- Breaking change: NO
- User benefit: E2E 门禁稳定可用；Review Accept 行为更可靠；CI 失败可定位且不级联。
