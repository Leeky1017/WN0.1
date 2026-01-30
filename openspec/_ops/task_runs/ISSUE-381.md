# ISSUE-381

- Issue: #381
- Branch: task/381-p3-dashboard-editor
- PR: https://github.com/Leeky1017/WN0.1/pull/382

## Plan

- 实现 Dashboard Sidebar 组件 (P3-10)
- 更新 Dashboard 页面使用 AppShell 三栏布局 (P3-11)
- 创建 editorStore 管理文档状态 (P3-12)
- 实现 EditorToolbar、TipTap 编辑器、EditorDetailsPanel (P3-13~P3-15)
- 组装 Editor 页面并配置路由 (P3-16)

## Runs

### 2026-01-30 实现 Dashboard + Editor 页面

- Command: `npm run typecheck`
- Key output: 
  ```
  > writenow-ui@0.1.0 typecheck
  > tsc --noEmit
  (exit code 0 - 无错误)
  ```
- Evidence: TypeScript 类型检查通过

### 实现的组件

1. **DashboardSidebar** (`src/features/dashboard/components/DashboardSidebar.tsx`)
   - Projects 列表（按状态过滤：All/Draft/Published/Archived）
   - Collections 列表（临时 mock 数据）
   - 集成 SidebarContent/SidebarSection/SidebarItem 组件

2. **DashboardPage 更新** (`src/features/dashboard/DashboardPage.tsx`)
   - 集成 AppShell 三栏布局
   - IconBar 导航（Projects/Search/AI/History/Settings）
   - DashboardSidebar 侧边栏
   - Toolbar 顶部工具栏

3. **editorStore** (`src/stores/editorStore.ts`)
   - 当前文档状态管理（path/content/isDirty）
   - 保存状态管理（idle/saving/saved/error）
   - 文档元数据计算（wordCount/charCount/readTime）
   - UI 状态（fullscreen/showDetails）

4. **EditorToolbar** (`src/features/editor/components/EditorToolbar.tsx`)
   - 返回 Dashboard 按钮
   - 可编辑文档标题
   - 保存状态指示器
   - 分享/导出/更多操作按钮

5. **EditorTipTap** (`src/features/editor/components/EditorTipTap.tsx`)
   - 集成 TipTap 富文本编辑器
   - 应用 Design Tokens 样式（标题 48px/正文 17px Lora/引用样式）
   - 支持 H1-H3、blockquote、代码块等
   - Cmd+S 快捷键保存

6. **EditorDetailsPanel** (`src/features/editor/components/EditorDetailsPanel.tsx`)
   - 封面图占位/显示
   - 标签列表
   - 统计信息（字数/字符数/阅读时间）
   - 日期信息（创建/修改时间）
   - 快速操作链接

7. **EditorPage** (`src/features/editor/EditorPage.tsx`)
   - AppShell 三栏布局
   - EditorToolbar 工具栏
   - EditorTipTap 编辑器
   - EditorDetailsPanel 详情面板
   - 文件树侧边栏（临时 mock）
   - 路由集成（`/editor/:id`）

