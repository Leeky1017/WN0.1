# Sprint 3：智能上下文（2 周）

## Purpose

在 Sprint 3 内交付 WriteNow 的「智能上下文」基础设施：SQLite FTS5 全文检索、本地 Embedding（`text2vec-base-chinese`）与 sqlite-vec 向量存储，以及可被 AI SKILL 复用的最小 RAG 检索管线（人物/设定为第一优先级）。

本规范是 `openspec/specs/writenow-spec/spec.md` 在 Sprint 3 范围内的可执行增量（索引 + 检索 + 基础 RAG）。

## Requirements

### Requirement: 系统 MUST 支持 SQLite FTS5 全文索引

#### Scenario: 首次启动完成索引初始化
- **WHEN** 应用首次启动并检测到全文索引不存在
- **THEN** 必须创建 FTS5 虚拟表，并完成对既有文档的索引构建（至少覆盖 `title` / `content` / `characters` / `tags`）

#### Scenario: 文档保存后索引保持一致
- **WHEN** 用户保存/自动保存一篇文档
- **THEN** 必须同步更新全文索引，确保搜索结果与最新内容一致

---

### Requirement: 系统 MUST 集成本地 Embedding 模型并可离线运行

Embedding 默认模型 MUST 为 `shibing624/text2vec-base-chinese`（中文优化，~100MB）。

#### Scenario: 本地生成 embedding
- **WHEN** 系统需要为段落/实体生成向量
- **THEN** 必须在本地完成 embedding 计算（不得依赖 Python 运行时），并返回稳定维度的向量结果

#### Scenario: 模型资源可用与错误提示
- **WHEN** 模型资源缺失/损坏导致无法加载
- **THEN** 必须给出明确错误信息与恢复路径（重新下载/重新初始化），禁止 silent failure

---

### Requirement: 系统 MUST 使用 sqlite-vec 作为向量存储并支持相似度检索

#### Scenario: 向量写入与检索
- **WHEN** 段落/实体的 embedding 生成成功
- **THEN** 必须写入 sqlite-vec 表，并支持按 `topK` + 相似度查询返回最相关的结果列表

#### Scenario: 维度一致性
- **WHEN** 向量表初始化或模型变更导致维度变化
- **THEN** 必须拒绝写入不匹配维度的向量，并提供迁移策略（重建索引/重算向量）

---

### Requirement: 系统 MUST 提供基础 RAG 检索接口（人物/设定优先）

#### Scenario: 针对当前选区检索上下文
- **WHEN** 用户在编辑器中选中文本并触发任意 AI SKILL
- **THEN** 系统必须执行 RAG 检索并产出结构化上下文包（人物/设定卡片 + 相关段落/章节），用于注入到 AI 请求中

#### Scenario: 上下文大小可控
- **WHEN** 检索结果过多可能导致 prompt 过长
- **THEN** 系统必须对上下文进行裁剪/去重/排序，并保证输出在可配置预算内

---

### Requirement: 人物/设定 MUST 支持智能检索与引用

#### Scenario: 识别人物/设定并召回卡片
- **WHEN** 选区/指令中出现人物名、地点或设定关键词
- **THEN** 系统必须召回对应的设定卡片（精确匹配优先，语义召回兜底），并将来源（文档/片段）附带在上下文包中

#### Scenario: 设定冲突可被发现（Sprint 3 仅提供证据）
- **WHEN** 检索到多个可能冲突的设定描述
- **THEN** 上下文包必须保留多个证据片段与其来源，供后续一致性检查 SKILL 使用

## Out of Scope（Sprint 3 不包含）

- 更高级的上下文工程：外挂记忆系统、长期偏好学习、跨项目知识库
- 复杂检索策略：时间线推理、关系图谱、学习型 rerank
- 云端向量存储与同步（pgvector/Supabase 等）
- 完整搜索 UI（Sprint 3 以数据层与可复用接口为主，UI 可最小化）

## Notes（实现约束与建议）

- 检索粒度：以段落为最小 embedding 单元，保留章节/文件路径等结构信息用于回溯引用。
- 性能：索引构建应可增量更新；embedding 计算应支持后台队列与取消。
- 资产策略：Embedding 模型与 sqlite-vec 扩展应随应用发布打包或可离线缓存，避免运行时强依赖网络。

## References

- 核心规范：`openspec/specs/writenow-spec/spec.md` 第 167-184 行（FTS5 全文索引）
- 核心规范：`openspec/specs/writenow-spec/spec.md` 第 186-216 行（语义搜索 + 本地 Embedding 方案）
- 核心规范：`openspec/specs/writenow-spec/spec.md` 第 217-220 行（向量存储：sqlite-vec）
- 核心规范：`openspec/specs/writenow-spec/spec.md` 第 227-264 行（RAG 流程/策略/粒度）
- 核心规范：`openspec/specs/writenow-spec/spec.md` 第 872-877 行（Sprint 3 范围）

