---
name: AI Memory Research Report
overview: 基于对 Manus、ChatGPT、Cursor、Clawdbot、Claude Agent Skills 及学术研究的深度调研，为 WriteNow 打造世界级的上下文管理、记忆系统与 SKILL 工程提供技术路线图和设计建议。
todos:
  - id: research-complete
    content: 完成业界调研并整理成完整报告
    status: completed
  - id: p0-skill-context-rules
    content: "[P0] 实现 SKILL context_rules 声明式注入（skills.cjs + ai.cjs）"
    status: pending
  - id: p0-kv-cache-stable-prefix
    content: "[P0] 实现 KV-cache 稳定前缀模板（ai.cjs）- 60-85% 成本降低"
    status: pending
  - id: p1-auto-preference-injection
    content: "[P1] 实现偏好自动注入到 SKILL 流程（memory.cjs → ai.cjs）"
    status: pending
  - id: p1-auto-feedback-tracking
    content: "[P1] 实现采纳/拒绝自动追踪（ai:skill:feedback handler）"
    status: pending
  - id: p2-full-compact-compression
    content: "[P2] 实现历史结果 Full → Compact 压缩（context.cjs）"
    status: pending
  - id: p2-file-based-settings
    content: "[P2] 实现人物/设定文件化存储按需加载（characters.cjs）"
    status: pending
  - id: p3-token-budget-viz
    content: "[P3] 实现 Token 预算可视化（UI 层）"
    status: pending
  - id: future-style-vector
    content: "[Future] 实现 StyleVector 写作风格提取与应用"
    status: pending
  - id: future-knowledge-graph
    content: "[Future] 实现时序知识图谱（人物/事件关系）"
    status: pending
isProject: false
---

# WriteNow 上下文管理与记忆系统研究报告

## 一、核心发现：业界最佳实践

### 1. ChatGPT 记忆功能：为何远超其他 AI？

根据逆向工程分析 [来源: manthanguptaa.in, OpenAI Help Center]，ChatGPT 的记忆系统采用**四层架构**而非传统 RAG：

**架构设计：**

- **Layer 1: Session Metadata**（临时）- 设备、位置、使用模式、屏幕尺寸等
- **Layer 2: User Memory**（持久）- 显式/隐式提取的用户偏好和事实
- **Layer 3: Recent Conversations Summary**（轻量摘要）- 仅用户消息的标题+片段
- **Layer 4: Current Session**（滑动窗口）- 当前会话完整历史

**关键洞察：**

1. **简洁胜于复杂**：不使用向量数据库检索，而是预计算轻量摘要直接注入
2. **选择性记忆**：只存储符合标准的显式事实（名字、职业、偏好）
3. **用户控制**：可管理、删除、关闭记忆，透明度高
4. **2025年4月重大更新**：现在同时使用"保存的记忆"和"对话历史"，使响应更个性化

**为何有效：**

- 减少 Token 成本和延迟（无需实时检索）
- 避免"记忆污染"（只提取用户消息摘要，不包括 AI 回复）
- 渐进式学习（使用越多，越个性化）

---

### 2. Manus：为何 Agent 能力如此强大？

根据 Manus 官方博客 [来源: manus.im/blog]，核心在于**Context Engineering is All You Need**：

**三大支柱策略：**

**A. KV-Cache 优化（最重要的性能指标）**

- **稳定前缀**：保持 system prompt 跨 turn 一致
- **Append-Only Context**：只追加不修改，避免缓存失效
- **确定性序列化**：相同信息必须相同表示（JSON key 顺序、空格一致）
- **效果**：60-85% 成本降低，2-3x 响应速度提升

**B. 文件系统作为无限记忆**

- Sandbox 是隔离的云虚拟机，具备完整 PC 能力
- 将大信息存为文件，只保留路径引用
- 实现"无限上下文窗口"

**C. Masking 而非 Removal**

- 不动态删除不可用的工具（会破坏 KV cache）
- 通过 logit masking 降低工具被选中概率
- 保持上下文稳定性

**三模块架构：**

