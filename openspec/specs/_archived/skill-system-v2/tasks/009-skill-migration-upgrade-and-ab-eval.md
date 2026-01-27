# 任务 009: 迁移/升级助手 + A/B 评估（P3）

Status: paused (2026-01-24; unblocked by Theia baseline; needs re-scheduling)

## 目标

提供 SKILL 的演化能力：从 V1（DB-only/硬编码）迁移到 V2（`SKILL.md` SSOT），并为用户提供升级助手（格式/字段/变体建议）与可选 A/B 评估机制（对比新旧版本效果信号，不上传正文）。

## 依赖

- 任务 002：索引服务（支持 source_uri/hash/version 等）
- 任务 003：skill:read/list/toggle（可展示版本与状态）
- 任务 006：package 版本并存与切换（若 AB 以 package 版本为单位）

## 实现步骤

1. V1 → V2 迁移（内置优先）：
   - 内置 3 SKILL 迁移为 builtin package 的 `SKILL.md`
   - 历史记录保持兼容：`skillId` 不变（或提供映射表）
2. 升级助手：
   - 检测旧格式/缺字段/不推荐字段
   - 生成升级建议（补齐 `version/variants/modelProfile/context`）
   - 一键生成新版本 `SKILL.md`（不覆盖旧版本，允许回滚）
3. A/B 评估（可选开关，默认关闭）：
   - 维度：接受/拒绝率、回滚率、耗时、token、错误码分布
   - 采集：仅采集元信息与 hash，不采集正文内容
   - 展示：在 Skill Studio 提供对比视图与推荐结论（透明可解释）
4. 安全与可撤销：
   - 用户可随时关闭 A/B 并清空统计
   - 任何升级/切换可回滚到稳定版本
5. E2E：
   - 迁移后内置 3 SKILL 仍可运行
   - 升级后可切换/回滚
   - A/B 开启后多次运行可生成统计并可清空

## 新增/修改文件

- `electron/services/skills/migration.*`（新增/修改）
- `electron/services/skills/ab-metrics.*`（新增）
- `electron/ipc/skills.cjs`（修改）：`skill:migrate` / `skill:upgradeSuggest` / `skill:ab:toggle` / `skill:ab:stats` / `skill:ab:clear`
- `src/components/skills/SkillStudio.tsx`（修改）：升级建议与 A/B 视图
- `tests/e2e/`（新增/修改）：迁移/升级/回滚/A-B

## 验收标准

- [ ] V1 → V2 迁移后内置 3 SKILL 可用且历史兼容
- [ ] 升级助手可生成新版本 `SKILL.md` 并支持回滚
- [ ] A/B 评估不上传正文，仅采集可解释元信息，且可一键关闭与清空
- [ ] E2E 覆盖迁移、升级、回滚与 A/B 开关/清空
