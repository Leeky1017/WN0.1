# SKILL 格式设计（V2）

## Goals

- 对齐业界 “Agent Skills” 的工程化载体：`SKILL.md` + YAML frontmatter + 可拆分资源目录。
- 以文件为单一事实源（SSOT），支持版本控制、审计、分发与回滚。
- 仍可高效运行：DB 仅承载索引/缓存，支持列表/搜索/启用态与运行时查询。
- 对写作者友好：默认模板足够简单；高级能力渐进披露（advanced fields 可选）。

## Non-goals

- V2 不引入“可执行脚本技能”（安全/治理另行规范）。
- 不要求用户手写 YAML；UI 应提供表单化编辑与一键生成。

## 术语与分层

- **Writing Skill（写作 SKILL）**：面向写作者的编辑器动作（润色/扩写/精简等）。
- **Skill Variant（变体）**：同一 SKILL 在不同模型 tier/成本约束下的 prompt + context 策略差异版本。
- **Skill Package（技能包）**：一组 SKILL 的分发单元（包含元数据、版本、许可证与多个 SKILL）。

## 文件系统结构（推荐）

### 作用域目录

- Builtin（随应用分发，只读）：`<app-resources>/skills/packages/<packageId>/<version>/...`
- Global（用户级）：`<userData>/skills/packages/<packageId>/<version>/...`
- Project（项目级）：`<projectRoot>/.writenow/skills/packages/<packageId>/<version>/...`

> Why：与 Sprint 2.5 的 `.writenow/` 结构对齐，允许项目级技能随项目迁移；同时保留用户级全局技能复用。

### 单个 SKILL 目录（包内）

```
skills/<skill-slug>/
  SKILL.md            # 必需
  references/         # 可选：大段示例/风格库/约束说明（按需加载）
  assets/             # 可选：模板/片段（纯文本/静态）
```

### `references/`：按需引用（Progressive Disclosure）

`references/` 目录用于存放“可扩展、可替换、可能很长”的参考规范文件（例如：不同平台的排版/标题/禁忌）。其核心原则：

- 索引阶段只读取 **元数据**（用于 UI 列表、搜索与可选项展示）。
- 运行阶段只有在用户选择（或 workflow 明确需要）时才读取 **正文内容** 并注入 Prompt（避免无意义 token 占用）。

#### Reference Slot（参数化引用位）

为了让 UI 知道“需要用户先选哪个 ref”，`SKILL.md` 需要声明 ref slot（引用位）。示例：

```yaml
references:
  slots:
    platform:
      directory: references
      pattern: "*.md"
      required: true
      load: on_demand
      maxTokens: 1500
```

运行时行为（概念层）：

1. UI 扫描/读取 slot 的可用 refs（文件名或 ref frontmatter），展示为下拉/列表。
2. 用户选择某一 ref 后，系统读取该 ref 文件正文，并将其作为本次运行的 skill-scoped context 注入 Prompt。
3. 若 ref 内容超出预算：优先选择更短 variant/减少上下文层；仍超限则失败并给出拆分建议。

## `SKILL.md`：YAML frontmatter + Markdown 正文

### 最小 frontmatter（必须）

```yaml
---
id: builtin:polish            # 稳定唯一；推荐命名空间前缀
name: 润色文本
version: 1.0.0                # SemVer
tags: [rewrite]               # 用于索引/过滤/路由
---
```

### 推荐 frontmatter（V2）

```yaml
---
id: pkg.writenow.builtin:polish
name: 润色文本
description: 优化表达与用词一致性（不改变原意）
version: 1.0.0
kind: single                  # single | workflow
scope: builtin                 # builtin | global | project（也可由目录推导）
tags: [rewrite]

modelProfile:
  tier: high                   # high | mid | low
  preferred: claude-3-5-sonnet-latest

output:
  format: plain_text
  constraints:
    - output_only_result
    - no_explanations
    - no_code_blocks

context:
  layers:
    rules: always              # always | never
    settings: auto             # auto | never
    retrieved: auto            # auto | never
    immediate: always          # always | never
  hints:
    maxInstructionTokens: 5000 # 超限时必须拆分/引用
    preferShortUserInstruction: true

variants:
  - id: high
    when: { tier: high }
    prompt:
      system: |
        You are WriteNow's writing assistant...
    context:
      layers: { settings: auto, retrieved: auto }
  - id: low
    when: { tier: low }
    prompt:
      system: |
        Rewrite the text. Output only the final text.
    context:
      layers: { settings: never, retrieved: never }
---
```

