# Design: 后端能力暴露缺口

## 现状分析

后端有大量已实现的功能模块，但前端无对应入口。

### 后端模块与前端状态

| 模块 | IPC 命令 | 前端入口 | 优先级 |
|------|---------|---------|-------|
| Memory | `memory:*` | 无 | P2 |
| Stats | `stats:*` | 无（应显示在状态栏） | P0 |
| Constraints | `constraints:*` | 无 | P3 |
| Outlines | `outlines:*` | 无（应有大纲面板） | P1 |
| Characters | `characters:*` | 无 | P2 |
| Export | `export:*` | 无（应有导出菜单） | P1 |
| Update | `update:*` | 无 | P2 |
| Preferences | `preferences:*` | 无（应有设置面板） | P0 |
| AI | `ai:*` | 仅 AI Panel | P1 |
| Context | `context:*` | 无调试界面 | P3 |
| Embedding | `embedding:*` | 无 | P3 |
| RAG | `rag:*` | 无直接入口 | P3 |

### 数据库表与前端状态

| 表名 | 前端展示 | 优先级 |
|------|---------|-------|
| documents | 有 | - |
| document_chunks | 无 | P3 |
| chunk_embeddings | 无 | P3 |
| snapshots | 无（应有版本历史） | P1 |
| outlines | 无（应有大纲面板） | P1 |
| user_memory | 无 | P2 |
| writing_stats | 无（应有统计面板） | P1 |
| characters | 无（应有角色管理） | P2 |
| terminology | 无（应有术语表） | P2 |
| world_settings | 无 | P3 |

## 设计方案

### P0 优先暴露

1. **Stats 模块**：状态栏显示字数统计
2. **Preferences 模块**：设置面板

### P1 优先暴露

1. **Outlines 模块**：大纲导航面板
2. **Export 模块**：File > Export 菜单
3. **Snapshots 表**：版本历史增强
4. **Writing Stats 表**：写作统计面板

### P2 优先暴露

1. **Characters 模块**：角色管理面板
2. **Terminology 表**：术语表管理
3. **Memory 模块**：记忆查看器
4. **Update 模块**：自动更新 UI

### P3 未来暴露

1. **Context 模块**：上下文调试器
2. **Embedding/RAG 模块**：语义搜索 UI
3. **Constraints 模块**：约束编辑器

## 文件变更预期

见各功能对应的设计文档。