- **Planner Module**：任务分解和计划更新
- **Knowledge Module**：事件流知识和最佳实践
- **Datasource Module**：外部数据源管理

---

### 3. Cursor 记忆系统

根据 Cursor 1.2 发布说明和文档 [来源: cursor.fan, docs.cursor.com]：

**内置记忆功能（2025年7月 GA）：**

- 自动生成用户偏好记忆
- 支持用户审批后台生成的记忆
- 分层结构：组织策略 > 项目记忆 > 项目规则 > 用户记忆

**MCP 扩展（Graphiti）：**

- 时序知识图谱引擎
- 跨会话信息合成
- 在 Deep Memory Retrieval 基准上达到 94.8% 准确率

---

### 4. 学术前沿：记忆架构演进

**A. Zep/Graphiti 时序知识图谱** [来源: arxiv.org/abs/2501.13956]

- 合成非结构化对话和结构化业务数据
- 维护历史关系
- LongMemEval 上比 MemGPT 提升 18.5%，延迟降低 90%

**B. MemGPT/Letta 分层记忆** [来源: docs.letta.com]

- 两层架构：In-context（核心）+ Out-of-context（外部）
- Agent 自主管理记忆（memory_insert, memory_replace, archival_memory_search）
- 不需要工具调用即可运行

**C. Mem0 开源记忆层** [来源: github.com/mem0ai/mem0]

- 26% 更高响应准确率（对比 OpenAI 方法）
- 91% 更低延迟
- 90% Token 节省

**D. 个性化研究** [来源: arxiv.org]

- **PersonaMem-v2**：隐式偏好学习，2k token 记忆达到 55% 准确率（vs 32k 全历史）
- **StyleVector**：激活空间中的风格向量，8% 个性化提升，1700x 存储节省
- **PerFine**：迭代批评-精炼框架，7-13% GEval 提升

---

## 二、WriteNow 设计建议

### 1. 记忆架构设计（借鉴 ChatGPT 四层模型）

```
┌─────────────────────────────────────────┐
│ Layer 0: System Instructions            │ ← 静态，定义 Agent 行为
├─────────────────────────────────────────┤
│ Layer 1: Session Context                │ ← 临时，设备/时间/当前项目
├─────────────────────────────────────────┤
│ Layer 2: User Profile Memory            │ ← 持久，用户偏好/风格/反馈
├─────────────────────────────────────────┤
│ Layer 3: Project Knowledge Memory       │ ← 项目级，世界观/人物/设定
├─────────────────────────────────────────┤
│ Layer 4: Recent Interactions Summary    │ ← 轻量，最近会话摘要
├─────────────────────────────────────────┤
│ Layer 5: Current Context                │ ← 实时，选区/前后文/当前任务
└─────────────────────────────────────────┘
```

### 2. 用户偏好学习系统

**显式记忆：**

- 用户标记"喜欢这个改写"/"不喜欢这种表达"
- 风格指南手动设置

**隐式记忆（关键创新点）：**

- 采纳/拒绝行为追踪 → 提取偏好模式
- 写作样本分析 → 提取 StyleVector
- 对话上下文推断 → PersonaMem 方法

**存储格式：**

```json
{
  "style_preferences": {
    "verbosity": "concise",      // 从多次拒绝华丽描写推断
    "tone": "informal",          // 从接受的改写样本推断
    "vocabulary_level": "medium"
  },
  "explicit_rules": [
    "不使用'竟然'这个词",
    "对话不用感叹号"
  ],
  "positive_samples": [...],     // 用户满意的段落
  "negative_samples": [...]      // 用户拒绝的改写
}
```

### 3. KV-Cache 优化实践（借鉴 Manus）

**原则：**

- 保持 SKILL prompt 模板稳定（不动态删减）
- 使用 Masking 而非删除来控制行为
- Append-Only 追加上下文
- 确定性序列化所有上下文

**WriteNow 特定优化：**

- 项目设定作为稳定前缀
- 人物/世界观信息结构化存储，按需检索后追加
- 选区上下文最后追加

### 4. 项目知识图谱（借鉴 Zep/Graphiti）

**实体-关系结构：**

