## 1. Implementation
- [x] 1.1 盘点现有 E2E 运行方式：Electron 启动参数、userData 隔离、CI/本地差异点
- [x] 1.2 增加/统一 E2E helper：标准化 `electron.launch` + `WN_USER_DATA_DIR=<tmp>` + 关键 env（`WN_E2E=1` 等）
- [x] 1.3 标准化诊断包：失败时自动保存 trace + screenshot + `main.log`（必要时附加到 Playwright artifacts）
- [x] 1.4 新增/补齐“核心创作主路径”用例：启动→新建/打开→编辑→保存/自动保存→关闭重开验证持久化
- [x] 1.5 新增/补齐“AI 路径 + 边界分支”用例：至少覆盖成功 + 2 个错误分支（`CANCELED`/`TIMEOUT`/`UPSTREAM_ERROR`）

## 2. Testing
- [x] 2.1 本地跑 Playwright（smoke + 关键用例），并记录运行证据到 RUN_LOG
- [ ] 2.2 校验失败可诊断：手动制造一次失败，确认 trace/screenshot/main.log 均产出且可定位

## 3. Documentation
- [ ] 3.1 更新任务卡 `P2-001-e2e-playwright.md` 勾选验收项并补齐 Completion 元信息
- [ ] 3.2 补充/更新 E2E 运行说明（如新增脚本或约定）
