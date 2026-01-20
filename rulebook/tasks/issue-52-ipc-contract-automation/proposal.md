# Proposal: issue-52-ipc-contract-automation

## Why
WriteNow 的 IPC 契约目前在主进程（handlers）、preload allowlist、渲染进程 TypeScript 类型三处同时维护，极易发生漂移；一旦漂移，要么 CI/构建无法发现，要么运行时报错（通道被阻止/类型不匹配）。需要把“主进程契约”为唯一类型来源，并用自动化生成与 CI 检测硬阻断漂移。

## What Changes
- 新增主进程侧 IPC 契约类型声明：`electron/ipc/contract/ipc-contract.cjs`
- 新增契约同步脚本：`scripts/ipc-contract-sync.js`（generate/check）
- 新增生成文件：`src/types/ipc-generated.ts`，并将 `src/types/ipc.ts` 调整为 re-export
- `electron/preload.cjs` 的 invoke allowlist 由脚本自动同步（markers + generate/check）
- CI 新增 `npm run contract:check` 步骤阻断漂移
- 新增 Vitest（Node）端到端测试，确保 contract check 可运行
- OpenSpec：更新 `openspec/specs/api-contract/spec.md`，新增 design/tasks

## Impact
- Affected specs: `openspec/specs/api-contract/spec.md` + `openspec/specs/api-contract/design/*` + `openspec/specs/api-contract/tasks/*`
- Affected code: `scripts/ipc-contract-sync.js`, `electron/preload.cjs`, `electron/ipc/contract/ipc-contract.cjs`, `src/types/ipc-generated.ts`, `src/types/ipc.ts`, `.github/workflows/ci.yml`
- Breaking change: NO (类型入口 `src/types/ipc.ts` 保持不变；仅改为自动生成实现)
- User benefit: IPC 契约改动可一键生成 + CI 硬阻断漂移，降低回归与线上风险
