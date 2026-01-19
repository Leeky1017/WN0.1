# 任务 003: sqlite-vec 向量存储配置

## 目标

在本地 SQLite 中集成 sqlite-vec 扩展，提供可持久化的向量存储与相似度检索能力，为语义搜索与 RAG 提供统一的向量召回底座。

## 依赖

- 任务 001：本地 Embedding 模型打包与调用（用于确定向量维度与写入数据）

## 实现步骤

1. 引入 sqlite-vec：
   - 选择合适的 Node/Electron 集成方式（加载 SQLite 扩展或 NPM 绑定）
   - 处理跨平台二进制（Windows/macOS）与打包策略（`asarUnpack` / `extraResources`）
2. 数据库初始化加载扩展：
   - 打开数据库后加载 sqlite-vec
   - 在失败时返回明确错误与诊断信息（平台/路径/权限）
3. 设计向量表与元信息表：
   - 段落级向量（chunk embedding）：保存 docId/path、章节/偏移、原文片段
   - 实体级向量（character/setting）：保存 name/type、卡片内容、来源引用
4. 实现写入与查询 API：
   - `upsertChunkEmbeddings(chunks[])`
   - `querySimilar(textEmbedding, topK, filters)`
5. 与维度校验联动：
   - 在表初始化时固化维度
   - 当模型维度变化时提供明确迁移策略（重建表/重算 embedding）

## 新增/修改文件

- `electron/db/index.cjs` - 加载 sqlite-vec 扩展（修改）
- `electron/db/schema.sql` - 向量表定义（修改）
- `electron/lib/vectorStore.cjs` - 向量写入/检索封装（新增）

## 验收标准

- [ ] sqlite-vec 扩展可在目标平台加载成功
- [ ] 可写入段落/实体向量，并可按 topK 查询相似结果
- [ ] 维度不匹配时有明确错误与可执行迁移策略

## 参考

- 核心规范：`openspec/specs/writenow-spec/spec.md` 第 217-220 行（向量存储：sqlite-vec）
- 核心规范：`openspec/specs/writenow-spec/spec.md` 第 261-263 行（检索粒度：段落/实体/章节）

