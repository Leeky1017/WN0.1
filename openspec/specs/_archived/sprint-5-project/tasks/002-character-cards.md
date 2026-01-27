# 任务 002: 人物设定卡片 UI 与存储

## 目标

实现人物设定卡片的最小闭环（列表 + 详情编辑 + 持久化）：在当前项目内创建、编辑、删除人物，并以结构化字段存储（traits/relationships JSON），为 AI 上下文与知识图谱提供可信数据源。

## 依赖

- 任务 001：项目/文件夹结构（必须有当前项目上下文）
- 本地数据库能力（SQLite / better-sqlite3）

## 实现步骤

1. 数据模型对齐核心规范：
   - `characters(id, project_id, name, description, traits, relationships, created_at, updated_at)`
2. IPC 设计（主进程代理）：
   - `character:list`（按 project_id）
   - `character:create`
   - `character:update`
   - `character:delete`
3. UI 结构（建议 Cursor/Linear 风格）：
   - 左侧：人物列表（name + 简短描述/标签）
   - 右侧：人物详情卡片（表单编辑 + 保存状态）
4. JSON 字段编辑体验（最小可用）：
   - traits：以可编辑的 tag/list 形式录入，落库为 JSON 字符串
   - relationships：提供“关系条目列表”（对象 + 关系类型 + 备注），落库为 JSON 字符串
5. 与知识图谱的连接点（预留）：
   - 人物 relationships 的结构应可被后续任务映射为图谱边（不要求 Sprint 5 自动同步，但需保持可映射性）

## 新增/修改文件

- `electron/ipc/characters.cjs` - 人物 CRUD IPC（新增）
- `electron/ipc/database.cjs` - `characters` 表初始化/迁移（修改）
- `src/stores/characterStore.ts` - 人物列表与当前人物状态（新增）
- `src/components/Characters/*` - 人物列表/详情卡片组件（新增）

## 验收标准

- [ ] 在当前项目内可创建人物，并在列表中可见
- [ ] 可编辑并保存 description/traits/relationships；重启后仍可恢复
- [ ] 人物数据严格按 `project_id` 隔离（不串项目）
- [ ] 删除人物具备二次确认，并刷新列表

## 参考

- 核心规范：`openspec/specs/writenow-spec/spec.md` 第 775-812 行（characters 表字段：traits/relationships JSON + project_id）
- 核心规范：`openspec/specs/writenow-spec/spec.md` 第 99-103 行（上下文层次：项目级包含人物卡片）

