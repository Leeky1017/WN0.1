# Proposal: Sprint 4 Release Implementation（Update/Export/i18n/Publish）

## Goal
在 Sprint 4 范围内交付可发布能力：自动更新（electron-updater）、多格式导出（Markdown/Word/PDF）、基础 i18n（中文/英文）与多平台发布格式适配（模板导出 + 剪贴板）。

## Scope
- Implement `openspec/specs/sprint-4-release/spec.md` + `openspec/specs/sprint-4-release/tasks/*` in order.
- Keep IPC contracts consistent with `openspec/specs/api-contract/spec.md` and `src/types/ipc.ts`.
- Add Playwright Electron E2E coverage for all user-facing flows in this issue.

## Non-Goals
- 平台 API 直发与授权体系（Sprint 4 out of scope）
- 复杂排版/出版级样式（优先保证导出可用与可复制）