```
Character ──[FRIEND_OF]──> Character
Character ──[APPEARS_IN]──> Scene
Scene ──[HAPPENS_AT]──> TimePoint
Event ──[INVOLVES]──> Character
```

**时序感知：**

- 记录实体状态变化时间
- 支持"张三在第三章之前还不知道秘密"这类查询
- 自动检测时间线冲突

### 5. 技术选型建议

| 组件 | 推荐方案 | 理由 |

|------|---------|------|

| 用户记忆存储 | SQLite + JSON | 轻量、本地优先、易于管理 |

| 向量索引 | sqlite-vec | 与现有存储统一 |

| 知识图谱 | 简单版 JSON → 进阶版 SQLite 关系表 | 渐进式复杂度 |

| 偏好学习 | 规则 + 隐式推断 | 不需要 fine-tuning |

| 摘要生成 | LLM 辅助 | 离线批处理 |

---

## 三、实施路线图

### Phase 1: 基础记忆系统（MVP）

- 用户偏好存储（显式）
- 项目设定存储
- 上下文注入规则

### Phase 2: 智能记忆（V1.0）

- 采纳/拒绝行为追踪
- 隐式偏好提取
- 风格样本收集

### Phase 3: 高级个性化（V2.0）

- StyleVector 实现
- 知识图谱构建
- 跨项目偏好学习

---

## 四、SKILL 工程：动态上下文注入的技术本质

### 4.1 核心概念：Dynamic Context Discovery

根据 Cursor 2026年1月技术博客 [来源: cursor.com/blog/dynamic-context-discovery]：

> "随着模型作为 Agent 越来越强大，我们发现成功的关键是**提供更少的前置细节，让 Agent 自己按需拉取相关上下文**。我们称这种模式为 **Dynamic Context Discovery**，与始终包含的静态上下文形成对比。"

**关键发现：MCP 动态加载减少 46.9% Token 消耗**

### 4.2 Claude Agent Skills 架构（最完整的设计）

根据深度逆向工程分析 [来源: leehanchung.github.io]：

**核心洞察：Skills 是 Prompt-Based Meta-Tool，不是可执行代码**

```
Skills = Prompt Template + Conversation Context Injection + Execution Context Modification
```

**两层注入机制：**

| 消息类型 | isMeta 标志 | 用户可见 | 发送到 API | 内容 |

|---------|------------|---------|-----------|------|

| Metadata Message | false | 是 | 是 | 50-200 字符状态指示 |

| Skill Prompt Message | true | 否 | 是 | 500-5000 词详细指令 |

**关键设计：Progressive Disclosure（渐进式披露）**

```
1. 初始加载 → 仅 name + description（最小元数据）
2. 用户触发 → 加载 SKILL.md 完整指令
3. 执行中 → 按需加载 scripts/, references/, assets/
```

### 4.3 Cursor 的五大动态上下文策略

| 策略 | 实现 | Token 效果 |

|------|------|-----------|

| 长响应转文件 | 工具输出写入文件，Agent 用 tail/read 按需读取 | 避免上下文膨胀 |

| 历史引用 | 总结时提供历史文件引用，丢失细节可按需恢复 | 有损压缩 + 按需恢复 |

| Agent Skills 标准 | 支持开放标准，按需加载专业能力 | 动态发现 |

| MCP 工具高效加载 | 工具描述同步到文件夹，仅按需加载 | **减少 46.9% Token** |

| 终端作为文件 | 终端输出同步到文件系统，可 grep 搜索 | 动态发现 |

### 4.4 Agent Skills 开放标准

[来源: agentskills.io]

**标准定义：**

```yaml
# SKILL.md 结构
---
name: skill-name
description: 简短描述（用于 Agent 匹配）
allowed-tools: "Read,Write,Bash"  # 预授权的工具
model: claude-sonnet-4-5  # 可选模型覆盖
---

# 完整指令（仅在 skill 被选中后加载）
## 目的
## 步骤
## 输出格式
## 错误处理
```

**跨平台兼容性：** Anthropic Claude Code、Cursor、Kode CLI 等

### 4.5 Clawdbot "无限记忆" 实现

