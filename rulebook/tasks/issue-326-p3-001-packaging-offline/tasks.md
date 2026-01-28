## 1. Implementation
- [x] 1.1 补齐/统一 electron-builder 配置（`extraResources` / `asarUnpack` / 输出目录等）
- [x] 1.2 实现资源打包准备脚本：强制构建 Theia backend + 校验产物完整性（含 `schema.sql`）
- [x] 1.3 离线字体：移除 Google Fonts 依赖，改为随包本地字体（仅加载默认字体，避免拖慢输入）
- [x] 1.4 随包模型：支持 packaged 目录下模型被检测到并按需复制到 `userData/models`

## 2. Testing
- [x] 2.1 新增可自动化的 packaging smoke（脚本或最小 E2E），验证：可启动/后端 ready/日志落盘
- [x] 2.2 跑前端单测 + lint + OpenSpec validate，并记录证据到 RUN_LOG

## 3. Documentation
- [x] 3.1 更新 `design/05-packaging.md`：随包资源清单 + 合规信息（来源/许可证/hash/版本）
- [ ] 3.2 回填 task card：验收项勾选 + 元信息（Issue/PR/RUN_LOG）
