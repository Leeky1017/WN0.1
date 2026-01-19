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

## 四、Prompt 结构模板

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
