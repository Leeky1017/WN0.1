# 任务 005: 版本历史记录与回退

## 目标

实现版本历史记录：每次 AI 修改被接受后自动保存为一个版本（快照），支持用户查看版本列表、对比与一键回退，使写作过程具备“文字的 Git”体验。

## 依赖

- 任务 004：Diff 展示与确认机制（接受后触发版本记录）
- 本地数据库能力（SQLite / better-sqlite3）

## 实现步骤

1. 快照存储：
   - 接受 AI 修改后写入 `article_snapshots`（actor=`ai`）
   - 记录：content/name/reason/created_at
2. 历史列表 UI：
   - 展示版本时间、名称、原因（若有）
   - 支持选择任意版本查看内容
3. 对比与回退：
   - 选择版本与当前正文进行 Diff 对比（复用任务 004 的 Diff 能力）
   - 一键回退：将选中版本内容写回正文并标记保存状态
4. 版本命名（可选）：
   - 允许用户为版本添加名称（如“更激烈的冲突”）

## 新增/修改文件

- `electron/ipc/database.cjs` - `article_snapshots` 表与 CRUD（新增/修改）
- `src/components/AI/VersionHistory.tsx`（或 Sidebar 设置页）- 历史面板 UI（新增）
- `src/stores/aiStore.ts` / `src/stores/editorStore.ts` - 版本列表与回退动作（修改）

## 验收标准

- [ ] 接受 AI 修改后自动新增一个版本记录
- [ ] 版本历史可持久化并在重启后保留
- [ ] 可查看版本列表并一键回退
- [ ] 回退后编辑器正文与保存状态更新一致

## 参考

- 核心规范：`openspec/specs/writenow-spec/spec.md` 第 80-88 行（版本对比：文字的 Git）
- 核心规范：`openspec/specs/writenow-spec/spec.md` 第 779-789 行（article_snapshots 表）

