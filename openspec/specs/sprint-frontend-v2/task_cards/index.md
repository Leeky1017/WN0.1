# Sprint Frontend V2 任务卡片索引

## 概览

| Phase | 主题 | 任务数 | 状态 |
|-------|------|--------|------|
| P0 | 基础设施 | 5 | Pending |
| P1 | 核心布局 | 4 | Pending |
| P2 | 编辑器 | 4 | Pending |
| P3 | AI 面板 | 4 | Pending |
| P4 | 命令面板与设置 | 3 | Pending |
| P5 | 辅助功能 | 3 | Pending |
| P6 | Electron 打包 | 4 | Pending |
| P7 | 打磨与优化 | 4 | Pending |

**总计：31 个任务**

---

## Phase 0：基础设施

| ID | 任务 | 优先级 | 状态 |
|----|------|--------|------|
| [P0-001](p0/P0-001-project-scaffold.md) | 创建 writenow-frontend 项目骨架 | P0 | Pending |
| [P0-002](p0/P0-002-tailwind-tokens.md) | 配置 Tailwind + Design Tokens | P0 | Pending |
| [P0-003](p0/P0-003-shadcn-ui.md) | 集成 shadcn/ui 基础组件 | P0 | Pending |
| [P0-004](p0/P0-004-rpc-client.md) | 实现 RPC 客户端 | P0 | Pending |
| [P0-005](p0/P0-005-e2e-validation.md) | 验证端到端通路 | P0 | Pending |

**验收标准**：新前端能成功调用后端接口并显示项目信息。

---

## Phase 1：核心布局

| ID | 任务 | 优先级 | 状态 |
|----|------|--------|------|
| [P1-001](p1/P1-001-flexlayout.md) | 集成 FlexLayout 布局系统 | P0 | Pending |
| [P1-002](p1/P1-002-file-tree.md) | 实现文件树（react-arborist） | P0 | Pending |
| [P1-003](p1/P1-003-status-bar.md) | 实现 Status Bar | P1 | Pending |
| [P1-004](p1/P1-004-layout-persistence.md) | 布局持久化 | P1 | Pending |

**验收标准**：可以浏览文件、调整布局、看到状态栏。

---

## Phase 2：编辑器

| ID | 任务 | 优先级 | 状态 |
|----|------|--------|------|
| [P2-001](p2/P2-001-tiptap-migration.md) | 迁移 TipTap 编辑器组件 | P0 | Pending |
| [P2-002](p2/P2-002-multi-tab.md) | 实现多标签编辑 | P0 | Pending |
| [P2-003](p2/P2-003-auto-save.md) | 实现文件保存 | P0 | Pending |
| [P2-004](p2/P2-004-floating-toolbar.md) | 实现浮动工具栏 | P1 | Pending |

**验收标准**：可以打开、编辑、保存 Markdown 文件。

---

## Phase 3：AI 面板

| ID | 任务 | 优先级 | 状态 |
|----|------|--------|------|
| [P3-001](p3/P3-001-ai-panel-logic.md) | 迁移 AI 面板逻辑 | P0 | Pending |
| [P3-002](p3/P3-002-ai-panel-ui.md) | 重做 AI 面板 UI | P0 | Pending |
| [P3-003](p3/P3-003-diff-view.md) | 实现 Diff 视图 | P0 | Pending |
| [P3-004](p3/P3-004-slash-commands.md) | 实现斜杠命令 | P1 | Pending |

**验收标准**：可以选中文字、调用 AI、查看 Diff、应用修改。

---

## Phase 4：命令面板与设置

| ID | 任务 | 优先级 | 状态 |
|----|------|--------|------|
| [P4-001](p4/P4-001-cmdk.md) | 集成 cmdk 命令面板 | P0 | Pending |
| [P4-002](p4/P4-002-settings-panel.md) | 实现设置面板 | P0 | Pending |
| [P4-003](p4/P4-003-theme-switch.md) | 实现主题切换 | P1 | Pending |

**验收标准**：Cmd+K 打开命令面板，可切换主题。

---

## Phase 5：辅助功能

| ID | 任务 | 优先级 | 状态 |
|----|------|--------|------|
| [P5-001](p5/P5-001-version-history.md) | 实现版本历史面板 | P0 | Pending |
| [P5-002](p5/P5-002-toast.md) | 实现通知系统（sonner） | P1 | Pending |
| [P5-003](p5/P5-003-hotkeys.md) | 实现快捷键系统 | P1 | Pending |

**验收标准**：版本历史可用，操作有反馈。

---

## Phase 6：Electron 打包

| ID | 任务 | 优先级 | 状态 |
|----|------|--------|------|
| [P6-001](p6/P6-001-electron-vite.md) | 配置 electron-vite | P0 | Pending |
| [P6-002](p6/P6-002-backend-launcher.md) | 实现主进程启动后端 | P0 | Pending |
| [P6-003](p6/P6-003-electron-builder.md) | 配置 electron-builder | P0 | Pending |
| [P6-004](p6/P6-004-platform-testing.md) | 测试各平台安装包 | P1 | Pending |

**验收标准**：可生成可安装的桌面应用。

---

## Phase 7：打磨与优化

| ID | 任务 | 优先级 | 状态 |
|----|------|--------|------|
| [P7-001](p7/P7-001-animations.md) | 动效优化（Framer Motion） | P1 | Pending |
| [P7-002](p7/P7-002-performance.md) | 性能优化 | P0 | Pending |
| [P7-003](p7/P7-003-accessibility.md) | 无障碍优化 | P1 | Pending |
| [P7-004](p7/P7-004-polish.md) | 细节打磨 | P1 | Pending |

**验收标准**：达到 Cursor/Linear 级别的视觉和交互质量。

---

## 依赖关系图

```
P0-001 → P0-002 → P0-003
   ↓
P0-004 → P0-005
             ↓
         P1-001 → P1-002
            ↓       ↓
         P1-003  P1-004
             ↓
         P2-001 → P2-002
            ↓       ↓
         P2-003  P2-004
             ↓
         P3-001 → P3-002
            ↓       ↓
         P3-003  P3-004
             ↓
         P4-001 → P4-002 → P4-003
             ↓
         P5-001
         P5-002
         P5-003
             ↓
         P6-001 → P6-002 → P6-003 → P6-004
             ↓
         P7-001 → P7-004
         P7-002
         P7-003
```
