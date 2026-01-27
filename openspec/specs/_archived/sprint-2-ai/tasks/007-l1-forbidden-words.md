# 任务 007: L1 代码检查器 - 禁用词

## 目标

实现禁用词检查，检测 SKILL 输出（建议稿）中是否包含禁用词，并返回结构化违规项（违规词、位置、严重级别），用于 Diff 视图高亮与汇总。

## 依赖

- 任务 006：Judge 层架构与接口定义
- 任务 012：约束配置 UI（提供禁用词列表与作用域）

## 实现步骤

1. L1 检查器骨架：
   - 创建 `src/lib/judge/code-judge.ts`，实现 `IJudge`，负责执行全部 L1 规则并聚合结果。
2. 禁用词规则：
   - 创建 `src/lib/judge/rules/forbidden-words.ts`：
     - 输入：文本 + `ConstraintRule`（type=`forbidden_words`）
     - 输出：`ConstraintViolation[]`（包含清晰 `message` 与 `position.start/end`）
     - 必须处理：多次命中、重复词、重叠命中（避免重复报错或错位）
3. 位置信息：
   - `position` 使用字符 offset（与 Sprint 2 规格保持一致），以支持 Diff 下划线标注。

## 新增/修改文件

- `src/lib/judge/code-judge.ts` - L1 代码检查器实现（新增）
- `src/lib/judge/rules/forbidden-words.ts` - 禁用词规则（新增）

## 验收标准

- [ ] 可检测禁用词
- [ ] 返回完整的位置信息（start/end offset）
- [ ] 违规项包含违规词与严重级别

## 参考

- Sprint 2 规格：`openspec/specs/sprint-2-ai/spec.md` 第 199-236 行（ConstraintRule/Violation/JudgeResult）
