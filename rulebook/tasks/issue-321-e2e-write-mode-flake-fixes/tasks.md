## 1. Implementation
- [x] 1.1 E2E backend PID：在 E2E 模式下写入稳定 pid 文件（跨随机 `WN_USER_DATA_DIR`）并确保可被清理。
- [x] 1.2 E2E teardown：为 Electron close/kill 增加有界超时与兜底，确保异常路径也会清理 backend/port。
- [x] 1.3 Review Accept：增加 “diff session 丢失” 的安全兜底（含 Ctrl+A 全量选区场景），并在成功后清理 Review UI 状态。

## 2. Testing
- [x] 2.1 本地门禁：`npm run contract:check`；`writenow-frontend` 下 `npm run lint`、`npm run build`、`npm run build:electron`。
- [ ] 2.2 CI 门禁：watch `e2e-write-mode` 直到跑绿（必要时迭代修复）。

## 3. Documentation
- [x] 3.1 新增 `openspec/_ops/task_runs/ISSUE-321.md` 并按关键步骤追加 Runs（命令 + 关键输出 + 证据）。
- [x] 3.2 为本任务补齐最小 spec delta（Rulebook task 内 `specs/*/spec.md`），并通过 `rulebook task validate`。
