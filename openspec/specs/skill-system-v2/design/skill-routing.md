# SKILL 路由策略设计（多模型兼容）

## Goals

- 同一 package/workflow 内可提供多个子 SKILL/变体，并能在不同模型能力下稳定选择。
- 选择结果可解释：返回“为什么选它”的证据（命中规则/语义分类结果/兜底路径）。
- 控制成本：低端模型不额外调用模型；中端模型限制 token 开销；顶级模型可用语义但可缓存。

## 路由分层：选择什么、怎么选

V2 的“路由”分为两层：

1. **Skill Selection**：在候选集合中选哪一个子 SKILL（或 workflow 的下一步）。
2. **Variant Selection**：同一 SKILL 选哪一个 prompt/context 变体（high/mid/low tier）。

> 说明：用户在 UI 中直接点选某个 SKILL 时，Skill Selection 是“用户显式指定”；路由主要用于 workflow / Auto 模式 / package 内多候选。

## 模型 Tier（High / Mid / Low）

系统 MUST 将当前执行模型映射为能力 tier（可配置，默认策略）：

- **High**：上下文窗口大、指令遵循强，可承担轻量语义路由（如 Claude 3.5 / GPT-4o）
- **Mid**：指令遵循中等，语义路由可用但需严格限制 token（“规则优先，语义消歧”）
- **Low**：上下文窗口小或成本敏感（本地小模型），不得额外调用模型做路由

`tier` 的来源：

- 用户配置（优先）：在 AI 设置中明确声明模型 tier
- 系统推断（兜底）：基于模型名/已知能力表/上下文窗口

## 路由输入（最小必要，保护隐私）

路由器的输入应最小化：

- 用户显式选择（若有）：skillId / variantId
- 用户指令（短文本）：例如“把这一段改得更口语”
- 任务标签：rewrite/generate/analyze/assist（可由 UI 决策）
- 编辑器信号（不上传正文为前提下的统计）：选区长度、是否包含 Markdown、语言等
- 可选：检测到的实体（人物/地点），用于决定是否需要 settings

> Why：路由是“决策”而非“生成”；避免把正文作为路由输入可降低隐私与 token 成本。

## 分层路由策略（按 tier）

### Low Tier：纯规则路由（必须）

规则路由基于：

- `tags` 匹配（rewrite vs generate 等）
- 关键词规则（可配置）：例如 “扩写/丰富/细节” → expand
- 结构规则：选区为空 → 禁止 rewrite；选区过长 → 选择 short variant
- 用户偏好：最近使用/置顶/禁用

输出：

- `selectedSkillId`
- `selectedVariantId`（默认选择 `variants.when.tier=low`，否则 fallback）
- `explanation`（命中规则列表）

### Mid Tier：规则优先 + 语义消歧（必须）

流程：

1. 规则引擎先生成 Top-K 候选（通常 K≤3）
2. 若仍不确定（分数接近/多候选），且允许语义消歧：
   - 发送一个极短的分类请求（不包含正文，仅包含候选名/描述 + 用户短指令）
   - 输出 label（候选 id）与置信度
3. 若语义失败/超时：回退规则兜底

约束：

- 路由语义请求 MUST 有严格 token 上限与超时（并可取消）
- 语义结果 MUST 可缓存（按“指令摘要 + 候选集合 hash”）

### High Tier：语义路由 + 规则兜底（建议）

High tier 可在两种模式间选择（实现可渐进）：

- **LLM Router**：使用模型做分类/选择（同样避免正文，除非用户开启“更智能路由”）
- **Hybrid Router**：规则先行，语义优化排序

同样要求：

- 语义请求短、可取消、可缓存
- 失败回退规则兜底

## Workflow 路由（多步组合）

workflow 的每一步可定义：

- `stepId`
- `skillRef`（固定）或 `candidates`（可路由）
- `onError` 策略：stop / skip / fallback
- `applyPolicy`：每步是否需要 Diff 确认（默认每步确认；可选“最后一步确认”）

路由器对 workflow 的输出必须包含：

- 每步最终选择的 `skillId/variantId`
- 每步的解释（why）
- 可复现的“路由输入快照”（不含正文）

## 解释与可观测性

路由决策应以结构化结果返回，并写入：

- RUN_LOG / 本地日志（hash 后的指令摘要、候选集合、选中结果）
- UI（可选）：展示“为何使用此变体/为何关闭 settings/retrieved”

建议最小字段：

```ts
type SkillRouteDecision = {
  selectedSkillId: string;
  selectedVariantId?: string;
  tier: 'high' | 'mid' | 'low';
  strategy: 'rules' | 'semantic' | 'hybrid' | 'user-pinned';
  evidence: Array<{ kind: 'rule' | 'semantic'; id: string; note: string }>;
};
```

