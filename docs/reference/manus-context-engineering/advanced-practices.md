# 高级技术实践指南

本文档深入探讨 Manus 上下文工程的技术细节，提供可落地的实践方案。

> ⚠️ **来源声明**
> - 第一、二、三部分内容来自 **2025年10月 LangChain × Manus 联合研讨会**，非原博客内容
> - 第四部分 Prompt 模板为 **WriteNow 适配设计**，非 Manus 原文
> - 第五部分 OpenManus 代码结构为 **基于开源仓库的推断**，可能与实际实现有差异
> - 所有代码示例为 **示意性伪代码**，非可直接运行的生产代码

---

## 一、LangChain × Manus 研讨会核心内容

> 来源：2025年10月14日 LangChain × Manus 公开研讨会

### 研讨会信息

**主讲人**
- Lance Martin (LangChain)
- 季逸超 "Peak" Ji (Manus Co-Founder)

**核心主题**：对抗"上下文爆炸"

当 Agent 执行长时间任务时，会不断累积消息和工具输出，导致上下文窗口快速膨胀。

---

## 二、三大高级策略详解

### 策略一：上下文缩减 (Context Reduction)

**问题**：工具输出往往很长（如网页内容、文件内容），快速消耗上下文窗口。

**Manus 方案：双形态工具结果**

```python
# 工具返回两种形态
class ToolResult:
    full: str       # 完整结果，用于首次返回
    compact: str    # 压缩结果，用于历史上下文

# 策略驱动的压缩
def policy_compaction(result: ToolResult, policy: str) -> str:
    if policy == "keep_full":
        return result.full
    elif policy == "use_compact":
        return result.compact
    elif policy == "schema_summary":
        return extract_schema_summary(result.full)
```

**Schema 驱动摘要**

```python
# 从工具输出中提取结构化摘要
def extract_schema_summary(content: str) -> str:
    """
    将长文本压缩为结构化摘要
    例如：网页 -> { title, main_points[], links[] }
    """
    # 使用 LLM 生成摘要
    return llm.summarize(
        content,
        schema={"title": str, "main_points": list, "links": list}
    )
```

**WriteNow 应用**

```python
# 对于长文章的上下文注入
class ArticleContext:
    def get_context(self, article_id: str, skill_type: str) -> str:
        article = self.get_article(article_id)
        
        if skill_type in ["polish", "rewrite"]:
            # 短任务：只需要当前段落
            return self.get_compact_context(article)
        elif skill_type in ["consistency_check"]:
            # 分析任务：需要结构化摘要
            return self.get_schema_summary(article)
        else:
            # 生成任务：需要更多上下文
            return self.get_full_context(article)
    
    def get_schema_summary(self, article) -> str:
        return f"""
        标题：{article.title}
        字数：{article.word_count}
        大纲：{article.outline}
        人物：{[c.name for c in article.characters]}
        当前章节：{article.current_chapter}
        """
```

### 策略二：上下文隔离 (Context Isolation)

**问题**：单一 Agent 承担所有任务，上下文过载。

**Manus 方案：最小化子 Agent**

```
┌─────────────┐
│   Planner   │ ← 规划任务，产出 todo 列表
└──────┬──────┘
       │
       ▼
┌─────────────┐
│  Knowledge  │ ← 管理知识，按需检索
│   Manager   │
└──────┬──────┘
       │
       ▼
┌─────────────┐
│  Executor   │ ← 执行具体任务
└─────────────┘
```

**Agent-as-Tool 范式**

```python
# 将 Agent 封装为 Tool
class PlannerTool:
    def __call__(self, task: str) -> str:
        """规划任务，返回步骤列表"""
        return self.planner_agent.plan(task)

class KnowledgeTool:
    def __call__(self, query: str) -> str:
        """检索相关知识"""
        return self.knowledge_agent.retrieve(query)

# 主 Agent 调用子 Agent
main_agent.tools = [
    PlannerTool(),
    KnowledgeTool(),
    ExecutorTool(),
]
```

**WriteNow 应用**

对于创作场景，可以考虑：

```
┌─────────────────┐
│  Context Agent  │ ← 负责收集相关上下文
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│  Creator Agent  │ ← 负责内容创作/改写
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│  Review Agent   │ ← 负责检查一致性
└─────────────────┘
```

但对于 WriteNow V1，建议先使用单 Agent + 智能上下文选择。

### 策略三：上下文卸载 (Context Offloading)

