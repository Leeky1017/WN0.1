Codex Task: Sprint 2.5 - Context Engineering
以下是完整的 Codex 任务，用于创建这个关键 Spec：

Codex Task: Create Sprint 2.5 Context Engineering Spec
任务目标
创建 sprint-2.5-context-engineering OpenSpec，定义 WriteNow 的上下文工程架构。这是 WN AI 能力的核心基础设施，直接影响 AI 效果和成本。

基本信息
Spec 目录: /home/leeky/work/WriteNow/openspec/specs/sprint-2.5-context-engineering/
核心参考: 
/home/leeky/work/WriteNow/docs/reference/manus-context-engineering/
依赖: Sprint 2 (AI 能力)
被依赖: Sprint 3 (RAG)、Sprint 5 (项目管理)、Sprint 6 (体验增强)
一、Spec 核心目标
1.1 主要交付物
交付物	说明
ContextAssembler	上下文组装器，统一管理所有上下文来源
.writenow/ 项目目录	文件系统作为上下文的标准结构
Token Budget Manager	Token 预算分配与执行器
Prompt Template System	稳定前缀 + 动态后缀的 Prompt 结构
Editor Context Sync	编辑器状态同步到 Store
Conversation History Manager	对话历史索引与摘要
1.2 成功指标
指标	目标
KV-Cache 命中率	> 70% (通过稳定前缀实现)
上下文组装延迟	< 50ms
Token 预算超标率	0% (严格执行预算裁剪)
上下文可视化	用户可查看每次 AI 调用的完整上下文
二、核心 Requirements
Requirement 1: 系统 MUST 实现分层上下文架构
背景: 参考 Manus "File System as Context" + Cursor "动态上下文发现"

