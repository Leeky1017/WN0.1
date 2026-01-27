# 任务 003: Word 和 PDF 导出

## 目标

在 Sprint 4 交付 `.docx` 与 `.pdf` 导出（P1），用于投稿、打印与分享，并尽量保留基础结构与排版（标题/段落/列表/加粗/斜体）。

## 依赖

- 任务 002：Markdown 导出（或至少具备稳定的“文档可复现表示”作为导出源）
- Electron 主进程具备文件保存对话框与磁盘写入能力

## 实现步骤

1. 统一导出源（建议）：
   - 以 Markdown 作为权威表示（从编辑器/Store 获取）
   - 通过 Markdown → HTML（或等价中间表示）派生 Word/PDF
2. Word（.docx）导出：
   - 选择转换方案（例如 HTML → DOCX 或 Markdown → DOCX）
   - 通过保存对话框选择输出位置
   - 保证基础结构可读（标题/段落/列表/加粗/斜体）
3. PDF 导出：
   - 使用 Electron 能力生成 PDF（例如 `webContents.printToPDF`）或等价方案
   - 提供可见加载/进度反馈（避免“卡住无提示”）
4. 主进程导出 IPC：
   - `export:docx` / `export:pdf`（返回 ok/path/error）
5. 渲染进程 UI：
   - 菜单：`文件 → 导出 → Word / PDF`
   - 导出成功/失败反馈；失败需可理解且可重试
6. 质量与兼容：
   - 明确支持的节点集合与降级策略（遇到复杂节点时提示或降级为纯文本）
   - 输出文件名默认使用文档标题

## 新增/修改文件

- `electron/ipc/export.cjs` - 增加 `export:docx` / `export:pdf`
- `electron/main.cjs` - 注册导出 IPC
- `src/components/*` - Word/PDF 导出入口与进度提示
- `src/lib/export/*`（可选新增）- 转换管线封装（Markdown/HTML/DOCX/PDF）

## 验收标准

- [ ] 选择“导出 → Word”可生成 `.docx` 并可被 Word/WPS 打开
- [ ] 选择“导出 → PDF”可生成 `.pdf` 并可正常打开
- [ ] 基础结构尽量保留（标题/段落/列表/加粗/斜体）
- [ ] 导出过程有明确进度/加载反馈，失败时有可理解错误信息并可重试

## 参考

- 核心规范：`openspec/specs/writenow-spec/spec.md` 第 474-483 行（导出格式：Word/PDF P1）

