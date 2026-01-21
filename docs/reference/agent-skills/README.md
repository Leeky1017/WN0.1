# Agent Skills（技能包）机制对比：WriteNow vs Codex CLI vs Claude Code

> 说明：本文是“研究/参考”材料，用于评估与借鉴业界的 *skills/指令模块化* 机制；不构成 WriteNow 的权威规范或交付要求。WriteNow 的权威规范以 `openspec/specs/writenow-spec/spec.md` 与各 Sprint 增量 spec 为准。

## 0. 术语澄清（避免“SKILL”一词歧义）

在不同产品里，“Skill/技能”指代的层级并不一致：

- **WriteNow（WN）SKILL**：面向写作者的产品能力（“润色/扩写/精简”等），本质是 *Prompt 模板 + 上下文需求 + 输出约束*，并进入 UI 流程（Diff→确认→应用→版本）。
- **Codex CLI Skills（Agent Skills）**：面向 AI Agent 的“可复用工作流包”（说明文档 + 脚本 + 参考资料 + 资产）。它改变的是 *Agent 行为*，而不是用户内容的某个固定写作操作。
- **Claude Code Skills**：同样是面向 Agent 的能力扩展（可自定义指令、脚本、调用权限、参数等），并与 **CLAUDE.md 记忆/规则文件体系**配套。

因此，“把 Codex 开源 SKILL 接入 WN”更合理的理解通常是：**借鉴并移植“技能包/指令模块化”的工程与分发机制**，而不是替换 WN 的“写作 SKILL（产品动作）”概念。

---

## 1. WriteNow 当前 SKILL（产品动作）机制速览

### 1.1 核心定义（来自 WN 权威 spec）

WN 的 SKILL 定义为：

- `SKILL = Prompt 模板 + 上下文需求 + 输出格式`

见：`openspec/specs/writenow-spec/spec.md`

### 1.2 数据模型与内置 SKILL

WN 在本地 SQLite 里有 `skills` 表（用于内置/自定义的统一承载）：

- 表结构：`electron/database/schema.sql`
- 内置 upsert：`electron/lib/skills.cjs`（`ensureBuiltinSkills`）

关键字段（摘要）：

- `system_prompt`、`user_prompt_template`
- `context_rules`（JSON：上下文注入规则）
- `model`、`is_builtin`

同时，渲染进程也维护了一份内置技能列表用于 UI 展示/触发：

- `src/lib/skills.ts`（`BUILTIN_SKILLS`）

> 观察：目前“DB 内置技能”与“前端内置技能常量”存在双源；如果未来开放自定义/市场分发，建议尽早统一单一事实源（SSOT），避免漂移。

### 1.3 执行链路（Renderer→Main→Renderer，含可观测性）

典型执行路径：

1. **用户触发**（AI 面板按钮）：`src/components/AIPanel.tsx`
2. **组装上下文**（ContextAssembler）：`src/stores/aiStore.ts` → `src/lib/context/assembler.ts`
   - 分层上下文（rules/settings/retrieved/immediate）+ Token 预算裁剪：`src/lib/context/budget.ts`
   - 产物包含 `systemPrompt` + `userContent` + `prefixHash` 等，可用于“上下文可视化/一致性验证”
3. **调用主进程代理**（IPC）：`ai:skill:run` / `ai:skill:cancel`（契约：`src/types/ipc-generated.ts`）
4. **主进程流式请求**：`electron/ipc/ai.cjs`
   - 统一做 provider/baseUrl/apiKey，支持取消、超时、错误码映射（`TIMEOUT`/`CANCELED` 等）
   - 通过事件 `ai:skill:stream` 把 delta/done/error 回推
5. **渲染进程 Diff 展示与确认**：`src/components/AI/DiffView.tsx` + `src/stores/aiStore.ts`
6. **约束检查/记忆注入/会话沉淀**（已具备雏形）：
   - 记忆注入预览：`memory:injection:preview`（`src/stores/aiStore.ts`）
   - Judge：`src/lib/judge`（从 store 可见调用点）

### 1.4 现状评价（“可行/不可行”）

WN 当前做法并非“自编自创不可行”，反而有几处明显优点：

- **IPC 边界清晰**：渲染进程不持有云端 key，主进程做统一代理与错误码封装。
- **上下文工程可观测**：ContextAssembler + TokenBudgetManager + Prompt hash 校验，使“调试/可解释”有工程抓手。
- **产品闭环一致**：SKILL 输出默认进入 Diff→确认→应用→版本/历史，符合写作工具的“文字 Git”目标。

更需要补齐的是“**技能定义的工程化与分发**”：版本化、共享、导入导出、单一事实源、权限边界、参数化等。

