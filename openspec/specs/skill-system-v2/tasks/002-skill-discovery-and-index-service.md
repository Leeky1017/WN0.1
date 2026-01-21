# 任务 002: SKILL 发现与索引服务（file → DB index）

## 目标

实现 SkillIndexService：扫描 builtin/global/project 三层目录，解析 `SKILL.md` 并将索引写入数据库；支持增量更新与可观测错误状态，确保 “文件为源、DB 为索引” 可落地且不引入双源漂移。

## 依赖

- 任务 001：`SKILL.md` 解析与校验器（V2）

## 实现步骤

1. 定义扫描目录与优先级合并规则：
   - Builtin < Global < Project（允许覆盖同 `id` 的低优先级定义）
   - 冲突与覆盖必须可解释（记录来源与生效原因）
2. 实现索引写入策略（幂等）：
   - `source_uri`、`source_hash`、`version`、`scope`、`package_id`（如采用）等字段写入
   - 解析失败时写入 “invalid” 状态与错误详情（不得 silent failure）
3. 增量索引与监听：
   - 文件变更监听（新增/修改/删除）触发增量更新
   - 防抖与批处理，避免大量文件变更导致卡顿
4. 启动时内置技能迁移：
   - 将现有 3 个内置技能以 builtin package 的 `SKILL.md` 形式提供
   - 启动流程改为：扫描 builtin → 写入索引（取代旧的硬编码 upsert）
5. E2E 验证（真实持久化）：
   - 安装/删除一个项目级 skill 文件后，UI 列表可见变化
   - 无效 skill 文件不会导致系统崩溃，且错误在 UI 中可见

## 新增/修改文件

- `electron/services/skills/`（新增）：`skill-index-service.cjs|ts`、`watcher.cjs|ts`
- `electron/database/schema.sql`（修改）：新增索引所需字段/表（增量、向后兼容）
- `electron/main.cjs`（修改）：启动时用 SkillIndexService 取代旧 ensureBuiltinSkills（或重构其实现为索引器的一部分）
- `tests/e2e/`（新增/修改）：技能发现/索引相关 E2E

## 验收标准

- [ ] builtin/global/project 三层目录的技能可被发现并写入 DB 索引（幂等）
- [ ] 同 `id` 冲突时按优先级覆盖且可解释（包含来源与 hash）
- [ ] 文件变更可触发增量索引更新（无需重启）
- [ ] 解析失败可恢复：技能被标记 invalid，UI 可见错误原因，系统可继续运行
- [ ] E2E 覆盖：新增/修改/删除 skill 文件后的列表变化与错误分支

## 参考

- 规范：`openspec/specs/skill-system-v2/spec.md`（发现/索引要求）
- 设计：`openspec/specs/skill-system-v2/design/skill-format.md`
- 设计：`openspec/specs/skill-system-v2/design/skill-package.md`