[来源: docs.clawd.bot]

**核心机制：Compaction + Memory + Session Persistence**

- **Auto-Compaction**：自动将旧对话压缩为摘要条目
- **Silent Memory Flush**：压缩前将重要信息写入磁盘
- **Workspace Files**：USER.md, SOUL.md, IDENTITY.md 等自动注入

### 4.6 Windsurf Memories + Rules 双机制

[来源: docs.windsurf.com]

| 机制 | 生成方式 | 作用 |

|------|---------|------|

| Memories | AI 自动生成 | 保留对话中的相关上下文 |

| Rules | 用户手动定义 | 确保输出符合组织标准 |

**规则层级：** Global > Workspace > System-Level (Enterprise)

---

## 五、WriteNow SKILL 系统设计

### 5.1 技术本质总结

| 要点 | 说明 | WriteNow 应用 |

|------|------|--------------|

| Prompt-Based | Skills 是提示模板，不是代码 | SKILL = Prompt 模板 + 上下文需求 |

| Progressive Disclosure | 先元数据，后完整指令 | SKILL 列表仅显示 name+description |

| Dynamic Discovery | Agent 自主判断需要什么 | 按 SKILL 类型选择注入内容 |

| Context Modification | 修改对话上下文 + 执行上下文 | 注入用户偏好 + 项目设定 |

| isMeta 双层消息 | 用户可见 vs AI 可见分离 | 对用户透明，对 AI 完整 |

| File-Based Memory | 长内容写入文件，按需读取 | 人物设定存文件，按需加载 |

### 5.2 WriteNow SKILL 定义格式

```yaml
# .writenow/skills/polish/SKILL.md
---
name: 润色文本
description: 优化表达和用词，使文字更加流畅优美
context-requirements:
  - user-preferences: style  # 注入用户风格偏好
  - project-settings: style-guide  # 注入项目风格指南
  - surrounding: 500  # 前后各 500 字
allowed-tools: ["edit", "version"]
---

## 任务
润色用户选中的文本，使表达更加优美流畅。

## 规则
1. 保持原意不变
2. 遵循用户偏好：{user_preferences}
3. 遵循风格指南：{style_guide}

## 输出格式
直接返回修改后的文本，用 diff 格式显示变化。
```

### 5.3 SKILL 上下文注入矩阵

| SKILL 类型 | 注入内容 | Token 预算 |

|-----------|---------|-----------|

| 润色/精简 | 用户风格偏好 + 风格指南 + 选区 | ~1500 |

| 扩写 | 前后文 1000 字 + 大纲位置 + 人物设定 | ~3000 |

| 生成对话 | 场景人物设定 + 人物关系 + 前文对话 | ~2500 |

| 一致性检查 | 全文摘要 + 时间线 + 人物出场记录 | ~4000 |

| 续写 | 前文 2000 字 + 大纲后续 + 相关人物 | ~3500 |

### 5.4 Token 优化策略

1. **渐进式披露**：SKILL 列表仅 name+description，触发后加载完整指令
2. **选择性注入**：按 SKILL 的 context-requirements 精确注入
3. **文件化存储**：人物设定等大内容存文件，按需 Read
4. **稳定前缀**：KV-cache 优化，相同 SKILL 类型复用缓存
5. **Full → Compact**：历史 SKILL 结果压缩为摘要

---

## 六、综合设计：ChatGPT 体验 + Manus 工程 + SKILL 动态注入

### 6.1 混合策略

| 目标 | 策略 | 来源 |

|------|------|------|

| 节省 Token | KV-cache 稳定前缀 | Manus |

| 节省 Token | 记忆压缩（full→compact） | Manus |

| 节省 Token | SKILL 动态注入（不预加载全部） | Cursor/Claude |

| 提升质量 | 隐式偏好学习 | ChatGPT |

| 提升质量 | RAG 检索相关上下文 | WriteNow 现有 |

| 提升感知 | 零操作自动化 | ChatGPT |

| 提升感知 | 透明可控（可查看/删除） | ChatGPT |

### 6.2 实施优先级

| 优先级 | 任务 | 效果 |

|-------|------|------|

