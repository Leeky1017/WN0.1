# 任务 009: L2 本地小模型集成 (SmolLM2-360M)

## 目标

集成本地小模型 SmolLM2-360M，通过 Zero-Shot Prompt 实现语义级约束判定（如语气、覆盖率），并与 L1 代码检查器组合输出最终 `JudgeResult`。

## 依赖

- 任务 006：Judge 层架构与接口定义
- 任务 010：模型下载器（模型文件准备与校验）

## 实现步骤

1. 本地推理封装：
   - 创建 `electron/lib/llm-runtime.cjs`，封装本地 GGUF 推理（加载/推理/超时/错误码），并提供可被 IPC 调用的接口。
2. L2 检查器实现：
   - 创建 `src/lib/judge/llm-judge.ts`，实现 `IJudge`：
     - L2 检查必须可超时（避免阻塞用户）
     - 超时/失败时必须降级（例如仅返回 L1 结果，并标记 `l2Passed=false`）
3. Prompt 资产：
   - 创建 `src/lib/judge/prompts/tone.ts` - 语气判定 Prompt
   - 创建 `src/lib/judge/prompts/coverage.ts` - 覆盖率检测 Prompt
4. 性能与观测：
   - `JudgeResult.durationMs` 必须真实记录，单次推理目标 < 3s（超过时按降级策略处理）。

## 新增/修改文件

- `electron/lib/llm-runtime.cjs` - 本地 LLM 推理封装（新增）
- `src/lib/judge/llm-judge.ts` - L2 检查器实现（新增）
- `src/lib/judge/prompts/tone.ts` - 语气判定 Prompt（新增）
- `src/lib/judge/prompts/coverage.ts` - 覆盖率检测 Prompt（新增）

## 验收标准

- [ ] 模型可加载并推理
- [ ] 单次推理耗时 < 3 秒
- [ ] 超时时降级为 L1 结果

## 参考

- Sprint 2 规格：`openspec/specs/sprint-2-ai/spec.md`（新增类型定义与文件清单）