**问题**：Token 密集型信息占用大量上下文。

**Manus 方案：分层行为空间**

```
Layer 1: Function Calling
├── 直接调用：read_file(), write_file()
├── 轻量级，Token 开销小
└── 适合简单操作

Layer 2: Sandbox Utilities
├── 沙盒执行：run_code(), browse_web()
├── 中等 Token 开销
└── 结果可压缩

Layer 3: Packages & APIs
├── 外部调用：call_api(), install_package()
├── 高 Token 开销（结果可能很长）
└── 必须使用压缩策略
```

**文件系统状态管理**

```python
# 将状态持久化到文件而非保持在上下文中
class StateManager:
    def __init__(self, workspace_dir: str):
        self.workspace = workspace_dir
    
    def save_plan(self, plan: dict):
        """将计划保存到文件"""
        with open(f"{self.workspace}/todo.md", "w") as f:
            f.write(self.format_plan(plan))
    
    def load_plan(self) -> dict:
        """从文件加载计划"""
        with open(f"{self.workspace}/todo.md") as f:
            return self.parse_plan(f.read())
    
    def save_character(self, character: dict):
        """保存人物设定"""
        path = f"{self.workspace}/characters/{character['name']}.md"
        with open(path, "w") as f:
            f.write(self.format_character(character))
```

**WriteNow 应用**

```python
# 项目设定存储在外部文件
class ProjectContext:
    def __init__(self, project_dir: str):
        self.settings_file = f"{project_dir}/.writenow/settings.json"
        self.characters_dir = f"{project_dir}/.writenow/characters/"
        self.outline_file = f"{project_dir}/.writenow/outline.md"
    
    def get_relevant_context(self, current_text: str) -> str:
        """根据当前文本智能选择相关上下文"""
        # 检测文本中提到的人物
        mentioned_chars = self.detect_characters(current_text)
        
        # 只加载相关人物的设定
        context_parts = []
        for char_name in mentioned_chars:
            context_parts.append(self.load_character(char_name))
        
        return "\n".join(context_parts)
```

---

## 三、KV 缓存优化实践

### Token 使用比例

Manus 数据：输入 Token : 输出 Token ≈ 100 : 1

这意味着：
- 90% 以上的成本来自输入 Token
- 上下文管理直接影响成本

### 缓存命中率优化

**成本对比**
- 缓存未命中：$3.00 / 百万 Token
- 缓存命中：$0.30 / 百万 Token
- **10 倍成本差异！**

**优化策略**

```python
class PromptBuilder:
    def build_prompt(self, skill: Skill, context: dict) -> str:
        """构建高缓存命中率的 prompt"""
        
        # 1. 稳定前缀（不变部分放前面）
        prefix = self.get_stable_prefix(skill)
        
        # 2. 半稳定部分（项目级上下文）
        project_context = self.get_project_context(context)
        
        # 3. 动态部分（每次变化的内容放最后）
        dynamic_content = self.get_dynamic_content(context)
        
        return f"{prefix}\n\n{project_context}\n\n{dynamic_content}"
    
    def get_stable_prefix(self, skill: Skill) -> str:
        """返回 SKILL 的固定 system prompt"""
        return f"""你是 WriteNow 的写作助手。

## SKILL: {skill.name}
{skill.description}

## 输出要求
{skill.output_format}
"""
```

### Append-Only 上下文

```python
class ConversationContext:
    def __init__(self):
        self.messages = []
    
    def add_message(self, role: str, content: str):
        """只追加，不修改历史"""
        self.messages.append({
            "role": role,
            "content": content,
            "timestamp": time.time()
        })
    
    def get_context(self, max_tokens: int = 4000) -> list:
        """获取上下文，必要时压缩旧消息"""
        if self.estimate_tokens() <= max_tokens:
            return self.messages
        
        # 压缩旧消息，保留新消息
        return self.compress_old_messages(max_tokens)
    
    def compress_old_messages(self, max_tokens: int) -> list:
        """压缩旧消息而非删除"""
        # 保留最近的消息完整
        recent = self.messages[-5:]
        
        # 压缩更早的消息
        older = self.messages[:-5]
        summary = self.summarize_messages(older)
        
        return [{"role": "system", "content": f"[历史摘要] {summary}"}] + recent
```

---

## 四、文件系统上下文设计理念

> ⚠️ 本部分整合 Manus 原文 + Cursor 实践 + WriteNow 适配设计

