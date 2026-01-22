# Spec Delta: sprint-theia-migration (Issue #106)

## Purpose

将 Theia 迁移 Sprint 的范围与可验收目标固化为 spec-first 的单一事实来源，确保迁移以“PoC 定风险 → Scaffold 建基座 → Core Migration 平移关键链路”的方式推进，并同步暂停与迁移方向冲突的既有规范，避免路线图漂移。

SSOT：

- `openspec/specs/sprint-theia-migration/spec.md`
- `openspec/specs/sprint-theia-migration/design/*`
- `openspec/specs/sprint-theia-migration/task_cards/*`

## Requirements (Index)

- PoC（迁移前必须定生死）
  - Theia + TipTap：输入/焦点/快捷键可协作
  - Theia backend + native：better-sqlite3 + sqlite-vec 可加载与查询
  - 存储语义：userData-first vs workspace-first（或混合）做出决策并列出影响面
- Scaffold（最小壳体 + 模块裁剪）
  - generator-theia-extension 初始化最小应用
  - 裁剪调试器/终端/Git/语言服务器/问题面板/任务运行器等非目标模块
  - 基础布局与品牌可配置
- Editor Widget（TipTap）
  - `.md` 文件类型绑定
  - 焦点与快捷键冲突“分层路由”
  - Save/Dirty 生命周期一致且失败可观测
- IPC → RPC（契约与错误语义保持稳定）
  - `handleInvoke` 注入模式映射到 Theia JSON-RPC
  - `IpcResponse<T>`（ok/err + 错误码）语义保持稳定
  - contract pipeline 漂移护栏保持有效
- Data layer（SQLite/RAG/Embedding）
  - 迁移 schema 与初始化
  - 迁移 RAG indexer/retrieval
  - 验证 embedding ONNX 资产兼容性与降级策略

## Notes

- Paused due to Theia migration decision (2026-01-22):
  - `openspec/specs/wn-frontend-deep-remediation/`
  - `openspec/specs/sprint-ide-advanced/`
  - `openspec/specs/skill-system-v2/` tasks 005–010
  - Sprint 6 remaining items

## References

- `openspec/specs/sprint-theia-migration/spec.md`

