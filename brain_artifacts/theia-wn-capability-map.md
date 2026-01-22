# Theia ↔ WriteNow Capability Map（brain artifacts）

> 本文为能力融合地图（非 OpenSpec 权威规范），用于把 “WriteNow 现有能力/概念” 映射到 “Theia 的模块/扩展点”，帮助拆解迁移任务与识别缺口。

## 1) 高层映射

| WriteNow 能力/概念 | Theia 对应概念 | 迁移备注 |
|---|---|---|
| 主界面布局（左侧导航/侧边栏/主编辑/右侧 AI） | ApplicationShell + Widgets | 先搭骨架（P1-007），面板逐步 widget 化迁移 |
| 编辑器（TipTap / 双模式） | Custom Editor Widget / Opener | `.md` 绑定到 TipTap widget；Markdown 作为 SSOT；快捷键冲突需治理 |
| 快捷键（Cmd/Ctrl+K 等） | CommandRegistry + KeybindingRegistry | 必须建立“分层路由”：编辑器内 vs 全局命令；避免双触发 |
| Electron IPC（invoke + streaming events） | JSON-RPC (request/response + notifications) | 复用 contract pipeline；推荐单一 `invoke(channel)` 适配层 |
| 项目（projectId + userData/projects） | Workspace / File Explorer | 存储语义决策是根问题：workspace-first vs userData-first vs hybrid |
| 文件读写（documents 目录） | FileSystem API | 对齐 workspace root；禁止双路径并存 |
| SQLite（schema + CRUD） | Backend service (Node) | 重点是 native 分发与 DB 路径；迁移后仍应保持可恢复 |
| FTS + sqlite-vec（语义搜索） | Backend service + native extension | 需要 PoC 验证加载/查询/打包 |
| RAG（indexer/retrieval/budget） | Backend service + watcher | 逻辑可复用度高；受 storage model 与 vec 可用性影响 |
| Embedding（worker + ONNX 资产） | Backend service (worker_threads) | 验证资产兼容性；失败需降级且可观测 |
| AI 面板（流式对话/技能执行） | Widget + RPC stream | 需要 RPC 双向事件；取消/超时必须稳定 |
| 版本历史（文字的 Git） | Widget + Backend DB service | 与保存/dirty 强耦合；必须与 TipTap widget 一致 |
| 知识图谱 | Widget | 本 Sprint 不重写，只迁移壳体与数据接线 |
| SKILL 系统（发现/索引/运行） | Backend service + Commands + UI | tasks 004–010 暂停；001–003 可继续但要适配 RPC 变化 |
| E2E（Playwright + 真实持久化） | E2E harness (custom) | 迁移后仍需黑盒 + 真实持久化；存储语义决定测试隔离方式 |

## 2) 关键缺口/新增工程点

1) **Theia 自定义 editor 的绑定与保存体系**：需要把 TipTap widget 接入 Theia 的 Saveable/dirty 生命周期。
2) **RPC streaming**：AI 流式输出需要 notifications/progress channel，并在 UI 中可取消/可恢复。
3) **存储语义与“项目”概念**：WriteNow 的项目心智模型需要在 Theia workspace 上重新落地（hybrid 是候选）。
4) **native 分发策略**：better-sqlite3 / sqlite-vec / embedding assets 的跨平台发布要成为一等工程问题。