| P0 | KV-cache 稳定前缀 | 60-85% 成本降低 |

| P0 | SKILL 动态注入架构 | 46.9% Token 节省 |

| P1 | 用户偏好自动化学习 | 零操作个性化 |

| P1 | SKILL 按类型选择性注入 | 精确上下文 |

| P2 | 历史结果压缩 | 长会话支持 |

| P3 | Token 预算可视化 | 成本透明 |

---

## 七、WriteNow 当前实现状态

### 7.1 已实现功能

| 模块 | 文件位置 | 状态 |

|------|---------|------|

| Memory 存储 | `electron/ipc/memory.cjs` | 已实现 |

| 偏好学习 | 集成在 Memory 系统 | 已实现（阈值触发） |

| Context Engineering | `writenow-core/src/node/services/context-service.ts` | 已实现 |

| RAG 检索 | `writenow-core/src/node/rag/retrieval.ts` | 已实现 |

| 对话历史 | Context Service | 已实现 |

### 7.2 待改进项

| 功能 | 当前状态 | 目标状态 |

|------|---------|---------|

| 偏好注入 | 需手动触发 | 自动集成到 SKILL 流程 |

| SKILL 系统 | 未实现专用架构 | 完整 SKILL 动态注入 |

| KV-cache 优化 | 未实现 | 稳定前缀 + Append-Only |

| 用户体验 | 需要配置 | 零操作自动化 |

---

## 八、本地化适配与优化策略

### 8.1 WriteNow 作为本地应用的架构优势

**核心差异：WriteNow 运行在用户本地，仅 LLM API 是云端调用**

| 能力 | Manus/ChatGPT（云端） | WriteNow（本地） | 优势 |

|------|---------------------|-----------------|------|

| 文件系统 | 云端 Sandbox VM | 用户本地 | 天然拥有，无需搭建 |

| 记忆存储 | 云端数据库 | 本地 SQLite | 隐私、无延迟 |

| "无限上下文" | 文件系统模拟 | 本地文件天然支持 | 零成本 |

| 数据持久化 | 需要云端同步 | 本地即持久 | 更可靠 |

| 云端依赖 | 全部 | 仅 LLM API | 成本更低 |

### 8.2 已有的 IPC Tools 系统（无需开发新 Tools/MCPs）

WriteNow 已有 18 个 IPC 模块，这就是它的 "Tools"：

| IPC 模块 | 功能 | 对应云端概念 |

|---------|------|------------|

| `ai.cjs` | AI 调用 | LLM API |

| `skills.cjs` | SKILL 管理 | Agent Skills |

| `memory.cjs` | 记忆系统 | Memory API |

| `context.cjs` | 上下文工程 | Context Service |

| `rag.cjs` | RAG 检索 | Retrieval |

| `characters.cjs` | 人物设定 | Entity Store |

| `knowledgeGraph.cjs` | 知识图谱 | Knowledge Graph |

| `files.cjs` | 文件操作 | File System |

| `search.cjs` | 搜索 | Search |

| `embedding.cjs` | 向量嵌入 | Embedding |

| `outline.cjs` | 大纲管理 | Outline |

| `version.cjs` | 版本控制 | Version Control |

| `export.cjs` | 导出 | Export |

**结论：不需要 MCP，WriteNow 控制整个栈，IPC 就是标准化接口**

### 8.3 云端策略的本地适配

**Manus 策略适配：**

| Manus 策略 | 云端实现 | WriteNow 本地适配 |

|-----------|---------|------------------|

| 文件系统作为无限记忆 | Sandbox VM 文件 | 本地 `.writenow/` 目录 |

| KV-cache 稳定前缀 | 云端缓存 | 相同！LLM API 原生支持 |

| Full → Compact | 云端存储 | 本地 SQLite 存储 |

| Sandbox 隔离 | 云端 VM | 不需要，本地天然隔离 |

**ChatGPT 策略适配：**

| ChatGPT 策略 | 云端实现 | WriteNow 本地适配 |

|-------------|---------|------------------|

| 四层记忆架构 | 云端存储 | 本地 SQLite + 文件 |

