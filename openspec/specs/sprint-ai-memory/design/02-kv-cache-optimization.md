# KV-Cache 优化策略（借鉴 Manus：Stable Prefix）

> 目标：在不牺牲上下文质量的前提下，通过“稳定前缀 + Append-only + 确定性序列化”最大化 KV-cache 复用，降低 token 成本与延迟。

## 核心原则

### 1) Stable Prefix（稳定前缀）

- **系统 prompt 模板必须固定**（章节顺序、标题、空行、分隔符）
- Layer 0–3 作为稳定前缀：尽量不变、少变、可缓存

### 2) Append-only Context（只追加不修改）

- 动态信息（Layer 4/5）只允许追加到末尾
- 禁止把“新信息”插入到前缀中间（会导致缓存失效）

### 3) Deterministic Serialization（确定性序列化）

同一份信息 MUST 序列化为相同字节序列：
- JSON key 排序固定（字典序）
- 数组顺序稳定（按显式排序规则）
- 空格/缩进/换行固定

## Stable System Prompt 模板（建议）

> 该模板是后续 `ai.cjs` 实现的“硬约束”：顺序固定，章节固定。

```
## 角色与行为约束
<Layer 0: system instructions>

## 会话信息
<Layer 1: session context>

## 用户偏好
<Layer 2: preferences>

## 项目设定
<Layer 3: project knowledge>

## 最近摘要
<Layer 4: recent summary>

## 当前上下文
<Layer 5: selection + surrounding + current task>

## 输出格式
<skill-defined output format or default>
```

## Masking 而非 Removal（行为控制）

Manus 的经验是：动态“移除工具/移除大段指令”会导致 KV-cache 前缀变化，反而更贵。

WriteNow 的适配方式（建议）：

- **不删除结构**：模板章节始终存在（包括空占位）
- **用策略字段控制行为**：例如在 `会话信息` 写入 `capabilities: {...}`，并在 system instructions 里声明“当 capability=false 时不得调用/不得假设”
- **对模型侧的选择权进行约束**：通过更强的规则语句/权重描述实现“masking 效果”

## 伪代码：稳定 prompt 构建

```ts
/**
 * Why: 通过固定章节顺序 + 空占位 + 确定性序列化，最大化 KV-cache 复用。
 * Failure: 不抛出异常到 renderer；任何错误必须映射为 IpcErr（见 api-contract）。
 */
function buildStableSystemPrompt(ctx) {
  return [
    '## 角色与行为约束',
    ctx.layer0 ?? '',
    '',
    '## 会话信息',
    stableKvLines(ctx.layer1),
    '',
    '## 用户偏好',
    stablePreferenceLines(ctx.layer2),
    '',
    '## 项目设定',
    stableProjectRefs(ctx.layer3),
    '',
    '## 最近摘要',
    stableSummary(ctx.layer4),
    '',
    '## 当前上下文',
    ctx.layer5 ?? '',
    '',
    '## 输出格式',
    ctx.outputFormat ?? '直接输出可应用的 diff（含最小必要说明）',
  ].join('\n')
}
```

## 验证指标（任务卡验收建议）

- **字节级稳定性**：相同输入上下文生成的前缀文本应完全一致（可用 snapshot）
- **成本对比**：同一段落连续运行相同 SKILL，统计 token 用量与延迟；以“稳定前缀前/后”对比
- **错误可观测**：序列化/组装失败必须返回稳定错误码，且 UI 不应卡死在 loading

