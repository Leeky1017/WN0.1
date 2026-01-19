# 任务 002: Markdown 导出

## 目标

支持将当前文档导出为 `.md` 文件（P0），通过保存对话框选择目标路径，保证导出内容可复现且与编辑器当前内容一致。

## 依赖

- Sprint 1：文件读写闭环（可读取/保存 `.md` 文档）
- Sprint 1：编辑器内容在渲染进程可获取（Zustand 单一事实来源）

## 实现步骤

1. 明确导出入口（至少一个）：
   - 菜单：`文件 → 导出 → Markdown`
   - （可选）命令面板入口
2. 主进程实现导出 IPC：
   - `export:markdown` 接收 `{ title, content }` 或 `{ path, content }`
   - 使用 `dialog.showSaveDialog` 让用户选择保存位置与文件名（默认使用文档标题）
   - 写入磁盘并返回明确结果（ok/path/error）
3. 渲染进程串联：
   - 从 store 获取当前文档标题与内容
   - 导出过程中展示 loading/禁用态
   - 成功后提示导出路径；失败提示可理解错误信息
4. 兼容双模式内容源：
   - 明确导出的“权威表示”（建议 Markdown 文本）
   - 若处于富文本模式，需保证能导出等价 Markdown（允许限制 Sprint 4 支持的节点集合）

## 新增/修改文件

- `electron/ipc/export.cjs`（新增）- 导出 IPC
- `electron/main.cjs` - 注册导出 IPC
- `electron/preload.cjs` - 暴露导出 API
- `src/components/*` - 导出入口 UI（菜单/按钮）
- `src/stores/*` - 导出状态与当前文档信息（若缺失）

## 验收标准

- [ ] 选择“导出 → Markdown”可保存生成 `.md` 文件到任意路径
- [ ] 导出内容与当前文档内容一致（可复现的 Markdown）
- [ ] 失败时展示明确错误信息（路径不可写/磁盘错误等），禁止 silent failure

## 参考

- 核心规范：`openspec/specs/writenow-spec/spec.md` 第 474-483 行（导出格式：Markdown P0）