---

## 2. Codex CLI（开源）Agent Skills 机制速览

### 2.1 开源载体与基本结构

Codex 的 skills 机制来自开源生态（可被团队复用/分发），核心形式是“技能包目录”：

- 开源仓库：`https://github.com/openai/skills`
- 目录结构（仓库内示例）：
  - `skills/.system/*`：系统技能（通常预装）
  - `skills/.curated/*`：精选技能（可按名安装）
  - `skills/.experimental/*`：实验技能

一个技能通常包含：

```
<skill-name>/
  SKILL.md           # 必需：YAML frontmatter + Markdown 指令
  scripts/           # 可选：可执行脚本（提升确定性/复用）
  references/        # 可选：大段参考资料（按需加载，避免占用上下文）
  assets/            # 可选：模板/静态资源
  LICENSE.txt        # 每个技能的独立许可
```

### 2.2 触发与加载（关键思路：渐进披露）

从 Codex 的 `skill-creator` 规范（同样以 SKILL.md 形式分发）可以总结出关键工程原则：

- **触发**：优先由“用户明确点名技能”或“任务语义匹配技能描述”触发。
- **加载策略**：只在触发后加载技能正文；大段内容放 `references/`，按需再读（progressive disclosure）。
- **确定性**：重复且易错的流程沉淀为 `scripts/`，让 Agent 少“现写脚本”，多“运行脚本”。

### 2.3 分发与安装

Codex 提供技能安装器思路（`skill-installer`）：

- 从 curated 列表安装，或从 GitHub 路径安装
- 安装到本地 skills 目录后重启生效

这些都是 WN 在未来做“自定义 SKILL/市场”时可以直接借鉴的工程模块：**技能包格式 + 安装/更新/卸载 + 许可与来源元数据**。

---

## 3. Claude Code（官方文档）Skills + Memory 机制速览

> 说明：Claude Code 并非完全开源，但其 *skills 与记忆/规则文件体系* 的公开文档非常具体，足以作为对照与借鉴。

参考入口（官方 docs）：

- Skills：`https://docs.anthropic.com/en/docs/claude-code/skills`
- Memory：`https://docs.anthropic.com/en/docs/claude-code/memory`
- Settings：`https://docs.anthropic.com/en/docs/claude-code/settings`

### 3.1 Claude Code Skills 的关键机制（从 docs 摘要）

Claude Code 的 skills 文档体现的关键点包括（按目录结构与功能归纳）：

- **技能位置与作用域（scope）**
  - 个人：`~/.claude/skills/<skill-name>/SKILL.md`（对“你所有项目”生效）
  - 项目：`.claude/skills/<skill-name>/SKILL.md`（对“当前项目”生效）
  - 组织：支持组织级分发/策略（文档提到“组织所有用户”层级）
- **自动发现**
  - 支持从嵌套目录自动发现（避免把所有技能堆在单层目录）
- **Frontmatter（元数据）**
  - 用于描述技能、影响触发概率、控制使用方式（文档提供 frontmatter 参考与字符串替换）
- **配套能力**
  - Supporting files（随技能携带脚本/模板/资料）
  - 控制“谁可以触发”技能
  - 限制 Claude 的“工具访问权限”（tool access）
  - 给技能传参（arguments）
  - 高级：动态上下文注入、在 subagent 内运行 skills

> 直观结论：Claude Code 的 skills 更接近“可配置的 agent workflow/扩展包”，而不是“产品里的写作动作按钮”。

### 3.2 Claude Code Memory/Rules（CLAUDE.md）的关键机制

Claude Code 的“记忆/规则”体系与 skills 强绑定，值得 WN 借鉴：

- **分层存放 + 明确共享边界**
  - 企业策略（IT/DevOps 管控）：不同 OS 有固定路径（见官方 docs）
  - 项目共享记忆：`./CLAUDE.md` 或 `./.claude/CLAUDE.md`（可进版本控制）
  - 项目模块化规则：`./.claude/rules/*.md`（按主题拆分）
  - 用户全局偏好：`~/.claude/CLAUDE.md`
  - 项目私有偏好：`./CLAUDE.local.md`（通常不入库）
- **递归发现 + 延迟加载**
  - 从 cwd 向上递归读取（直到根目录之前）
  - 对“子树中的 CLAUDE.md”采用按需注入（只有当 Claude 读到该子树文件时才引入）
- **imports 语法**
  - `CLAUDE.md` 支持 `@path/to/import` 引入其他文件（模块化、复用、可控）

