# Notes — ISSUE-223 (Sprint Frontend V2)

## Scope
- Implement openspec/specs/sprint-frontend-v2 Phases P0-P6 in writenow-frontend (standalone React app) + Electron integration.

## Key constraints
- Tech stack locked by sprint spec (Vite 6, React 18, TS strict, Tailwind 4, shadcn/ui + Radix, TipTap, FlexLayout, react-arborist, cmdk, sonner, Framer Motion, Zustand, TanStack Query, Electron 34 + electron-vite).
- IPC contract: src/types/ipc-generated.ts (must remain consistent; frontend uses it for typed RPC).
- No silent failure; IPC/UI must surface TIMEOUT/CANCELED, etc.

## Findings (initial)
- P0/P1 纠偏（已在 worktree 中完成但尚未提交）：
  - `writenow-frontend/package.json`：React 19 + Vite 7 → 调整为 React 18.3.1 + Vite 6.x（符合 sprint spec）。
  - 主题与 Tokens：拆分 `tokens.css`（基础 tokens）+ `themes/*.css`（主题语义变量），默认 Midnight。
  - shadcn/ui：补齐 Radix primitives（Dialog/Dropdown/Tabs/Tooltip/ScrollArea/Separator/Popover/Select/Switch/ContextMenu）并对齐 tokens。
  - 文件树：移除 demo data，修复 `file:list` 响应字段（`items`），并串联真实后端 `file:*` 通道（create/read/write/delete）。
  - FlexLayout：修复持久化与 reset（Cmd/Ctrl+\\ 清空存储并重置），补齐稳定 tabset ids（sidebar/editor/bottom/ai）。

## Open questions / decisions
- AI streaming：`/standalone-rpc` 目前是 request/response。要实现流式输出，需：
  - 方案 A（优先）：独立连接 Theia JSON-RPC `ws://localhost:3000/services/writenow/ai`（notifications: `onStreamEvent`）与 `/services/writenow/skills`（skills 列表）。
  - 方案 B：扩展 `StandaloneFrontendBridge` 支持 backend→frontend 推送通知（需要桥接 AiServiceClient）。
- HTML 导出：IPC contract 当前仅有 `export:markdown/docx/pdf`，无 `export:html`。可用前端 TipTap HTML 导出作为 HTML 产出，或补充 contract（需谨慎避免破坏契约）。

## Later (parking lot)
- Visual polish (P7) intentionally out-of-scope for this issue.