### 核心理念：文件系统 = 无限持久记忆

```
┌─────────────────────────────────────────────────────────┐
│                    LLM Context Window                    │
│  ┌─────────────────────────────────────────────────────┐ │
│  │  受限的、易失的、昂贵的                              │ │
│  │  • Token 有上限                                     │ │
│  │  • 每次请求重新计算                                 │ │
│  │  • 越长越贵、越慢                                   │ │
│  └─────────────────────────────────────────────────────┘ │
└─────────────────────────────────────────────────────────┘
                            ↓ 卸载到
┌─────────────────────────────────────────────────────────┐
│                      文件系统                            │
│  ┌─────────────────────────────────────────────────────┐ │
│  │  无限的、持久的、便宜的                              │ │
│  │  • 容量无上限                                       │ │
│  │  • 持久化存储                                       │ │
│  │  • 按需读取                                         │ │
│  └─────────────────────────────────────────────────────┘ │
└─────────────────────────────────────────────────────────┘
```

---

### 4.1 历史对话索引与摘要策略

**问题**：长对话会导致上下文爆炸，但直接截断会丢失关键信息。

**解决方案：可恢复压缩 (Recoverable Compression)**

```
原始对话 (10,000 tokens)
    ↓
摘要化 → 保存原文到文件 → 上下文只保留摘要 + 文件路径
    ↓
压缩后 (500 tokens) + 可恢复的完整历史
```

**WriteNow 实现方案**

```typescript
/**
 * 对话历史管理器
 * 实现可恢复压缩的对话历史存储
 */
interface ConversationManager {
  // 对话存储目录结构
  // .writenow/conversations/
  // ├── index.json              # 对话索引（摘要 + 元数据）
  // ├── conv_001.json           # 完整对话记录
  // ├── conv_002.json
  // └── summaries/
  //     ├── conv_001_summary.md # 对话摘要
  //     └── conv_002_summary.md
}

interface ConversationIndex {
  id: string;
  articleId: string;           // 关联的文章
  createdAt: string;
  updatedAt: string;
  messageCount: number;
  summary: string;             // 核心摘要（保留在上下文中）
  keyTopics: string[];         // 关键话题（用于检索）
  fullPath: string;            // 完整对话文件路径（需要时加载）
}

// 上下文注入时的策略
function buildConversationContext(
  currentConv: Conversation,
  historyIndex: ConversationIndex[],
  tokenBudget: number
): string {
  const parts: string[] = [];
  
  // 1. 当前对话完整保留
  parts.push(formatCurrentConversation(currentConv));
  
  // 2. 历史对话只注入摘要
  const relevantHistory = historyIndex
    .filter(h => h.articleId === currentConv.articleId)  // 同文章优先
    .slice(-5);  // 最近 5 次
  
  if (relevantHistory.length > 0) {
    parts.push("## 历史对话摘要");
    for (const h of relevantHistory) {
      parts.push(`- [${h.createdAt}] ${h.summary}`);
    }
    parts.push("（完整历史可通过 retrieve_conversation(id) 获取）");
  }
  
  return parts.join("\n");
}
```

**摘要生成策略**

```typescript
/**
 * 对话摘要生成
 * 在对话结束或达到阈值时触发
 */
async function generateConversationSummary(
  conversation: Conversation
): Promise<string> {
  // 使用 LLM 生成结构化摘要
  const prompt = `
请为以下 AI 写作助手对话生成简洁摘要：

${formatMessages(conversation.messages)}

摘要要求：
1. 一句话概括用户的主要需求
2. 列出关键的修改/建议
3. 标注用户的偏好信号（接受/拒绝了什么）

输出格式：
{
  "summary": "用户请求...",
  "changes": ["修改1", "修改2"],
  "preferences": {"accepted": [...], "rejected": [...]}
}
`;
  
  return await llm.generate(prompt);
}
```

---

### 4.2 项目规则文件设计（.writenow/rules）

**灵感来源**：Cursor 的 `.cursorrules` 文件设计

**WriteNow 适配**：创建 `.writenow/` 项目配置目录

