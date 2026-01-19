# 任务 002: SQLite FTS5 全文索引实现

## 目标

在本地 SQLite 中建立 FTS5 全文索引，实现人物名/情节关键词等快速检索能力，并在文档保存/删除时保持索引一致性，为后续 RAG 的“稀疏检索”（keyword retrieval）提供基础召回。

## 依赖

- Sprint 1：文件系统文档管理（创建/读取/写入/删除）

## 实现步骤

1. 建立本地数据库基础设施：
   - 选择数据库文件位置（用户数据目录）
   - 引入并封装 `better-sqlite3` 的连接管理与迁移机制
2. 设计全文索引结构（与核心规范示例一致）：
   - 创建 FTS5 虚拟表（例如 `articles_fts(title, content, characters, tags)`）
   - 设计索引数据来源：以“文件路径”为主键，保存必要元信息与内容快照用于索引
3. 实现索引构建与增量更新：
   - 应用首次启动/数据库初始化：扫描既有文档并批量建索引
   - 文档保存：更新对应索引行
   - 文档删除：移除对应索引行
4. 提供全文搜索接口：
   - 主进程实现 `searchFulltext(query, options)`（支持 limit/offset）
   - 返回结果包含：文档标识、命中片段（snippet）、排序分数（如 `bm25`）
5. （可选）模糊匹配与体验增强：
   - 先支持 FTS5 前缀/通配查询（`*`）作为最小可用
   - 若后续引入 `spellfix1`，再补全“拼写容错”

## 新增/修改文件

- `electron/db/index.cjs` - SQLite 连接与迁移（新增）
- `electron/db/schema.sql` - 表结构与 FTS5 初始化（新增）
- `electron/ipc/search.cjs` - 全文检索 IPC（新增）
- `electron/main.cjs` - 注册 IPC（修改）

## 验收标准

- [ ] FTS5 虚拟表可成功创建并可查询
- [ ] 文档保存/删除后索引保持一致（结果与磁盘内容一致）
- [ ] 支持至少以下用例：人物名检索、情节关键词检索、命中片段展示
- [ ] 搜索失败时返回明确错误信息（禁止 silent failure）

## 参考

- 核心规范：`openspec/specs/writenow-spec/spec.md` 第 167-184 行（FTS5 示例与能力）

