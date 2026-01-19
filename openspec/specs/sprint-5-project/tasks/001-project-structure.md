# 任务 001: 项目/文件夹结构

## 目标

以「项目（Project）」作为 WriteNow 的顶层工作单元，建立可导航的项目结构视图，并定义项目在本地的组织方式（数据库 + 可选的磁盘目录结构），为人物卡/大纲/知识图谱等项目资产提供统一归属与入口。

## 依赖

- Sprint 1：文件操作 IPC 与编辑器闭环（至少能创建/打开/保存文档）
- 本地数据库能力（SQLite / better-sqlite3）

## 实现步骤

1. 定义项目数据模型（与核心规范一致）：
   - `projects(id, name, description, style_guide, created_at, updated_at)`
   - 所有项目资产 MUST 绑定 `project_id`
2. 建立项目级入口与导航：
   - 侧边栏增加「项目切换/项目列表」
   - 当前项目下展示结构入口（至少：文档/人物/大纲/知识图谱）
3. IPC 设计（主进程代理）：
   - `project:list`：列出项目
   - `project:create`：创建项目
   - `project:update`：更新项目（name/description/style_guide）
   - `project:delete`：删除项目（需二次确认，删除策略可选：软删/硬删）
4. 本地文件夹策略（两选一，Sprint 5 选其一落地即可）：
   - A. **数据库为主**：文档仍按 Sprint 1 的文件落盘方式管理，`articles.project_id` 作为归属；“文件夹结构视图”作为 UI 分类，而非真实磁盘目录
   - B. **项目目录为主**：在用户文档目录创建 `WriteNow/<projectId>/`，并将项目文档与资源文件收敛到该目录（需要同步更新文件 IPC 的根路径策略）
5. 迁移与兼容：
   - 若存在“未归属项目”的历史文档，提供默认项目迁移策略（如创建 `Default Project` 并批量挂载）

## 新增/修改文件

- `electron/ipc/projects.cjs` - 项目 CRUD IPC（新增）
- `electron/ipc/database.cjs` - `projects` 表初始化/迁移（修改）
- `src/stores/projectStore.ts` - 当前项目与项目列表状态（新增）
- `src/components/Sidebar/*` - 项目切换与结构入口（修改/新增）
- `src/components/Sidebar/ProjectTree.tsx`（可选）- 项目结构视图（新增）

## 验收标准

- [ ] 可创建、切换、编辑项目；重启后项目列表可恢复
- [ ] 侧边栏展示项目结构入口（文档/人物/大纲/知识图谱），且不会串项目数据
- [ ] 新建资产默认归属当前项目（至少：文档；其余由后续任务补齐）
- [ ] 删除项目具备明确策略与二次确认（避免误删）

## 参考

- 核心规范：`openspec/specs/writenow-spec/spec.md` 第 775-812 行（数据库 Schema：project_id、projects/characters）
- 核心规范：`openspec/specs/writenow-spec/spec.md` 第 884-889 行（Sprint 5 范围：项目/文件夹结构）