```
.writenow/
├── project.json              # 项目元数据
├── rules/
│   ├── style.md              # 写作风格规则
│   ├── terminology.json      # 术语表
│   └── constraints.json      # 写作约束
├── characters/
│   ├── 张三.md               # 人物设定卡片
│   └── 李四.md
├── settings/
│   ├── world.md              # 世界观设定
│   └── timeline.md           # 时间线
├── conversations/
│   ├── index.json            # 对话索引
│   └── *.json                # 完整对话记录
└── cache/
    ├── embeddings/           # 向量缓存
    └── summaries/            # 摘要缓存
```

**项目规则文件示例 (style.md)**

```markdown
# 写作风格指南

## 语言风格
- 使用简洁、现代的中文表达
- 避免文言文和过度修辞
- 对话要自然，符合人物性格

## 禁止事项
- 不使用"竟然"、"居然"等惊叹词
- 不使用"不得不说"等口水话
- 不使用省略号开头的句子

## 人称视角
- 第三人称限制视角（主角视角）
- 不出现"他心想"之外的心理描写

## AI 行为指引
当执行润色时，请：
1. 保持原文风格
2. 不改变情节走向
3. 只修改表达，不增删内容
```

**规则加载与注入**

```typescript
class ProjectRulesLoader {
  private projectDir: string;
  
  /**
   * 加载项目规则作为 System Prompt 前缀
   */
  async loadRules(): Promise<string> {
    const rules: string[] = [];
    
    // 1. 写作风格（始终加载）
    const styleRule = await this.loadFile('rules/style.md');
    if (styleRule) rules.push(`## 写作风格\n${styleRule}`);
    
    // 2. 术语表（始终加载，保持一致性）
    const terminology = await this.loadJSON('rules/terminology.json');
    if (terminology) {
      rules.push(`## 术语规范\n请使用以下标准术语：`);
      for (const [term, aliases] of Object.entries(terminology)) {
        rules.push(`- ${term}（而非：${aliases.join('、')}）`);
      }
    }
    
    // 3. 约束规则
    const constraints = await this.loadJSON('rules/constraints.json');
    if (constraints?.forbiddenWords) {
      rules.push(`## 禁止使用的词汇\n${constraints.forbiddenWords.join('、')}`);
    }
    
    return rules.join('\n\n');
  }
  
  /**
   * 根据 SKILL 类型加载相关设定
   */
  async loadContextForSkill(
    skillType: string,
    mentionedEntities: string[]
  ): Promise<string> {
    const context: string[] = [];
    
    // 人物设定（按需加载）
    for (const entity of mentionedEntities) {
      const charFile = `characters/${entity}.md`;
      if (await this.fileExists(charFile)) {
        context.push(`### 人物：${entity}\n${await this.loadFile(charFile)}`);
      }
    }
    
    // 一致性检查需要时间线
    if (skillType === 'consistency_check') {
      const timeline = await this.loadFile('settings/timeline.md');
      if (timeline) context.push(`### 时间线\n${timeline}`);
    }
    
    return context.join('\n\n');
  }
}
```

---

### 4.3 上下文文件的生命周期管理

**文件类型与更新策略**

| 文件类型 | 更新频率 | 缓存策略 | 索引方式 |
|---------|---------|---------|---------|
| 项目规则 (rules/) | 手动更新 | 启动时加载，watch 变更 | 全量加载 |
| 人物设定 (characters/) | 手动更新 | 按需加载，缓存 | 文件名匹配 + 语义搜索 |
| 世界设定 (settings/) | 手动更新 | 按需加载 | SKILL 类型映射 |
| 对话历史 (conversations/) | 自动更新 | 索引常驻，内容按需 | 时间序 + 摘要搜索 |
| 缓存文件 (cache/) | 自动更新 | 定期清理 | 内部使用 |

**增量更新策略**

```typescript
class ContextFileWatcher {
  private cache: Map<string, { content: string; mtime: number }> = new Map();
  
  /**
   * 智能加载：仅在文件变更时重新读取
   */
  async loadWithCache(path: string): Promise<string> {
    const stat = await fs.stat(path);
    const cached = this.cache.get(path);
    
    if (cached && cached.mtime >= stat.mtimeMs) {
      return cached.content;  // 缓存命中
    }
    
    // 缓存未命中，重新加载
    const content = await fs.readFile(path, 'utf-8');
    this.cache.set(path, { content, mtime: stat.mtimeMs });
    
    // 如果是设定文件，触发向量重建
    if (path.includes('characters/') || path.includes('settings/')) {
      await this.rebuildEmbedding(path, content);
    }
    
    return content;
  }
  
