# 任务 006: Skill Package 导入/导出与版本切换（P2）

## 目标

落地 Skill Package 的本地安装器：支持导入目录/压缩包、写入安装位置、索引更新、启用/禁用、版本切换与回滚；并在 UI 中提供“技能包库”管理视图。

## 依赖

- 任务 002：索引服务（file → DB index）
- 任务 003：skill 管理 IPC（至少具备 list/read/toggle）

## 实现步骤

1. 定义 package 校验：
   - 必须包含 `PACKAGE.md` 与至少一个 `skills/**/SKILL.md`
   - 解析 package frontmatter（id/version/license/author）
2. 实现导入流程：
   - 选择作用域（Global/Project）
   - 复制/解压到目标目录（按 `<packageId>/<version>/`）
   - 索引器增量刷新并写入 package 元数据索引
3. 实现版本切换与回滚：
   - 同一 package 多版本并存
   - 切换 active version 后，技能列表即时生效
4. 实现导出流程：
   - 将 package 打包导出（保留 `PACKAGE.md`、`SKILL.md`、references/assets）
5. E2E：
   - 导入一个 package → skills 出现在列表 → 可运行
   - 安装新版本 → 切换版本 → 行为改变可见（可回滚）
   - 卸载时若有运行中任务：返回 `CONFLICT`

## 新增/修改文件

- `electron/services/skills/package-installer.*`（新增）
- `electron/ipc/skills.cjs`（修改）：`package:import` / `package:export` / `package:uninstall` / `package:setActiveVersion`
- `src/components/skills/PackageLibrary.tsx`（新增）
- `tests/e2e/`（新增/修改）：导入/切换/回滚/冲突分支

## 验收标准

- [ ] 可导入/导出 Skill Package（目录/压缩包）
- [ ] 同一 package 支持多版本并存，且可切换 active version 并回滚
- [ ] package 可整体启用/禁用，并影响其下所有 skills
- [ ] E2E 覆盖导入、版本切换、回滚与卸载冲突分支

## 参考

- 设计：`openspec/specs/skill-system-v2/design/skill-package.md`
