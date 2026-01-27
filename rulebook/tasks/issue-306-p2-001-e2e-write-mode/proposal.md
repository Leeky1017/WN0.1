# Proposal: issue-306-p2-001-e2e-write-mode

## Why
Write Mode 是写作主路径，必须用真实 Playwright Electron E2E 把“主路径 + 取消/超时/恢复”变成系统默认质量门禁，避免回归与数据丢失。

## What Changes
- 新增 Write Mode 专属 E2E 目录：`writenow-frontend/tests/e2e/write-mode/`
- 迁移并标记现有 SSOT/Review/Focus 用例为 `@write-mode`
- 补齐 WM-001..WM-005：主路径、Focus、AI diff/取消/超时/错误、强制关闭恢复
- 全部用例断言真实落盘文件（`WN_USER_DATA_DIR/documents/*.md`）

## Impact
- Affected specs: `openspec/specs/sprint-write-mode-ide/spec.md`, `openspec/specs/sprint-write-mode-ide/design/03-quality-gates.md`
- Affected code: `writenow-frontend/tests/e2e/write-mode/*.spec.ts`, `writenow-frontend/tests/e2e/_utils/*`
- Breaking change: NO
- User benefit: 写作主路径具备可重复、可诊断的 E2E 质量门禁，降低回归风险。
