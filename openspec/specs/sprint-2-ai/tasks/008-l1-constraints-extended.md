# 任务 008: L1 代码检查器 - 字数/格式/术语

## 目标

扩展 L1 检查器，支持字数约束、格式约束、术语一致性检查，并将结果统一映射为 `ConstraintViolation`，用于 Diff 标注与用户修正。

## 依赖

- 任务 006：Judge 层架构与接口定义
- 任务 007：L1 代码检查器 - 禁用词（L1 规则落地模式参考）

## 实现步骤

1. 字数约束：
   - 创建 `src/lib/judge/rules/word-count.ts`，支持最小/最大字数范围检查，超标时返回违规项。
2. 格式约束：
   - 创建 `src/lib/judge/rules/format.ts`，支持常见格式规则（如标题层级、列表格式、标点/空格规范等），不符合时返回违规项。
3. 术语一致性：
   - 创建 `src/lib/judge/rules/terminology.ts`，基于术语表（标准术语 + 别名映射）检测不一致用法，并给出规范化建议（`suggestion`）。
4. 接入 L1 聚合：
   - 更新 `src/lib/judge/code-judge.ts` 将新增规则纳入执行与统计（passed/l1Passed/checkedAt/durationMs）。

## 新增/修改文件

- `src/lib/judge/rules/word-count.ts` - 字数检查（新增）
- `src/lib/judge/rules/format.ts` - 格式检查（新增）
- `src/lib/judge/rules/terminology.ts` - 术语一致性检查（新增）
- `src/lib/judge/code-judge.ts` - 接入扩展规则（修改）

## 验收标准

- [ ] 字数超标时返回违规项
- [ ] 格式不符时返回违规项
- [ ] 术语不一致时提示规范化

## 参考

- Sprint 2 规格：`openspec/specs/sprint-2-ai/spec.md`（约束规则 MUST 可配置并持久化）
