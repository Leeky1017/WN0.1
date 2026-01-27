## 1. Implementation
- [ ] 1.1 IPC contract：新增 `localLlm:*` 通道与类型；运行 `npm run contract:generate` 同步生成文件
- [ ] 1.2 Electron 主进程：实现并注册 `localLlm:*` handlers（模型就绪/取消/超时/状态广播；错误码稳定）
- [ ] 1.3 Preload：expose `electronAPI.localLlm`（invoke + stream/state 订阅）
- [ ] 1.4 Renderer：新增 TipTap Tab 续写 extension 模块（停顿触发、ghost text、Tab 接受、Esc/输入/光标移动取消）

## 2. Testing
- [ ] 2.1 `npm run contract:check`（确保契约与生成文件无漂移）
- [ ] 2.2 `writenow-frontend`: lint / unit tests / E2E（覆盖 ghost 出现、Tab 接受、取消、超时；WIP 可按 CI 环境跳过限制记录）

## 3. Documentation
- [ ] 3.1 RUN_LOG：`openspec/_ops/task_runs/ISSUE-293.md`（记录关键命令、关键输出与证据）
- [ ] 3.2 Task card：完成后勾选 `P1-002-local-llm-tab.md` 验收项并回填 `Status/Issue/PR/RUN_LOG`
