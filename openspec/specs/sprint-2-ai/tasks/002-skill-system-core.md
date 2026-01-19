# 任务 002: SKILL 系统核心架构

## 目标

建立可扩展的 SKILL 系统：以统一的 SKILL 定义（Prompt 模板 + 上下文规则 + 输出格式）驱动 AI 调用，并与本地数据库 `skills` 表保持一致，为内置/自定义 SKILL 扩展打基础。

## 依赖

- 任务 001：Claude API 集成（流式调用通道）

## 实现步骤

1. 定义 SKILL 数据模型：
   - TypeScript 类型（Skill/ContextRules/OutputFormat）
   - 映射到数据库 `skills` 表字段（name/description/tag/system_prompt/user_prompt_template/context_rules/model/is_builtin）
2. 建立 SKILL 运行时协议：
   - 输入：选中内容 + 上下文（项目级/文章级）+ 用户参数（可选）
   - 输出：流式文本 + 最终建议稿（用于 Diff）
3. 初始化内置 SKILL：
   - 在应用启动或首次运行时写入 3 个内置 SKILL（is_builtin=1）
   - 保证重复启动不会产生重复记录（幂等）
4. UI 侧接入：
   - AI 面板显示 SKILL 列表与说明
   - 选中 SKILL 后触发流式生成，并进入 Diff 流程

## 新增/修改文件

- `electron/ipc/database.cjs` / `electron/ipc/skills.cjs` - skills 表与初始化（新增/修改）
- `src/stores/aiStore.ts` - SKILL 列表与当前执行状态（修改）
- `src/components/AI/SkillPanel.tsx`（或拆分现有 `AIPanel`）- SKILL 列表 UI（新增/修改）

## 验收标准

- [ ] SKILL 定义与核心规范一致，并能映射到 `skills` 表
- [ ] 内置 SKILL 初始化幂等（重复启动不重复插入）
- [ ] UI 可列出 SKILL 并触发执行
- [ ] 执行结果进入 Diff 展示（与任务 004 联动）

## 参考

- 核心规范：`openspec/specs/writenow-spec/spec.md` 第 57-79 行（SKILL 系统）
- 核心规范：`openspec/specs/writenow-spec/spec.md` 第 814-827 行（skills 表结构）
- 核心规范：`openspec/specs/writenow-spec/spec.md` 第 89-150 行（上下文工程：上下文层次）