| 对话摘要 | 云端计算 | 本地 LLM 调用生成 |

| 用户记忆 | 云端数据库 | 本地 `user_memory` 表 |

| 隐式学习 | 云端分析 | 本地规则 + 阈值 |

### 8.4 需要优化的核心模块

#### 8.4.1 SKILL 动态上下文注入（`skills.cjs` + `ai.cjs`）

**当前状态：** 上下文选择是固定的

**目标状态：** SKILL 声明需要的上下文，自动注入

```javascript
// 目标实现
function selectContextForSkill(skillId, projectId) {
  const skill = readSkillRow(db, skillId)
  const contextRules = JSON.parse(skill.context_rules || '{}')
  
  const context = {}
  if (contextRules.userPreferences) {
    context.userPreferences = selectMemoryForInjection({ db, projectId })
  }
  if (contextRules.projectSettings) {
    context.projectSettings = loadProjectSettings(projectId, contextRules.projectSettings)
  }
  if (contextRules.surrounding) {
    context.surrounding = getSurroundingText(contextRules.surrounding)
  }
  if (contextRules.characters) {
    context.characters = retrieveCharacters(projectId, contextRules.characters)
  }
  return context
}
```

**改进点：**

1. 在 `skills` 表中增强 `context_rules` 字段定义
2. 实现 `selectContextForSkill()` 函数
3. 在 `ai.cjs` 调用前自动组装上下文

#### 8.4.2 偏好自动化注入（`memory.cjs` → `ai.cjs`）

**当前状态：** 需要手动调用 `memory:injection:preview`

**目标状态：** 自动集成到 SKILL 执行流程

```javascript
// 目标实现
handleInvoke('ai:skill:run', async (_evt, payload) => {
  // 1. 自动获取偏好注入
  const memoryContext = await selectMemoryForInjection({ db, config, projectId })
  
  // 2. 组装 prompt（自动注入用户偏好）
  const systemPrompt = buildSystemPrompt({
    skillPrompt: skill.system_prompt,
    userPreferences: memoryContext.items,
    projectSettings: projectSettings,
  })
  
  // 3. 调用 LLM
})
```

**改进点：**

1. 在 SKILL 执行流程中自动调用 `selectMemoryForInjection`
2. 移除手动"预览确认"步骤，改为默认注入
3. 保留透明性（用户可查看注入了什么）

#### 8.4.3 KV-Cache 稳定前缀优化（`ai.cjs`）

**当前状态：** 每次调用可能改变 system prompt 结构

**目标状态：** 固定的 prompt 结构模板

```javascript
// 目标实现
function buildStableSystemPrompt(skill, context) {
  // 固定顺序，固定结构
  return [
    '## 角色',
    ROLE_DEFINITION,  // 固定
    '',
    '## 用户偏好',
    formatPreferences(context.userPreferences),  // 稳定格式
    '',
    '## 项目设定',
    formatProjectSettings(context.projectSettings),  // 稳定格式
    '',
    '## 当前任务',
    skill.system_prompt,
    '',
    '## 输出格式',
    skill.output_format || DEFAULT_OUTPUT_FORMAT,
  ].join('\n')
}
```

**改进点：**

1. 定义固定的 prompt 结构模板
2. 确保相同 SKILL 类型生成相同的前缀结构
3. 使用确定性序列化（JSON key 顺序一致）

#### 8.4.4 采纳/拒绝自动追踪（`ai.cjs` → `memory.cjs`）

**当前状态：** 需要 UI 触发偏好学习

**目标状态：** SKILL 结果处理时自动追踪

```javascript
// 目标实现
handleInvoke('ai:skill:feedback', async (_evt, payload) => {
  const { runId, action, projectId } = payload  // action: 'accept' | 'reject' | 'partial'
  
  if (action === 'accept' || action === 'reject') {
    await handleInvoke('memory:preferences:ingest', null, {
      projectId,
      signals: {
        accepted: action === 'accept' ? [extractSignal(runId)] : [],
        rejected: action === 'reject' ? [extractSignal(runId)] : [],
      }
    })
  }
})
```

**改进点：**

