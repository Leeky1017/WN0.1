# P0-002: 保存/连接/dirty 状态贯穿（Header/StatusBar/FileTree）

Status: done  
Issue: #281  
PR: https://github.com/Leeky1017/WN0.1/pull/286  
RUN_LOG: openspec/_ops/task_runs/ISSUE-281.md

## 元信息

| 字段 | 值 |
|------|-----|
| ID | P0-002 |
| Phase | P0 - 单链路统一（SSOT） |
| 优先级 | P0 |
| 状态 | Done |
| 依赖 | P0-001 |

## 必读前置（执行前必须阅读）

- [x] `openspec/specs/sprint-write-mode-ide/spec.md`（数据可靠性 + 可观测性 Requirements）
- [x] `design/02-editor-performance.md`（保存策略：不阻塞输入）
- [x] `design/03-quality-gates.md`（E2E 断言：Saving→Saved、落盘验证）
- [x] `openspec/specs/api-contract/spec.md`（错误码语义：IO_ERROR / PERMISSION_DENIED / TIMEOUT / CANCELED）

## 目标

让用户“永远知道自己有没有丢稿风险”：

1) 保存状态贯穿 UI（Header/StatusBar/FileTree modified dot）
2) 保存失败可观测、可理解、可重试（稳定 error.code）
3) 连接断开时明确降级（只读/不可保存）

## 任务清单

- [x] 1) 定义保存状态 SSOT（唯一来源）
  - [x] 复用 `writenow-frontend/src/stores/statusBarStore.ts` 的 `saveStatus`
  - [x] 复用 `writenow-frontend/src/stores/editorFilesStore.ts` 跟踪 per-file dirty/saveStatus
  - [x] 明确：Header/StatusBar/FileTree 都只能从该 SSOT 读取（禁止局部 state 再造一套）
- [x] 2) 建立 autosave 调度（不阻塞输入）
  - [x] TipTap onUpdate 只做：标记 dirty + schedule save（debounce 800–1200ms）
  - [x] 真正落盘只在 debounce 触发时执行：获取 markdown → `invoke('file:write', ...)`
  - [x] 处理竞态：Saving 期间继续输入 → 合并为下一次保存
- [x] 3) UI 贯穿显示（信任反馈）
  - [x] Header 显示 `Unsaved/Saving/Saved/Error`（并提供 tooltip 或短文案）
  - [x] Footer/StatusBar 显示连接状态（connected/disconnected）
  - [x] FileTree modified dot 绑定 `editorFilesStore.getDirty(path)`
- [x] 4) 错误与恢复语义（禁止 silent failure）
  - [x] 保存失败必须映射到稳定错误码（优先沿用 `IpcErrorCode`）
  - [x] UI 必须显示可理解信息，并提供“重试/另存为”入口（至少重试）
  - [x] 失败后必须清理 pending 状态（不能卡在 Saving）
- [x] 5) 可观测性
  - [x] 保存关键节点打点：`wm.save.schedule` / `wm.save.done`（见 `design/02`）
  - [x] main log / renderer log 中必须包含：filePath（脱敏）、latencyMs、error.code

## 验收标准

- [x] 输入后 UI 显示从 `Unsaved → Saving → Saved` 的稳定转换
- [x] 保存失败时 UI 显示 `Error`，且可点击重试；重试成功后回到 `Saved`
- [x] 文件树 modified dot 与真实 dirty 状态一致
- [x] 连接断开时明确提示“不可保存/只读”（不得默默失败）
- [x] 至少 1 条 E2E 可断言：落盘文件存在且内容正确（见 P2-001）

## 产出

- `writenow-frontend/src/stores/statusBarStore.ts`（如需扩展：错误信息/lastSavedAt）
- `writenow-frontend/src/stores/editorFilesStore.ts`（dirty/saveStatus 更新点）
- `writenow-frontend/src/components/layout/header.tsx`（真实保存状态 UI）
- `writenow-frontend/src/components/layout/footer.tsx`（连接/状态反馈）
- `writenow-frontend/src/features/write-mode/*`（autosave 调度与 RPC 落盘）