> 直观结论：Claude Code 在“上下文工程”层面把 **可维护性（拆分）** 与 **上下文成本（按需加载）**做到了产品级机制里。

---

## 4. 对比矩阵（核心差异一眼看清）

| 维度 | WriteNow SKILL（写作产品动作） | Codex CLI Skills（Agent Skills，开源） | Claude Code Skills（Agent 扩展） |
|---|---|---|---|
| 目标对象 | 写作者（内容改写/生成/分析） | 开发者/团队（让 agent 复用流程） | 开发者/团队（让 agent 可配置、可治理） |
| 触发方式 | UI/快捷键/命令面板（产品交互） | 用户点名/语义匹配（对话触发） | slash/匹配/委派（对话触发 + 子代理） |
| 主要载体 | DB + Prompt 模板 + 上下文规则 | 文件夹技能包（SKILL.md + 资源） | 文件夹技能包（SKILL.md + 资源） |
| 作用域 | 目前以内置为主（未来可做自定义/市场） | 本地 skills 目录（用户环境级） | 个人/项目/组织多级（文档明确） |
| 上下文策略 | ContextAssembler 分层 + Token 预算 + 可视化 | 渐进披露（skills 正文/refs 按需加载） | 记忆/规则按层级递归发现 + 子树延迟加载 |
| 安全边界 | 主进程代理、IPC 错误码、可取消 | 以运行环境权限/沙箱为边界 | 提供“限制工具访问/谁可触发”等治理点 |
| 分发/共享 | 尚未形成“技能包分发协议” | 开源仓库 + 安装器 + 每技能许可 | 文档支持 share + org policy（非开源实现） |

---

## 5. 对 WN 的“接入/借鉴”建议（按收益优先级）

### 5.1 先做“概念分层”（避免产品层与 agent 层混淆）

建议在 WN 语义里显式区分两层：

- **Writing Skill（写作技能）**：面向用户的编辑器动作（WN 现有概念）
- **Agent Skill（技能包/工作流包）**：面向 AI 执行的“可复用流程与资源包”（Codex/Claude 的概念）

即使最终不把“Agent Skill”暴露给终端用户，内部也建议用不同名词，降低沟通与架构混淆成本。

### 5.2 借鉴点 1：技能包格式（SKILL.md + scripts/references/assets）

把 WN 未来的“自定义 SKILL/市场”从“数据库行”升级为“可分发技能包”会更工程化：

- 一个写作 SKILL 可以对应一个目录包（支持版本、作者、许可、资源文件）
- 安装/更新/卸载时再落到 DB（DB 做运行时索引与查询；技能包做分发与审计）
- Prompt 模板长文本可以拆为 references（按需加载），降低“默认上下文膨胀”

### 5.3 借鉴点 2：多作用域（个人/项目/组织）与按需加载

Claude Code 的经验可以映射到 WN（尤其结合 Sprint 2.5 的 `.writenow/` 设想）：

- 个人偏好（全局）：类似 `~/.claude/CLAUDE.md`
- 项目规则（共享）：类似 `./.claude/rules/*.md`
- 项目私有偏好：类似 `CLAUDE.local.md`
- 子树按需引入：对大型项目显著降低 token 成本

### 5.4 借鉴点 3：治理与安全（“谁能触发/能用哪些工具/能读哪些上下文”）

WN 当前的 `context_rules` 已是一个很好的起点；可以进一步借鉴 Claude Code 的“tool access”治理：

- 写作 SKILL 是否允许触发：导出/发布/写入设定文件/修改项目规则 等
- 如果未来引入“可写入工具”（如自动生成角色卡、自动写入术语表），必须有权限与审计闭环

### 5.5 WN 当前实现的一个短期风险：内置 SKILL 双源漂移

目前内置技能定义存在两份：

- DB 侧：`electron/lib/skills.cjs`
- 前端侧：`src/lib/skills.ts`

建议在“自定义/市场”落地前先统一：

- 方案 A：前端只读取 DB（通过 IPC 拉 skills 列表）
- 方案 B：生成式（由单一源生成另一份，禁止手写两份）

---

## 6. 参考链接（外部）

- Codex Agent Skills 开源仓库：`https://github.com/openai/skills`
- Codex Skills 文档入口（OpenAI）：`https://developers.openai.com/codex/skills`
- Agent Skills open standard：`https://agentskills.io`
- Claude Code Docs（Skills）：`https://docs.anthropic.com/en/docs/claude-code/skills`
- Claude Code Docs（Memory）：`https://docs.anthropic.com/en/docs/claude-code/memory`
- Claude Code Docs（Settings）：`https://docs.anthropic.com/en/docs/claude-code/settings`