Scenario: 四层上下文模型
Layer 1 - 规则层 (Rules): 始终加载
项目风格指南 (.writenow/rules/style.md)
术语表 (.writenow/rules/terminology.json)
写作约束 (.writenow/rules/constraints.json)
Layer 2 - 设定层 (Settings): 按需加载
人物设定 (.writenow/characters/*.md)
世界观 (.writenow/settings/*.md)
时间线
Layer 3 - 检索层 (Retrieved): 动态检索
RAG 检索结果
历史对话摘要
相关段落
Layer 4 - 即时层 (Immediate): 实时同步
当前选中文本
光标上下文 (前后各 N 段)
用户指令
Scenario: 上下文组装顺序
WHEN 用户触发任意 AI SKILL
THEN ContextAssembler MUST 按 Layer 1 → 2 → 3 → 4 顺序组装
THEN 总 Token 不得超过配置的预算上限
Requirement 2: 系统 MUST 实现 KV-Cache 友好的 Prompt 结构
背景: 参考 Manus "Design Around KV-Cache"，缓存命中可节省 10x 成本

Scenario: 稳定前缀设计
WHEN 构建 Prompt 时
THEN MUST 保持稳定的 System Prompt 前缀
THEN 禁止在前缀中包含时间戳、随机数等动态元素
THEN 项目设定 SHOULD 放在 System Prompt 中（跨请求稳定）
Scenario: Append-Only 上下文
WHEN 同一会话内发送多次请求
THEN 历史消息 MUST 保持不变，只追加新消息
THEN 禁止修改/删除历史消息（破坏缓存）
Scenario: Prompt 模板标准化
[System Prompt - 稳定前缀]
├── SKILL 定义
├── 输出格式要求
└── 项目规则（style.md 等）
[User Content - 动态部分]
├── 人物设定（按需）
├── 历史对话摘要
├── 当前选区 + 上下文
└── 用户指令
Requirement 3: 系统 MUST 实现 Token 预算管理
背景: 上下文越长，成本越高、延迟越长、效果可能下降

Scenario: 预算分配策略
typescript
const TOKEN_BUDGET = {
  total: 8000,           // 可配置
  system: 2000,          // 规则 + SKILL 定义
  settings: 1500,        // 人物/设定
  retrieved: 2000,       // RAG 结果
  immediate: 2500,       // 当前内容 + 用户指令
};
Scenario: 预算超标处理
WHEN 任一层级超过预算
THEN MUST 按优先级裁剪：
删除相关性最低的 RAG 结果
精简人物设定（只保留关键信息）
缩短即时上下文范围
THEN 禁止硬截断（可能断在句子中间）
Scenario: 预算动态调整
WHEN 使用支持更大上下文的模型（如 Claude 200K）
THEN 预算应可配置调整
WHEN 用户设置了成本敏感模式
THEN 应使用更激进的裁剪策略
Requirement 4: 系统 MUST 实现 .writenow 项目目录结构
背景: 参考 Cursor .cursorrules + Manus "File System as Context"

Scenario: 目录结构
.writenow/
├── project.json              # 项目元数据
├── rules/
│   ├── style.md              # 写作风格规则
│   ├── terminology.json      # 术语表
│   └── constraints.json      # 写作约束
├── characters/
│   └── *.md                  # 人物设定卡片
├── settings/
│   └── *.md                  # 世界观/时间线等
├── conversations/
│   ├── index.json            # 对话索引（摘要）
│   └── *.json                # 完整对话记录
└── cache/
    └── embeddings/           # 向量缓存
Scenario: 文件加载策略
WHEN 应用启动时
THEN rules/ 目录下所有文件 MUST 预加载并缓存
WHEN AI 请求触发时
THEN characters/ 和 settings/ MUST 按需加载（检测实体名）
Scenario: 文件变更监听
WHEN 用户修改了 .writenow/ 下的任何文件
THEN 系统 MUST 自动重新加载并更新缓存
THEN 如果是设定文件，MUST 触发向量索引重建
Requirement 5: 系统 MUST 实现编辑器上下文同步
背景: AI 需要知道用户"此刻"在编辑什么

Scenario: 编辑器状态同步
WHEN 用户在编辑器中操作
THEN 以下状态 MUST 实时同步到 Zustand Store：
selectedText: 当前选中的文本
cursorPosition: 光标行/列
currentParagraph: 光标所在段落
surroundingContext: 前后 N 段（可配置）
Scenario: 上下文变更防抖
WHEN 用户快速移动光标
THEN 上下文同步 MUST 使用 debounce（如 200ms）
THEN 避免频繁更新导致的性能问题
Scenario: 人物/实体检测
WHEN 选中文本或当前段落包含人物名
THEN 系统 SHOULD 预加载相关人物设定
THEN 使用简单的字符串匹配（Phase 1）或 NER（Phase 2）
Requirement 6: 系统 MUST 实现对话历史管理
背景: 参考 Manus "Keep Wrong Stuff In" + Cursor "Chat History Reference"

Scenario: 对话持久化
WHEN AI 对话结束或达到阈值
THEN MUST 保存完整对话到 .writenow/conversations/
THEN MUST 生成对话摘要并更新 index.json
Scenario: 可恢复压缩
WHEN 对话历史注入上下文
THEN 只注入摘要（节省 Token）
THEN 保留完整对话的文件路径（可恢复）
Scenario: "像上次那样" 处理
WHEN 用户消息包含"像上次/之前那样"等引用
THEN 系统 MUST 检索相关历史对话
THEN 提取上次的关键改动并注入上下文
Scenario: 用户偏好信号
WHEN 用户接受或拒绝 AI 建议
THEN MUST 记录到对话历史元数据
THEN 后续请求可参考用户偏好
Requirement 7: 系统 MUST 实现上下文可视化调试
背景: 核心规范第 382 行："每次 AI 调用时可查看发送的完整上下文"

Scenario: 上下文预览
WHEN 用户在 AI 面板中展开"查看上下文"
THEN 显示完整的组装后 Prompt
THEN 按层级分区显示（规则 / 设定 / 检索 / 即时）
Scenario: Token 使用统计
THEN 显示每层级的 Token 使用量
THEN 显示总 Token / 预算比例
三、技术设计要点
3.1 类型定义
typescript
// src/types/context.ts
/** 上下文层级 */
export type ContextLayer = 'rules' | 'settings' | 'retrieved' | 'immediate';
/** 上下文片段 */
export interface ContextChunk {
  layer: ContextLayer;
  source: string;           // 来源文件或标识
  content: string;
  tokenCount: number;
  priority: number;         // 裁剪时的优先级（越高越不易被裁）
}
/** 组装后的上下文 */
export interface AssembledContext {
  systemPrompt: string;     // 稳定前缀
  userContent: string;      // 动态内容
  chunks: ContextChunk[];   // 详细分解（调试用）
  totalTokens: number;
  budgetUsage: Record<ContextLayer, { used: number; budget: number }>;
}
/** 编辑器即时上下文 */
export interface EditorContext {
  selectedText: string | null;
  cursorLine: number;
  cursorColumn: number;
  currentParagraph: string;
  surroundingParagraphs: {
    before: string[];
    after: string[];
  };
  detectedEntities: string[];  // 检测到的人物/地点名
}
/** 对话历史索引 */
export interface ConversationIndex {
  id: string;
  articleId: string;
  createdAt: string;
  updatedAt: string;
  messageCount: number;
  summary: string;
  keyTopics: string[];
  skillsUsed: string[];
  userPreferences: {
    accepted: string[];
    rejected: string[];
  };
  fullPath: string;
}
3.2 核心模块
模块	文件路径	职责
ContextAssembler	src/lib/context/assembler.ts	四层上下文组装
TokenBudgetManager	src/lib/context/budget.ts	预算分配与裁剪
ProjectRulesLoader	src/lib/context/rules-loader.ts	.writenow/rules 加载
SettingsLoader	src/lib/context/settings-loader.ts	人物/设定按需加载
ConversationManager	src/lib/context/conversation.ts	对话历史管理
EditorContextSync	src/stores/editorContextStore.ts	编辑器状态同步
ContextViewer	src/components/AI/ContextViewer.tsx	上下文可视化
3.3 与其他 Sprint 的接口
Sprint	接口
Sprint 2 (AI SKILL)	ContextAssembler.forSkill(skillId, editorContext)
Sprint 3 (RAG)	ContextAssembler.addRetrievedChunks(ragResults)
Sprint 5 (项目管理)	人物/设定编辑 → 自动同步到 .writenow/
Sprint 6 (体验)	用户偏好学习 → ConversationManager
四、Task Cards 结构建议
P0 - 基础架构
001-context-types.md - 类型定义与接口
002-project-directory.md - .writenow 目录结构与加载
003-token-budget-manager.md - Token 预算管理器
004-context-assembler.md - 四层上下文组装器
P1 - 编辑器集成
005-editor-context-sync.md - 编辑器状态同步
006-entity-detection.md - 人物/实体检测
007-prompt-template.md - 稳定 Prompt 模板系统
P1 - 对话历史
008-conversation-manager.md - 对话持久化与索引
009-conversation-summary.md - 对话摘要生成
010-previous-reference.md - "像上次那样" 处理
P2 - 调试与优化
011-context-viewer.md - 上下文可视化组件
012-cache-optimization.md - KV-Cache 命中率优化
五、验证计划
自动化测试
单元测试：ContextAssembler 的组装逻辑
单元测试：TokenBudgetManager 的裁剪策略
集成测试：.writenow 目录变更 → 缓存更新
性能测试
上下文组装延迟 < 50ms
大项目（100+ 人物设定）加载性能
手动验证
创建示例项目，配置完整的 .writenow 目录
触发 SKILL，验证上下文正确注入
查看上下文可视化，确认分层正确
参考文档
Manus 上下文工程参考: 
/home/leeky/work/WriteNow/docs/reference/manus-context-engineering/README.md
Manus 高级实践指南: 
/home/leeky/work/WriteNow/docs/reference/manus-context-engineering/advanced-practices.md
WN 核心规范: 
/home/leeky/work/WriteNow/openspec/specs/writenow-spec/spec.md
Sprint 2 AI 规范: 
/home/leeky/work/WriteNow/openspec/specs/sprint-2-ai/spec.md
Sprint 3 RAG 规范: 
/home/leeky/work/WriteNow/openspec/specs/sprint-3-rag/spec.md
请 Codex 基于以上内容，在 /home/leeky/work/WriteNow/openspec/specs/sprint-2.5-context-engineering/ 创建完整的 OpenSpec，包括：

spec.md
：完整规格说明
design/：上下文分层架构、Token 预算策略、对话历史管理等设计文档
task_cards/：按优先级分组的可执行任务卡片
每个 Task Card MUST 包含：

清晰的完成标准 (Acceptance Criteria)
具体的文件变更列表
与其他任务的依赖关系
预估工作量