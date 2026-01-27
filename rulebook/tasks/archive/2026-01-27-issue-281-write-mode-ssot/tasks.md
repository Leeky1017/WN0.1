## 1. Implementation
- [ ] 1.1 P0-001：替换 demo AppShell 主路径（TipTapEditor + 真实 FileTree + 真实 AI Panel）
- [ ] 1.2 P0-001：布局状态统一到 `layoutStore`（Sidebar/AI panel 展开收起、active tab），移除 AppShell 局部双状态
- [ ] 1.3 P0-002：实现 autosave 调度（debounce），并把保存/dirty/错误状态写入 SSOT（`statusBarStore` + `editorFilesStore`）
- [ ] 1.4 P0-002：Header/StatusBar/FileTree 统一展示 `unsaved/saving/saved/error` 与 modified dot；断连明确降级（不可保存/只读）

## 2. Testing
- [ ] 2.1 最小验证：本地启动 `writenow-frontend`（electron）可创建/打开文件，输入后状态 `Unsaved→Saving→Saved`
- [ ] 2.2 回归验证：断开后端/连接失败时，UI 显示不可保存且不会卡在 Saving（可重试）

## 3. Documentation
- [ ] 3.1 Rulebook task：补齐 `specs/sprint-write-mode-ide/spec.md` delta（本 task 目录下）
- [ ] 3.2 Task card：完成后回填 `Status/Issue/PR/RUN_LOG` 并勾选验收项