  /**
   * 向量索引更新
   */
  private async rebuildEmbedding(path: string, content: string): Promise<void> {
    const embedding = await this.embedder.encode(content);
    await this.vectorStore.upsert(path, embedding, {
      type: path.includes('characters/') ? 'character' : 'setting',
      lastModified: Date.now()
    });
  }
}
```

---

### 4.4 历史对话的语义检索

**问题**：用户可能说"像上次那样改"，AI 需要理解"上次"是什么。

**解决方案：对话历史的语义索引**

```typescript
class ConversationRetriever {
  private vectorStore: VectorStore;
  
  /**
   * 为对话建立向量索引
   */
  async indexConversation(conv: Conversation): Promise<void> {
    // 1. 生成对话摘要
    const summary = await this.summarize(conv);
    
    // 2. 提取关键信息
    const metadata = {
      id: conv.id,
      articleId: conv.articleId,
      date: conv.createdAt,
      skillsUsed: this.extractSkillsUsed(conv),
      userPreferences: this.extractPreferences(conv),  // 接受/拒绝信号
    };
    
    // 3. 生成向量并存储
    const embedding = await this.embedder.encode(summary);
    await this.vectorStore.insert(conv.id, embedding, metadata);
  }
  
  /**
   * 检索相关历史对话
   */
  async retrieveRelevant(
    query: string,
    currentArticleId: string,
    limit: number = 5
  ): Promise<ConversationSummary[]> {
    // 向量相似度搜索
    const results = await this.vectorStore.search(
      await this.embedder.encode(query),
      {
        filter: { articleId: currentArticleId },  // 优先同文章
        limit: limit * 2  // 多取一些，后续过滤
      }
    );
    
    // 按相关性 + 时间排序
    return results
      .sort((a, b) => {
        // 相关性权重 0.7 + 时间权重 0.3
        const scoreA = a.score * 0.7 + this.recencyScore(a.date) * 0.3;
        const scoreB = b.score * 0.7 + this.recencyScore(b.date) * 0.3;
        return scoreB - scoreA;
      })
      .slice(0, limit);
  }
  
  /**
   * "像上次那样" 的特殊处理
   */
  async resolvePreviousReference(
    userMessage: string,
    currentArticleId: string
  ): Promise<string | null> {
    // 检测引用模式
    const patterns = [
      /像(上次|之前|那次)(那样|一样)/,
      /跟(上次|之前)(一样|的方式)/,
      /按照(上次|之前)的/,
    ];
    
    if (!patterns.some(p => p.test(userMessage))) {
      return null;
    }
    
    // 检索最近的相关对话
    const recent = await this.retrieveRelevant(
      userMessage,
      currentArticleId,
      1
    );
    
    if (recent.length === 0) return null;
    
    // 加载完整对话并提取关键改动
    const fullConv = await this.loadFull(recent[0].id);
    return this.extractKeyChanges(fullConv);
  }
}
```

---

### 4.5 与 RAG 的整合

文件系统上下文与 RAG 检索的协同工作：

```
用户选中文本 + 触发 SKILL
    ↓
┌─────────────────────────────────────────────┐
│             Context Assembly                │
├─────────────────────────────────────────────┤
│ Layer 1: 规则文件（始终加载）                 │
│ ├── style.md                                │
│ └── terminology.json                        │
├─────────────────────────────────────────────┤
│ Layer 2: 动态检索（按需加载）                 │
│ ├── 人物设定（检测到人物名时）               │
│ ├── 历史对话（用户引用时）                   │
│ └── 相关段落（RAG 检索）                     │
├─────────────────────────────────────────────┤
│ Layer 3: 当前内容                            │
│ ├── 选中文本                                │
│ └── 前后文（可配置范围）                     │
└─────────────────────────────────────────────┘
    ↓
组装成完整 Prompt → 发送给 LLM
```

**Token 预算分配**

```typescript
const TOKEN_BUDGET = {
  total: 8000,                    // 最大上下文
  rules: 1000,                    // 规则文件固定预算
  characters: 1500,               // 人物设定弹性预算
  history: 500,                   // 历史对话摘要
  rag: 2000,                      // RAG 检索内容
  currentContent: 3000,           // 当前编辑内容
};

