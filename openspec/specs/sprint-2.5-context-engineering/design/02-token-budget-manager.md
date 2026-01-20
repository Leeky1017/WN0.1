# Design: TokenBudgetManager

## Goals

- 预算超标率 0%：任何一次请求都不得超过模型/配置的 token limit。
- 裁剪必须可解释：输出“删了什么/为什么/省了多少 token”。
- 裁剪必须语义安全：不硬截断句子；按 chunk/段落边界处理。

## Budget model

推荐预算结构：
- `totalLimit`: 模型上下文窗口（可按 model/profile 配置）
- `layerBudgets`: Rules/Settings/Retrieved/Immediate 的预算上限（可配置）

预算策略约束：
- Rules 是“稳定前缀”的核心，默认优先级最高（除非用户显式切换成本敏感模式）。
- Retrieved 是最先可丢弃的层（相关性排序越低越先删）。
- Settings 允许压缩：全量 → 关键摘要 → 仅引用指针（路径 + 说明）。
- Immediate 允许缩小窗口：前后 N 段逐级减少；选区与用户指令不可丢。

## TokenEstimator contract

TokenBudgetManager 不直接依赖特定 tokenizer，实现上只依赖：
- `estimate(text: string, model: string): number`
- `estimateMessage({ role, content }, model): number`（可选）

要求：
- 同输入同输出（deterministic），以便测试与缓存。
- 若使用近似估算，必须在 UI 标注为 estimate，并在误差超阈值时降级更保守裁剪。

## Trimming algorithm (deterministic)

1) 先做 **去重**：相同 source + 相同 content 的 chunk 合并（保留最高 priority）。
2) 按 layer 预算裁剪：
   - Retrieved：按相关性/score 升序删除，直到 within budget
   - Settings：按 priority 升序删除；若为大 chunk，优先生成可恢复摘要 chunk 替代
   - Immediate：逐步缩小 before/after 段落数；仍超标则要求用户缩小选区或切换模型/预算
3) 全局兜底：
   - 若 total 仍超标：必须拒绝发送（返回明确错误 + 建议操作），禁止“硬截断后继续发”

## Evidence output

裁剪证据结构建议：
- `removed[]`: `{ layer, source, tokenCount, reason }`
- `compressed[]`: `{ fromSource, toSource, savedTokens, reason }`
- `finalUsage`: per-layer used/budget + total used/limit

证据必须能被 ContextViewer 直接展示。

