# 任务 007: workflow 执行引擎 + 多 tier 路由（P2）

Status: paused (2026-01-24; unblocked by Theia baseline; needs re-scheduling)

## 目标

实现可组合的 workflow SKILL 与多模型兼容路由：支持多步串联执行、逐步可取消与可恢复，并在 high/mid/low 模型 tier 下分别采用语义/混合/规则策略，且结果可解释。

## 依赖

- 任务 001：SkillDefinitionV2（含 variants/workflow 字段）
- 任务 003：技能读取 IPC（能获取 workflow 定义与变体）
- 任务 006（可选）：package 路由配置（若 workflow 依赖 package）

## 实现步骤

1. 定义 workflow 表达：
   - step 列表、每步候选 skillRef、失败策略、确认策略（每步确认/末步确认）
2. 实现执行状态机：
   - per-step 状态（idle/streaming/done/error/canceled）
   - 取消：中止当前 step，并清理所有 pending 状态
   - 恢复：从某一步重试（不丢原文）
3. 实现 Router：
   - Low：纯规则（不额外调用模型）
   - Mid：规则优先 + 语义消歧（严格 token 上限、可取消、可缓存）
   - High：语义路由 + 规则兜底（可缓存）
4. 可解释性：
   - Router 输出 evidence（命中规则/语义 label/兜底路径）
   - UI 可在调试面板查看路由解释（不展示正文内容）
5. E2E：
   - workflow 成功：多步执行并最终应用
   - 中途取消：状态清理、可重试
   - 某步失败：错误码稳定、可回滚到原文、可选择继续或停止（按策略）

## 新增/修改文件

- `src/lib/skills/v2/router.ts`（新增）
- `src/lib/skills/v2/workflow-runner.ts`（新增）
- `src/stores/aiStore.ts`（修改）：支持 workflow run state
- `src/components/AI/`（修改）：多步 Diff/确认 UI（可渐进）
- `tests/e2e/`（新增/修改）：workflow + cancel + error 分支

## 验收标准

- [ ] workflow 可执行多步并保持可取消/可恢复
- [ ] 路由在 high/mid/low tier 下均可用，并有稳定兜底
- [ ] 路由结果可解释（包含 evidence）
- [ ] E2E 覆盖成功/取消/失败与回滚分支

## 参考

- 设计：`openspec/specs/skill-system-v2/design/skill-routing.md`