function assembleContext(parts: ContextParts): string {
  let remaining = TOKEN_BUDGET.total;
  const result: string[] = [];
  
  // 按优先级分配
  // 1. 规则（必须）
  result.push(truncate(parts.rules, TOKEN_BUDGET.rules));
  remaining -= countTokens(result[0]);
  
  // 2. 当前内容（必须）
  result.push(truncate(parts.currentContent, TOKEN_BUDGET.currentContent));
  remaining -= countTokens(result[1]);
  
  // 3. 人物设定（按需）
  if (parts.characters && remaining > 500) {
    const charBudget = Math.min(TOKEN_BUDGET.characters, remaining - 500);
    result.push(truncate(parts.characters, charBudget));
    remaining -= countTokens(result[result.length - 1]);
  }
  
  // 4. RAG 内容（填充剩余）
  if (parts.rag && remaining > 0) {
    result.push(truncate(parts.rag, remaining));
  }
  
  return result.join('\n\n---\n\n');
}
```

---

## 五、Prompt 结构模板

### 标准 SKILL Prompt 结构

```markdown
# SKILL: {skill_name}

## 任务描述
{task_description}

## 写作风格指南
{style_guide}

## 相关上下文
### 人物设定
{character_settings}

### 前文摘要
{previous_content_summary}

## 待处理内容
{selected_text}

## 输出要求
- 直接输出修改后的内容
- 保持原文风格
- 不要添加解释
```

### 一致性检查 Prompt 结构

```markdown
# SKILL: 一致性检查

## 任务描述
检查以下文章中是否存在前后矛盾或不一致的地方。

## 时间线
{timeline}

## 人物列表
{character_list}

## 重要设定
{world_settings}

## 待检查内容
{full_article_summary}

## 输出格式
请列出所有发现的不一致之处：
1. [位置] - [问题描述] - [建议修改]
```

---

## 五、OpenManus 代码参考

### 项目结构

```
OpenManus/
├── app/
│   ├── agent/
│   │   ├── base.py          # Agent 基类
│   │   ├── manus.py         # 主 Agent 实现
│   │   └── toolcall.py      # Tool 调用逻辑
│   ├── flow/
│   │   ├── base.py          # Flow 基类
│   │   └── planning.py      # 规划流程
│   ├── tool/
│   │   ├── base.py          # Tool 基类
│   │   ├── browser.py       # 浏览器 Tool
│   │   ├── file.py          # 文件 Tool
│   │   └── code.py          # 代码执行 Tool
│   └── prompt/
│       └── manus.py         # Prompt 模板
├── config/
│   └── config.toml          # 配置文件
└── main.py                   # 入口
```

### 核心类设计

```python
# Agent 基类
class BaseAgent:
    def __init__(self, llm, tools, memory):
        self.llm = llm
        self.tools = tools
        self.memory = memory
    
    async def run(self, task: str) -> str:
        # 思考-行动循环
        while not self.is_complete():
            thought = await self.think()
            action = await self.act(thought)
            observation = await self.observe(action)
            self.memory.add(thought, action, observation)
        
        return self.get_result()

# Tool 基类
class BaseTool:
    name: str
    description: str
    parameters: dict
    
    async def execute(self, **kwargs) -> ToolResult:
        raise NotImplementedError

# ToolResult 双形态
class ToolResult:
    full: str       # 完整结果
    compact: str    # 压缩结果
    success: bool
    error: Optional[str]
```

### MCP 集成示例

```python
# run_mcp.py - OpenManus 的 MCP 版本
from mcp import Server, Tool

server = Server()

@server.tool("write_file")
async def write_file(path: str, content: str) -> str:
    """写入文件"""
    with open(path, "w") as f:
        f.write(content)
    return f"已写入 {path}"

@server.tool("read_file")
async def read_file(path: str) -> str:
    """读取文件"""
    with open(path) as f:
        return f.read()

# 启动 MCP 服务器
server.run()
```

---

## 六、WriteNow 实施清单

### Phase 1 要实现的上下文工程

- [ ] 标准化 SKILL prompt 结构（稳定前缀）
- [ ] 项目设定存储到外部文件
- [ ] 智能上下文选择（根据 SKILL 类型）
- [ ] 用户选区 + 前后文作为动态内容

### Phase 2 要实现的优化

- [ ] 历史消息压缩（超过阈值时摘要化）
- [ ] 人物/设定智能检测和加载
- [ ] 版本历史作为错误恢复机制

### Phase 3 考虑的高级特性

- [ ] 子 Agent 拆分（Context Agent / Creator Agent）
- [ ] KV 缓存命中率监控
- [ ] 用户偏好学习