1. 新增 `ai:skill:feedback` IPC handler
2. 接受/拒绝操作自动触发 `memory:preferences:ingest`
3. 用户无需任何额外操作

### 8.5 本地化优势总结

```
WriteNow 技术路径 = 
  ❌ 不需要开发新 Tools/MCPs（已有 18 个 IPC 模块）
  ❌ 不需要云端 Sandbox（本地文件系统天然支持）
  ❌ 不需要云端记忆存储（本地 SQLite）
  ✅ 优化现有 IPC Tools 的调用方式
  ✅ 实现 SKILL 动态上下文注入
  ✅ 实现 KV-cache 稳定前缀
  ✅ 让偏好学习自动化
```

### 8.6 本地化优化任务清单

| 优先级 | 任务 | 涉及模块 | 预期效果 |

|-------|------|---------|---------|

| P0 | SKILL context_rules 声明式注入 | `skills.cjs`, `ai.cjs` | 选择性上下文 |

| P0 | KV-cache 稳定前缀模板 | `ai.cjs` | 60-85% 成本降低 |

| P1 | 偏好自动注入到 SKILL 流程 | `memory.cjs`, `ai.cjs` | 零操作个性化 |

| P1 | 采纳/拒绝自动追踪 | `ai.cjs`, `memory.cjs` | 隐式学习 |

| P2 | 历史结果 Full → Compact | `context.cjs` | 长会话支持 |

| P2 | 人物/设定文件化存储 | `characters.cjs` | 按需加载 |

| P3 | Token 预算可视化 | UI 层 | 成本透明 |

---

## 九、关键引用来源

1. ChatGPT Memory: [openai.com/index/memory-and-new-controls-for-chatgpt](https://openai.com/index/memory-and-new-controls-for-chatgpt/)
2. ChatGPT Memory Reverse Engineering: [manthanguptaa.in/posts/chatgpt_memory](https://manthanguptaa.in/posts/chatgpt_memory/)
3. Manus Context Engineering: [manus.im/blog/Context-Engineering-for-AI-Agents](https://manus.im/blog/Context-Engineering-for-AI-Agents-Lessons-from-Building-Manus)
4. Manus Sandbox: [manus.im/blog/manus-sandbox](https://manus.im/blog/manus-sandbox)
5. Cursor Dynamic Context Discovery: [cursor.com/blog/dynamic-context-discovery](https://cursor.com/blog/dynamic-context-discovery)
6. Cursor 1.2 Features: [cursor.fan/ar/blog/2025/07/03/cursor-1-2](https://cursor.fan/ar/blog/2025/07/03/cursor-1-2-agent-planning-better-context-faster-tab)
7. Claude Agent Skills Deep Dive: [leehanchung.github.io/blogs/2025/10/26/claude-skills-deep-dive](https://leehanchung.github.io/blogs/2025/10/26/claude-skills-deep-dive/)
8. Agent Skills Open Standard: [agentskills.io](https://agentskills.io/)
9. Clawdbot Compaction: [docs.clawd.bot/concepts/compaction](https://docs.clawd.bot/concepts/compaction)
10. Windsurf Memories: [docs.windsurf.com/windsurf/cascade/memories](https://docs.windsurf.com/windsurf/cascade/memories)
11. Zep/Graphiti Paper: [arxiv.org/abs/2501.13956](https://arxiv.org/html/2501.13956)
12. Letta/MemGPT Docs: [docs.letta.com/guides/agents/memory](https://docs.letta.com/guides/agents/memory)
13. Mem0 Research: [mem0.ai/research](https://mem0.ai/research)
14. PersonaMem-v2: [arxiv.org/abs/2512.06688](https://arxiv.org/html/2512.06688v1)
15. StyleVector: [aclanthology.org/2025.acl-long.353](https://aclanthology.org/2025.acl-long.353/)
16. OpenAI Agents SDK: [cookbook.openai.com/examples/agents_sdk/context_personalization](https://cookbook.openai.com/examples/agents_sdk/context_personalization)
17. Anthropic Memory Tool: [anthropic.com/news/context-management](https://www.anthropic.com/news/context-management)