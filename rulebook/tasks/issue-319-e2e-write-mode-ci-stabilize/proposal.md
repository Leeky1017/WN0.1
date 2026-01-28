# Proposal: issue-319-e2e-write-mode-ci-stabilize

## Why
`e2e-write-mode` 已作为 Write Mode 的质量门禁，但当前在 `main` 上持续失败（worker teardown timeout / AI Review Accept 后 UI 未清理 / 崩溃恢复重启卡住），导致合并门禁失效并违背 `sprint-write-mode-ide` 的“真实 E2E + 稳定性”要求。

## What Changes
1) 提升 AI Review Accept 的确定性：当 `acceptAiDiff()` 因 editor state 不一致返回失败时，自动重建 diff session 后重试一次，避免 UI 残留在 review 状态。

2) 提升 E2E teardown/恢复的稳定性：E2E 启动时捕获后端 PID，并在 app 关闭/强杀后强制清理后端进程，避免残留进程占用 3000 端口导致后续 relaunch 卡死与 worker teardown timeout。

3) 统一 crash helper：Write Mode 的崩溃恢复用例使用统一的强制关闭 + 清理逻辑，减少测试间差异带来的 flake。

## Impact
- Affected specs:
  - `openspec/specs/sprint-write-mode-ide/spec.md`（E2E 稳定性 / 质量门禁）
  - `openspec/specs/sprint-write-mode-ide/design/03-quality-gates.md`（flake 策略/诊断包）
- Affected code:
  - `writenow-frontend/src/features/ai-panel/useAISkill.ts`
  - `writenow-frontend/tests/e2e/_utils/writenow.ts`
  - `writenow-frontend/tests/e2e/write-mode/*`
- Breaking change: NO
- User benefit: Review Accept 行为更稳定；减少后台残留进程导致的“启动失败/端口占用”。 
