## 1. Implementation
- [x] 1.1 P2-001（ai-memory）：Full→Compact 数据结构 + compaction 触发条件 + 事件记录 + 可回溯引用（project-relative）
- [x] 1.2 P2-002（ai-memory）：设定文件规范 + 按需加载/裁剪 + 引用返回（project-relative）+ 稳定错误码（NOT_FOUND/IO_ERROR 等）
- [x] 1.3 注入可观测：Compact refs / settings refs 可在 `injected.refs`（或等价调试输出）中审计

## 2. Testing
- [x] 2.1 E2E：长历史触发 compaction，后续注入使用 Compact 且引用可追溯
- [x] 2.2 E2E：context_rules.characters/style_guide 控制按需加载；缺失/IO 错误码稳定且 UI 不挂起

## 3. Documentation
- [x] 3.1 RUN_LOG：记录关键命令与输出证据（lint/test/e2e/openspec validate）
- [x] 3.2 Task cards：勾选验收项并补齐 `Status/Issue/PR/RUN_LOG`

