# 任务 001: `SKILL.md` 格式与校验器（V2）

## 目标

定义并落地 WriteNow V2 的 `SKILL.md` 解析与校验能力：支持 YAML frontmatter + Markdown 正文，输出结构化 SkillDefinitionV2，并能在失败时给出稳定错误码与可恢复提示，为后续索引/安装/UI 编辑提供统一底座。

## 依赖

- 无（可并行推进 DB 扩展与 IPC 设计，但本任务建议先完成格式与 validator）

## 实现步骤

1. 定义 `SkillDefinitionV2` 数据结构与最小字段集合（见 `design/skill-format.md`）。
2. 实现 `SKILL.md` 解析器：
   - 读取 frontmatter（YAML）并解析为类型安全结构
   - 提取正文中 `User Instruction`（若采用）与展示用段落（可选）
3. 实现校验器：
   - 必填字段校验（`id/name/version/tags`）
   - SemVer 校验
   - 长度/Token 估算上限校验（超限必须失败且给出拆分建议）
   - 前向兼容：未知字段忽略但保留原文（用于 round-trip）
4. 输出稳定失败语义：
   - 统一返回 `IpcResponse`（或内部 Result）并带 `error.code/message/details`
   - 对应错误码：`INVALID_ARGUMENT` / `IO_ERROR` / `INTERNAL`
5. 添加单元测试覆盖边界：
   - 空 frontmatter / 缺字段 / 非法 SemVer / 超长 / 非 UTF-8（如适用）

## 新增/修改文件

- `src/lib/skills/v2/`（新增）：`parser.ts`、`validator.ts`、`types.ts`
- `electron/lib/skills/v2/`（新增，可选）：若主进程也需解析（推荐共享纯 TS 库或在主进程复用）
- `src/types/`（修改或新增）：V2 skill types（如需要）
- `tests/`（新增）：parser/validator 单元测试

## 验收标准

- [ ] 给定任意合法 `SKILL.md`，可解析为结构化 SkillDefinitionV2（字段完整、类型安全）
- [ ] 对缺字段/非法版本/超长等输入，校验失败可恢复且有稳定错误码
- [ ] 校验器具备明确的长度控制策略与拆分建议（references/package/variants）
- [ ] 单元测试覆盖关键边界分支并可重复运行

## 参考

- 规范：`openspec/specs/skill-system-v2/design/skill-format.md`
- 对比：`docs/reference/agent-skills/README.md`（SKILL.md + progressive disclosure）
