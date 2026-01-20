# 任务 006: Judge 层架构与接口定义

## 目标

定义可插拔的 Judge 层架构，统一约束规则输入与违规项输出，支持多种检查器实现（L1 代码检查器 / L2 本地 LLM 检查器），并为 Diff 违规标注与约束配置持久化提供稳定接口。

## 依赖

- 任务 004：Diff 展示与确认机制
- Sprint 2 规格：`openspec/specs/sprint-2-ai/spec.md`（Judge Layer / 新增类型定义）

## 实现步骤

1. 类型对齐：
   - 创建 `src/types/constraints.ts`，按 Sprint 2 规格新增 `ConstraintRule` / `ConstraintViolation` / `JudgeResult` / `IJudge` 等类型（参考 spec 第 199-241 行）。
2. Judge 接口出口：
   - 创建 `src/lib/judge/types.ts`，暴露 `IJudge` 接口（以及必要的输入/输出类型），禁止使用 `any`。
3. 工厂与统一入口：
   - 创建 `src/lib/judge/index.ts`，提供 `createJudge(...)`（或等价）工厂函数：
     - 根据 settings/运行环境选择 L1-only 或 L1+L2
     - L2 失败时必须有明确降级策略（例如 fallback 为仅 L1 结果）
     - 结果包含 `checkedAt` / `durationMs` 便于观测与 UI 展示

## 新增/修改文件

- `src/types/constraints.ts` - 约束规则与 Judge 结果类型（新增）
- `src/lib/judge/types.ts` - Judge 接口与类型出口（新增）
- `src/lib/judge/index.ts` - Judge 工厂与统一入口（新增）

## 验收标准

- [ ] `IJudge` 接口可被多种检查器实现
- [ ] 工厂函数可根据配置返回对应检查器
- [ ] 类型定义与 `openspec/specs/sprint-2-ai/spec.md` 完整对齐

## 参考

- Sprint 2 规格：`openspec/specs/sprint-2-ai/spec.md` 第 198-241 行（新增类型定义）