> Notes：
> - `scope` 可由安装位置推导；写入 frontmatter 便于导出时保留信息。
> - `variants` 用于多模型兼容：low tier 选择短 prompt 与更少上下文，保证可用性。

### Markdown 正文（建议结构）

正文不是权威元数据，但用于人类可读说明、示例与 UI 展示（可选）。

推荐段落：

- `## Intent`：技能的写作意图（why）
- `## User Instruction`：默认用户指令（短、稳定，供 Immediate 层注入）
- `## Prompt Notes`：使用约束/边界（why）
- `## Examples`：可选示例（建议放入 `references/`，避免默认膨胀）

## Reference 文件格式（`references/*.md`）

ref 文件推荐也使用 YAML frontmatter（用于 UI 列表与结构化展示），正文作为可注入的“平台规范/风格指南”：

```md
---
id: wechat-official
name: 微信公众号
wordCountPreference:
  preferred: 1200
  min: 800
  max: 2000
titleStyle:
  prefer: "利益点 + 场景"
layoutRules:
  - "多用小标题分段"
  - "段落不超过 5 行"
taboos:
  - "避免过度营销话术"
  - "避免标题党"
---

# 微信公众号规范
（正文可用 Markdown，内容将被按需注入）
```

最小要求（MVP）：

- 无 frontmatter 时也可用：用文件名作为 `id/name`，并把整个正文当作可注入规范文本。
- UI 展示优先读取 frontmatter 的 `name/wordCountPreference/titleStyle/layoutRules/taboos`（若存在）。

## 解析与校验规则（必须可恢复）

### 必填校验

- `id`：非空、稳定、全局唯一；冲突时按 scope 优先级覆盖（见 spec 的合并规则）。
- `name`：非空；用于 UI 展示。
- `version`：SemVer；升级/回滚以此为主键之一。
- `kind`：默认 `single`。

### 长度控制

- `prompt.system` + `User Instruction` + `output.constraints` 等 “可注入指令” 的 token 估算 MUST 有上限。
- 超限时 MUST 返回 `INVALID_ARGUMENT`（或索引状态=invalid），并给出建议：拆分为 `references/` 或拆为多个子 SKILL/变体。

### refs 与 slots 校验（建议）

- `references.slots.*.directory/pattern` 必须可解析；目录不存在时应标记为 invalid 并给出可恢复错误原因。
- `required=true` 的 slot 在运行时必须有明确的 UI 选择与失败语义（未选择不得 silent fallback）。

### 安全与兼容

- 不允许在 `SKILL.md` 声明“执行脚本/写文件/联网抓取”等能力（V2 out-of-scope）。
- 未识别字段 MUST 被忽略但保留（前向兼容），并在 UI 中提示“存在未知字段（不会生效）”。

## DB 索引映射（file → index）

### 现有 `skills` 表的定位

`skills` 表作为运行时索引保留，核心职责：

- UI 列表/搜索：`name/description/tag/is_builtin/...`
- 运行时查询：根据 `id` 取到模型与可执行的 prompt 片段（可以是缓存）
- 状态：enabled/valid/last_indexed_at/error（建议新增字段或新表承载）

### 推荐增量扩展（不破坏现有功能）

优先新增字段/表，而不是改动现有字段语义：

- `skills.source_uri`：对应 `SKILL.md` 路径（或资源 URI）
- `skills.source_hash`：文件内容 hash（用于漂移检测）
- `skills.version`：SemVer（与文件一致）
- `skills.scope`：builtin/global/project
- `skills.package_id`：归属 package（便于启用/禁用）
- `skills.definition_json`：解析后的结构化缓存（非 SSOT，可重建）

> Why：当前 V1 存在 “前端常量 + 主进程 upsert” 双源，V2 必须通过 `source_uri/hash` 确保可审计与可重建。

## 内置技能迁移策略（V1 → V2）

1. 为内置 3 SKILL 新建一个 builtin package（例如 `pkg.writenow.builtin`），用 `SKILL.md` 定义三者。
2. 启动时由 **SkillIndexService** 扫描 builtin/global/project 目录并写入索引（取代 `electron/lib/skills.cjs` 的硬编码 upsert）。
3. 渲染进程 UI 不再引用 `src/lib/skills.ts` 常量，而是通过 IPC 拉取 skills 列表（避免双源）。
4. `ai:skill:run` 仍以 `skillId` 为主键；prompt 由 ContextAssembler + SkillDefinitionV2 统一生成（保持现有 Diff/版本闭环）。
