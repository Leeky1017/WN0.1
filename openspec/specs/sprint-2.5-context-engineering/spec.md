# Sprint 2.5：上下文工程（Context Engineering）

## Purpose

在 Sprint 2.5 内交付 WriteNow 的「上下文工程」基础设施：以 **ContextAssembler** 统一管理多来源上下文，并通过 **分层上下文模型 + KV-Cache 友好 Prompt 结构 + Token 预算管理 + 对话历史管理 + 可视化调试**，为 Sprint 2（AI SKILL）提供稳定、可控、可观测的上下文注入能力，并为 Sprint 3（RAG）/Sprint 5（项目管理）/Sprint 6（体验增强）提供清晰扩展点。

成功指标（可验收）：
- KV-Cache 命中率 > 70%（通过稳定前缀与 append-only 结构实现）
- 上下文组装延迟 < 50ms（不含网络与模型推理）
- Token 预算超标率 0%（严格裁剪并可解释）
- 上下文可视化：用户可查看每次 AI 调用的完整上下文与分层 Token 统计

## Requirements

### Requirement: 系统 MUST 实现分层上下文架构（Layer 1-4）

#### Scenario: 四层上下文模型
- **WHEN** 系统为任意 AI 请求组装上下文
- **THEN** MUST 将上下文拆分为 4 个层级并保持语义边界：
  - Layer 1 - 规则层（Rules）：始终加载（项目风格/术语/硬约束）
  - Layer 2 - 设定层（Settings）：按需加载（人物/世界观/时间线等）
  - Layer 3 - 检索层（Retrieved）：动态检索（RAG 结果、历史摘要、相关段落）
  - Layer 4 - 即时层（Immediate）：实时同步（选区、光标上下文、用户指令）
- **THEN** 每个片段 MUST 可追溯来源（文件路径/模块标识）并可用于调试展示

#### Scenario: 上下文组装顺序
- **WHEN** 用户触发任意 AI SKILL
- **THEN** `ContextAssembler` MUST 按 Layer 1 → 2 → 3 → 4 的顺序组装
- **THEN** 组装结果 MUST 可被 TokenBudgetManager 执行严格预算裁剪（不得超标）

---

### Requirement: 系统 MUST 实现 KV-Cache 友好的 Prompt 结构

#### Scenario: 稳定前缀（Stable Prefix）
- **WHEN** 构建 Prompt 的 System Prompt
- **THEN** MUST 保持稳定前缀（结构与顺序稳定）
- **THEN** MUST NOT 在稳定前缀中包含时间戳、随机数等动态元素
- **THEN** 项目规则/写作约束/稳定的 SKILL 定义 SHOULD 放在稳定前缀中

#### Scenario: Append-only 对话结构
- **WHEN** 在同一会话内发送多次请求
- **THEN** 历史消息 MUST 保持不变且只追加新消息（append-only）
- **THEN** MUST NOT 修改/删除历史消息（避免破坏 KV-Cache）

#### Scenario: Prompt 模板标准化（稳定前缀 + 动态后缀）
- **WHEN** `ContextAssembler` 输出可发送的 Prompt
- **THEN** MUST 满足如下结构（允许扩展但不得打乱稳定段落）：
  - System Prompt（稳定前缀）：SKILL 定义 / 输出格式 / 项目规则
  - User Content（动态部分）：人物设定 / 历史摘要 / 选区与光标上下文 / 用户指令

---

### Requirement: 系统 MUST 实现 Token 预算管理（分配 + 裁剪 + 统计）

#### Scenario: 预算分配策略
- **WHEN** 系统初始化 Token 预算
- **THEN** MUST 提供按层级分配的可配置预算（total + per-layer）
- **THEN** 预算默认值 SHOULD 与模型上下文窗口能力解耦（允许按 model/profile 切换）

#### Scenario: 预算超标处理（严格且可解释）
- **WHEN** 任一层级内容超过预算
- **THEN** MUST 按优先级裁剪，并保留可解释的裁剪记录：
  1. 删除相关性最低的 Retrieved（如 RAG 结果）
  2. 精简 Settings（只保留关键信息/摘要）
  3. 缩短 Immediate（减少前后文范围）
- **THEN** MUST NOT 进行“硬截断”（例如截断到句子中间）

#### Scenario: Token 使用统计
- **WHEN** `ContextAssembler` 输出组装结果
- **THEN** MUST 返回每层级 `used/budget` 与总计 `total/limit`
- **THEN** 统计结果 MUST 可用于 UI 可视化与日志证据

---

### Requirement: 系统 MUST 实现 `.writenow/` 项目目录结构（File System as Context）

#### Scenario: 标准目录结构
- **WHEN** 用户在某个项目目录中启用上下文工程
- **THEN** MUST 识别并使用 `.writenow/` 作为上下文根目录，且至少支持：
  - `project.json`
  - `rules/`（style.md / terminology.json / constraints.json）
  - `characters/`、`settings/`
  - `conversations/`（index + 完整对话记录）
  - `cache/`（如 embeddings）

