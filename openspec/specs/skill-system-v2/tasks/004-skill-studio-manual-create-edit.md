# 任务 004: Skill Studio（手动创建/编辑/校验）

## 目标

为写作者提供足够简单的 UI 来创建与编辑自定义 SKILL：表单化编辑（默认），可切换为源码视图（高级），并提供即时校验、Prompt 预览与 token 估算，最终以 `SKILL.md` 落盘并触发索引更新。

## 依赖

- 任务 001：`SKILL.md` 解析与校验器
- 任务 002：索引服务（保存后可增量更新）
- 任务 003：skill:list/read 基础 IPC（用于 UI 列表与详情读取）

## 实现步骤

1. UI 入口设计（尽量不打扰现有 AI 面板）：
   - AI 面板增加“技能库 / 新建技能”入口（或独立设置页）
2. 手动创建流程：
   - 选择作用域：Global / Project
   - 填写最小字段（name/description/tags/output constraints）
   - 可选：声明 refs slots（例如 platform），并管理 `references/` 下的 ref 文件（新增/编辑/删除）
   - 选择模型 tier 与默认模型（可选）
   - 生成并保存 `SKILL.md`（用户确认后落盘）
3. 编辑与校验：
   - 实时校验（显示具体错误与修复建议）
   - Prompt 预览：展示最终 System Prompt/User Content 结构（与 ContextAssembler 一致）
   - Token 估算：提示超限风险与拆分建议
4. 启用/禁用与删除（安全）：
   - 禁用立即生效（索引层）
   - 删除需二次确认；删除失败有可理解错误码
5. E2E：
   - 新建 skill → 出现在列表 → 可运行
   - 编辑 skill → 版本/内容变更生效
   - 校验失败 → 无法保存且错误提示明确
   - refs 管理：新增一个 ref 文件后可在运行前被选择并生效

## 新增/修改文件

- `src/components/skills/`（新增）：Skill Studio UI
- `src/stores/skillsStore.ts`（新增/修改）：skills 列表/详情/编辑状态
- `electron/ipc/skills.cjs`（修改）：新增 `skill:create` / `skill:update` / `skill:delete`（或统一 `skill:writeFile`）
- `tests/e2e/`（新增/修改）：Skill Studio 端到端流程

## 验收标准

- [ ] 用户可在 UI 中创建/编辑自定义 SKILL，并以 `SKILL.md` 形式落盘
- [ ] 保存前有明确校验与 token 估算；失败可恢复且不会写入无效文件
- [ ] 变更后索引自动更新，列表与运行立即生效
- [ ] refs slots 与 ref 文件可在 UI 中管理，并遵循 progressive disclosure（只按需注入正文）
- [ ] E2E 覆盖创建/编辑/校验失败分支
