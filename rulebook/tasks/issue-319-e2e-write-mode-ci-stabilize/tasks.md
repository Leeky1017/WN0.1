## 1. Implementation
- [ ] 1.1 从 GitHub Actions 下载失败 run 的日志与 artifacts，明确 flake 触发点（WM-003 / WM-005 / teardown）。
- [ ] 1.2 修复 AI Review Accept 的不确定性：Accept 失败时重建 diff session 并重试一次；失败需落可读错误信息（禁止 silent failure）。
- [ ] 1.3 修复 E2E teardown 的后端残留：启动时捕获 backend PID，并在 app 关闭/强杀后可靠 kill，避免端口占用导致后续启动卡死。
- [ ] 1.4 统一 crash helper 并替换用例中的局部实现，确保 WM-005 强杀后能可靠清理并重启。

## 2. Testing
- [ ] 2.1 本地门禁：`npm run contract:check` / `npm run build`；`writenow-frontend` 下 `npm run lint` / `npm run build:electron`（记录到 RUN_LOG）。
- [ ] 2.2 CI 门禁：确认 PR 上 `e2e-write-mode` 通过（trace/artifact 仍按约定产出）。

## 3. Documentation
- [ ] 3.1 `openspec/_ops/task_runs/ISSUE-319.md`：补齐关键命令、关键输出与证据路径（Runs 只追加）。