#### Scenario: 文件加载策略（规则预加载 + 设定按需）
- **WHEN** 应用启动并加载项目
- **THEN** `rules/` 下文件 MUST 预加载并缓存
- **WHEN** AI 请求触发
- **THEN** `characters/` 与 `settings/` MUST 支持按需加载（基于实体/引用信号）

#### Scenario: 文件变更监听与索引触发
- **WHEN** `.writenow/` 下任意文件发生变更
- **THEN** 系统 MUST 自动重新加载并更新缓存
- **THEN** 若变更影响检索索引（如 Settings），MUST 触发后续 Sprint 的索引重建钩子（本 Sprint 提供接口与事件，不实现 RAG）

---

### Requirement: 系统 MUST 实现编辑器上下文同步（Editor Context Sync）

#### Scenario: 编辑器状态同步（实时且最小必要）
- **WHEN** 用户在编辑器中操作（选区变化/光标移动/内容编辑）
- **THEN** 以下状态 MUST 同步到 Store，供 `ContextAssembler` 读取：
  - 选中文本（可为空）
  - 光标位置（行/列）
  - 当前段落
  - 前后 N 段上下文（可配置）

#### Scenario: 同步防抖与性能
- **WHEN** 用户快速移动光标或频繁选区变化
- **THEN** 同步 MUST 使用 debounce（默认 200ms，可配置）
- **THEN** MUST 不得导致编辑器卡顿或明显掉帧

#### Scenario: 实体检测触发预加载
- **WHEN** Immediate 内容中出现人物/地点等实体名称
- **THEN** 系统 SHOULD 触发 Settings 预加载（Phase 1：字符串匹配；Phase 2：NER 作为扩展点）

---

### Requirement: 系统 MUST 实现对话历史管理（持久化 + 摘要 + 检索）

#### Scenario: 对话持久化与索引更新
- **WHEN** AI 对话结束或达到持久化阈值
- **THEN** MUST 保存完整对话到 `.writenow/conversations/` 并生成/更新 `index.json`
- **THEN** 索引 MUST 包含摘要、主题、使用过的 SKILL、用户接受/拒绝偏好信号，以及可恢复的 fullPath

#### Scenario: 可恢复压缩（只注入摘要）
- **WHEN** 历史对话被注入到 Prompt 中
- **THEN** MUST 只注入摘要（节省 Token），并保留可恢复引用（文件路径/对话 id）

#### Scenario: “像上次那样” 引用处理
- **WHEN** 用户指令包含“像上次/之前那样”等引用
- **THEN** 系统 MUST 检索相关历史对话摘要并提取关键策略/偏好注入上下文
- **THEN** 检索与注入 MUST 在 Token 预算内完成且可解释

---

### Requirement: 系统 MUST 提供上下文可视化调试（Context Viewer）

#### Scenario: 上下文预览（分层展示）
- **WHEN** 用户在 AI 面板中展开“查看上下文”
- **THEN** MUST 展示本次请求的完整 Prompt（按层级分区：Rules/Settings/Retrieved/Immediate）
- **THEN** 每个片段 MUST 展示来源与 token 数量

#### Scenario: Token 使用与裁剪证据
- **WHEN** TokenBudgetManager 发生裁剪
- **THEN** MUST 在 UI/日志中提供裁剪摘要（被删片段、原因、节省 token）
- **THEN** MUST NOT 静默裁剪导致用户不可解释的结果偏差

## Out of Scope（Sprint 2.5 不包含）

- Sprint 3 的完整 RAG 实现（embedding/向量检索/rerank 等）
- 复杂的实体识别（NER）与学习型上下文选择（本 Sprint 提供扩展点）
- 云端记忆/跨设备同步/团队协作上下文
- Tool masking / constrained decoding 的工程化落地（仅作为设计参考）

## Notes（实现约束与建议）

- 上下文工程是“可实证优化”的系统：优先保证可观测（可视化、token 统计、裁剪证据），再逐步优化策略。
- `.writenow/` 是长期记忆与项目结构的单一事实源：避免将大段设定硬塞进会话历史。
- 预算裁剪必须是“语义安全”的：按 chunk 边界裁剪；如需压缩，优先可恢复摘要而非不可逆截断。

## References

- 参考方法论：`docs/reference/manus-context-engineering/README.md`
- 高级实践：`docs/reference/manus-context-engineering/advanced-practices.md`
- 核心规范：`openspec/specs/writenow-spec/spec.md` 第 382 行（上下文透明性：可查看发送的完整上下文）
- Sprint 2：`openspec/specs/sprint-2-ai/spec.md`（AI SKILL + 流式 + Diff）
- Sprint 3：`openspec/specs/sprint-3-rag/spec.md`（检索层 Retrieved 的后续落地）

