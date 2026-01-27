# 任务 004: 自动保存 + 崩溃恢复机制

## 目标

实现 Cursor/Antigravity 风格自动保存：2 秒无操作防抖自动保存；保留 `Ctrl/Cmd+S` 手动保存；状态栏展示保存状态；并提供定时快照与崩溃恢复流程，确保创作内容不因崩溃丢失。

## 依赖

- 任务 003：文件操作 IPC（必须具备 `file:write`）
- 任务 005：Zustand（需要有 `isDirty`、`saveStatus`、`lastSavedAt` 等可观测状态）
- 任务 001：TipTap 集成（若自动保存监听来源为编辑器更新）

## 实现步骤

1. 自动保存防抖（渲染进程）：
   - 在 editor store 或 editor 组件中监听内容变化
   - 若 `isDirty=true` 且 2 秒无操作则触发一次保存
   - 保存期间更新 `saveStatus='saving'`；成功后 `saved`；失败后 `error`
2. 手动保存快捷键：
   - 监听 `Ctrl/Cmd+S`，阻止默认行为并触发一次立即保存
3. 状态栏展示：
   - 展示三态：已保存 / 保存中 / 保存失败（可重试）
   - 保存成功记录 `lastSavedAt`
4. 定时快照（主进程或渲染进程均可，需明确落盘位置与格式）：
   - 每 5 分钟对当前打开文档做一次快照保存（可用独立目录，如 `userData/snapshots/`）
   - 需要包含：文档标识（path）、快照时间、内容（建议 Markdown）与来源（`auto`）
   - 可增加简单保留策略（例如每文档最多保留 N 份或保留最近 7 天）
5. 崩溃检测：
   - 启动时写入“运行中”标记文件（例如 `userData/session.lock`）
   - 正常退出时清理标记；若下次启动发现标记仍存在则判定上次非正常退出
6. 恢复流程（渲染进程 UI）：
   - 若检测到非正常退出且存在快照：弹窗提示“恢复最近编辑内容？”
   - 用户选择恢复后：加载最近快照内容到编辑器并允许保存为当前文档
   - 用户选择忽略：清理标记与过期快照（按策略）

## 新增/修改文件

- `src/stores/editorStore.ts` - 自动保存状态机（`isDirty/saveStatus/lastSavedAt`）与 `save()` 动作
- `src/components/Editor/index.tsx` - 触发自动保存/手动保存监听（按组件职责选择）
- `src/components/StatsBar.tsx`（或等价状态栏组件）- 保存状态展示
- `electron/main.cjs` - 崩溃检测标记的写入/清理（或单独模块）
- `electron/ipc/files.cjs` - （可选）快照读写 IPC（若快照由主进程管理）
- `src/components/ui/dialog.tsx` - 复用弹窗组件（如已有）

## 验收标准

- [ ] 2 秒无操作后自动保存触发一次写盘，且状态栏正确显示“保存中/已保存”
- [ ] `Ctrl/Cmd+S` 可立即保存（不等待防抖）
- [ ] 保存失败时可见明确状态（`error`）且不 silent failure
- [ ] 每 5 分钟生成一次快照（可在磁盘验证快照文件存在）
- [ ] 模拟崩溃后重启：能检测到上次未正常关闭并提示恢复；选择恢复后内容可继续编辑并保存

## 参考

- 核心规范：`openspec/specs/writenow-spec/spec.md` 第 496-513 行（自动保存策略 + 崩溃恢复）
- 核心规范：`openspec/specs/writenow-spec/spec.md` 第 372-380 行（快捷键：手动保存）
