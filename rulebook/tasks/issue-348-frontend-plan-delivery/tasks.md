## 1. Implementation
- [x] 1.1 集成 i18next + react-i18next（bootstrap + 资源文件）
- [x] 1.2 Settings：语言切换 + 持久化（重启后保持）
- [x] 1.3 Settings：Update 管理 UI 接入 `update:*`（getState/check/download/install/skip/clearSkipped + 进度/错误态）
- [x] 1.4 增量 a11y 基线：icon-only aria-label 兜底、折叠按钮 aria-label、状态/错误 role 基线
- [x] 1.5 为 E2E 提供稳定定位点（如 ActivityBar tab 的 `data-testid`）

## 2. Testing
- [x] 2.1 `writenow-frontend`: `npm run lint`
- [x] 2.2 `writenow-frontend`: `npm run test`
- [x] 2.3 `writenow-frontend`: `npm run build`
- [x] 2.4 E2E：新增 `i18n-language-switch` 与 `update-ui` 覆盖（以 CI/非 WSL Electron 环境运行）
- [ ] 2.5 E2E：在非 WSL 环境实际运行并收集证据（本地 WSL 环境会 skip）

## 3. Documentation
- [x] 3.1 创建/更新 RUN_LOG：`openspec/_ops/task_runs/ISSUE-348.md`（只追加 Runs）
- [x] 3.2 补齐 Rulebook task/spec：`rulebook/tasks/issue-348-frontend-plan-delivery/specs/*/spec.md`
- [ ] 3.3 PR 创建后回填：PR 链接 + `Closes #348` + checks 证据
