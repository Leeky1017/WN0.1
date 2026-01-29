---
name: Variant 设计落地
overview: 废弃现有 writenow-frontend 代码，基于 Variant 深色极简设计重新实现 WriteNow 前端。设计稿未覆盖的页面由 Agent 按已有风格推导，保持视觉一致性。
todos:
  - id: p0-init-project
    content: "P0-01: 创建 writenow-ui 项目目录，初始化 package.json (React 18, TypeScript 5, Vite 6)"
    status: pending
  - id: p0-tailwind
    content: "P0-02: 安装配置 Tailwind CSS 4，创建 tailwind.config.ts"
    status: pending
  - id: p0-tokens-css
    content: "P0-03: 创建 src/styles/tokens.css，定义所有 CSS Variables (颜色/间距/圆角/字体/动效)"
    status: pending
  - id: p0-fonts
    content: "P0-04: 下载并配置 Web 字体 (Inter/Lora/JetBrains Mono)，创建 @font-face 声明"
    status: pending
  - id: p0-globals
    content: "P0-05: 创建 src/styles/globals.css，引入 tokens.css，设置全局重置样式"
    status: pending
  - id: p0-tsconfig
    content: "P0-06: 配置 tsconfig.json 严格模式，设置路径别名 (@/)"
    status: pending
  - id: p1a-button
    content: "P1A-01: primitives/Button (Primary/Secondary/Ghost/Icon, disabled/loading)"
    status: pending
  - id: p1a-input
    content: "P1A-02: primitives/Input (Text/Password/Search, icon slot, error 状态)"
    status: pending
  - id: p1a-textarea
    content: "P1A-03: primitives/Textarea (自动高度, 字数统计)"
    status: pending
  - id: p1a-card
    content: "P1A-04: primitives/Card (Default/Hover/Active, 24px 圆角)"
    status: pending
  - id: p1a-badge
    content: "P1A-05: primitives/Badge (Default/Success/Warning/Error)"
    status: pending
  - id: p1a-divider
    content: "P1A-06: primitives/Divider (Horizontal/Vertical, label slot)"
    status: pending
  - id: p1a-switch
    content: "P1A-07: primitives/Switch (基于 Radix Switch)"
    status: pending
  - id: p1a-checkbox
    content: "P1A-08: primitives/Checkbox (基于 Radix Checkbox)"
    status: pending
  - id: p1a-tooltip
    content: "P1A-09: primitives/Tooltip (基于 Radix Tooltip, 300ms 延迟)"
    status: pending
  - id: p1a-avatar
    content: "P1A-10: primitives/Avatar (Image/Fallback/Initials)"
    status: pending
  - id: p1a-spinner
    content: "P1A-11: primitives/Spinner (sm/md/lg)"
    status: pending
  - id: p1a-select
    content: "P1A-12: primitives/Select (基于 Radix Select, 下拉选择)"
    status: pending
  - id: p1a-popover
    content: "P1A-13: primitives/Popover (基于 Radix Popover)"
    status: pending
  - id: p1a-dialog
    content: "P1A-14: primitives/Dialog (基于 Radix Dialog, 遮罩+居中)"
    status: pending
  - id: p1a-toast
    content: "P1A-15: primitives/Toast (Sonner 或自建, 4 种变体)"
    status: pending
  - id: p1b-empty-state
    content: "P1B-01: patterns/EmptyState (图标 + 文案 + 操作按钮)"
    status: pending
  - id: p1b-loading-state
    content: "P1B-02: patterns/LoadingState (骨架屏/Spinner)"
    status: pending
  - id: p1b-error-state
    content: "P1B-03: patterns/ErrorState (图标 + 文案 + 重试)"
    status: pending
  - id: p1b-confirm-dialog
    content: "P1B-04: patterns/ConfirmDialog (危险操作确认)"
    status: pending
  - id: p1b-code-block
    content: "P1B-05: patterns/CodeBlock (语法高亮 + 复制)"
    status: pending
  - id: p2-icon-bar
    content: "P2-01: 实现 IconBar 组件 (48px 宽图标导航条，含 Tooltip 悬浮显示)"
    status: pending
  - id: p2-resizer
    content: "P2-02: 实现 Resizer 组件 (可拖拽分割线，含 min/max 宽度限制)"
    status: pending
  - id: p2-sidebar-content
    content: "P2-03: 实现 SidebarContent 组件 (可折叠内容区，含 Section/Item 子组件)"
    status: pending
  - id: p2-panel
    content: "P2-04: 实现 Panel 组件 (右侧面板，可折叠，支持 280px/360px 两种宽度)"
    status: pending
  - id: p2-toolbar
    content: "P2-05: 实现 Toolbar 组件 (60px/80px 两种高度，flex 布局)"
    status: pending
  - id: p2-app-shell
    content: "P2-06: 实现 AppShell 组件 (整合 IconBar/Sidebar/Main/Panel，管理折叠和拖拽状态)"
    status: pending
  - id: p2-layout-store
    content: "P2-07: 创建 layoutStore (Zustand)，管理 sidebarWidth/panelWidth/collapsed 状态"
    status: pending
  - id: p3-router
    content: "P3-01: 配置 React Router，定义路由结构 (/login, /dashboard, /editor/:id)"
    status: pending
  - id: p3-auth-store
    content: "P3-02: 创建 authStore，实现本地单用户模式 (临时方案，预留 API 对接)"
    status: pending
  - id: p3-login-form
    content: "P3-03: 实现 LoginForm 组件 (Email/Password 输入，Remember Me，Submit)"
    status: pending
  - id: p3-login-oauth
    content: "P3-04: 实现 OAuthButtons 组件 (GitHub/SSO 按钮，点击预留)"
    status: pending
  - id: p3-login-page
    content: "P3-05: 组装 Login 页面 (Logo + Form + OAuth + Links，对照 design-255901f0)"
    status: pending
  - id: p3-project-store
    content: "P3-06: 创建 projectStore，对接现有 project:* IPC (list/create/update/delete)"
    status: pending
  - id: p3-project-card
    content: "P3-07: 实现 ProjectCard 组件 (封面/标题/摘要/日期/标签，240px 高度)"
    status: pending
  - id: p3-hero-card
    content: "P3-08: 实现 HeroCard 组件 (特色项目大卡片，320px 最小高度)"
    status: pending
  - id: p3-dashboard-grid
    content: "P3-09: 实现 Dashboard 项目网格布局 (Bento Grid 风格)"
    status: pending
  - id: p3-dashboard-sidebar
    content: "P3-10: 实现 Dashboard Sidebar (Projects 列表 + Collections 列表)"
    status: pending
  - id: p3-dashboard-page
    content: "P3-11: 组装 Dashboard 页面 (对照 design-a2aabb70)"
    status: pending
  - id: p3-editor-store
    content: "P3-12: 创建 editorStore，管理当前文档状态 (path/isDirty/saveStatus)"
    status: pending
  - id: p3-editor-toolbar
    content: "P3-13: 实现 EditorToolbar (文档标题/保存状态/操作按钮)"
    status: pending
  - id: p3-editor-tiptap
    content: "P3-14: 集成 TipTap 编辑器，应用 Design Tokens 样式"
    status: pending
  - id: p3-editor-details
    content: "P3-15: 实现 EditorDetailsPanel (右侧详情面板：封面/标签/字数/阅读时间)"
    status: pending
  - id: p3-editor-page
    content: "P3-16: 组装 Editor 页面 (对照 design-a565d21b)"
    status: pending
  - id: p4-ai-store
    content: "P4-01: 创建/复用 aiStore，对接现有 ai:skill:run IPC"
    status: pending
  - id: p4-message-bubble
    content: "P4-02: 实现 MessageBubble 组件 (User/Assistant 两种样式)"
    status: pending
  - id: p4-code-block
    content: "P4-03: 实现 CodeBlock 组件 (语法高亮/复制/应用按钮)"
    status: pending
  - id: p4-ai-input
    content: "P4-04: 实现 AIInput 组件 (多行输入/发送按钮/快捷键)"
    status: pending
  - id: p4-ai-header
    content: "P4-05: 实现 AIHeader 组件 (模型选择/角色选择/折叠按钮)"
    status: pending
  - id: p4-ai-panel
    content: "P4-06: 组装 AIPanel 组件 (360px 宽度，消息列表+输入区)"
    status: pending
  - id: p4-ai-integration
    content: "P4-07: 将 AIPanel 集成到 Editor 页面 (作为右侧 Panel)"
    status: pending
  - id: p5-settings-store
    content: "P5-01: 创建 settingsStore，定义 UserSettings schema，localStorage 持久化"
    status: pending
  - id: p5-settings-nav
    content: "P5-02: 实现 SettingsNav 组件 (左侧导航列表)"
    status: pending
  - id: p5-settings-section
    content: "P5-03: 实现 SettingsSection 组件 (右侧内容区容器)"
    status: pending
  - id: p5-settings-writing
    content: "P5-04: 实现 Writing Experience 设置页 (Focus Mode/Typewriter/Smart Punctuation)"
    status: pending
  - id: p5-settings-data
    content: "P5-05: 实现 Data & Storage 设置页 (Auto Save/Backup 设置)"
    status: pending
  - id: p5-settings-appearance
    content: "P5-06: 实现 Appearance 设置页 (Theme/Font/Scale)"
    status: pending
  - id: p5-settings-modal
    content: "P5-07: 组装 SettingsModal 组件 (对照 design-5d03b9cc)"
    status: pending
  - id: p6-file-store
    content: "P6-01: 创建/复用 fileStore，对接现有 file:* IPC (list/create/delete/read/write)"
    status: pending
  - id: p6-file-tree-item
    content: "P6-02: 实现 FileTreeItem 组件 (文件/文件夹，展开/折叠，右键菜单)"
    status: pending
  - id: p6-file-tree
    content: "P6-03: 实现 FileTree 组件 (递归渲染，拖拽排序预留)"
    status: pending
  - id: p6-file-tree-integration
    content: "P6-04: 将 FileTree 集成到 Sidebar"
    status: pending
  - id: p7-command-store
    content: "P7-01: 创建 commandStore，定义命令注册机制"
    status: pending
  - id: p7-command-palette
    content: "P7-02: 实现 CommandPalette 组件 (Cmd+K 唤起，搜索/快捷键显示)"
    status: pending
  - id: p7-version-store
    content: "P7-03: 创建/复用 versionStore，对接现有 version:* IPC"
    status: pending
  - id: p7-version-item
    content: "P7-04: 实现 VersionItem 组件 (时间/描述/恢复按钮)"
    status: pending
  - id: p7-version-panel
    content: "P7-05: 实现 VersionHistoryPanel 组件"
    status: pending
  - id: p7-export-dialog
    content: "P7-06: 实现 ExportDialog 组件 (格式选择/导出按钮)"
    status: pending
  - id: p7-toast
    content: "P7-07: 实现 Toast 组件 (Success/Error/Info 三种类型)"
    status: pending
  - id: p8-register-page
    content: "P8-01: 实现 Register 页面 (按 Login 风格推导)"
    status: pending
  - id: p8-forgot-password
    content: "P8-02: 实现 Forgot Password 页面 (按 Login 风格推导)"
    status: pending
  - id: p8-skills-panel
    content: "P8-03: 实现 SkillsPanel 组件 (技能列表/开关)"
    status: pending
  - id: p8-memory-panel
    content: "P8-04: 实现 MemoryPanel 组件 (记忆列表/编辑)"
    status: pending
  - id: p8-search-panel
    content: "P8-05: 实现 SearchPanel 组件 (全文搜索/语义搜索切换)"
    status: pending
  - id: p9-project-extend
    content: "P9-01: 扩展 Project 模型 (status/coverImage/tags/wordCount/featured/collectionId)"
    status: pending
  - id: p9-collection-api
    content: "P9-02: 实现 Collection CRUD API (collection:create/list/update/delete)"
    status: pending
  - id: p9-settings-api
    content: "P9-03: 标准化 Settings API (定义 UserSettings schema)"
    status: pending
  - id: p9-stats-extend
    content: "P9-04: 扩展 Stats API (stats:goal:get/set, stats:activity:list)"
    status: pending
  - id: p9-upload-api
    content: "P9-05: 实现图片上传 API (upload:image)"
    status: pending
  - id: p9-auth-api
    content: "P9-06: 实现认证 API (auth:login/register/logout/session) - 后续迭代"
    status: pending
  - id: p9-share-api
    content: "P9-07: 实现分享 API (share:create/list/revoke) - 后续迭代"
    status: pending
isProject: false
---

# Variant 设计落地 - WriteNow 前端重新实现

> 详细设计规范文档: [Variant/DESIGN_SPEC.md](/home/leeky/work/WriteNow/Variant/DESIGN_SPEC.md)

---

## 一、设计系统提取 (Design Tokens)

从 Variant 设计稿中提取的设计系统，作为前端实现的唯一视觉基准。

### 1.1 颜色系统

```css
/* 背景层级 */
--bg-body: #080808;       /* 最深层背景 */
--bg-surface: #0f0f0f;    /* 卡片/面板背景 */
--bg-hover: #1a1a1a;      /* 悬停状态 */

/* 文字层级 */
--text-main: #ffffff;     /* 主文字 */
--text-muted: #888888;    /* 次要文字 */
--text-faint: #444444;    /* 最弱文字/占位符 */

/* 边框/线条 */
--line-color: #222222;    /* 默认边框 */
--line-highlight: #444444; /* 高亮边框 */
```

### 1.2 字体系统

- UI 字体: `'Inter', -apple-system, BlinkMacSystemFont, sans-serif`
- 正文字体: `'Lora', 'Crimson Pro', serif`
- 代码字体: `'JetBrains Mono', monospace`

### 1.3 间距系统

```css
--space-xs: 4px;
--space-sm: 12px;
--space-md: 24px;
--space-lg: 48px;
--space-xl: 80px;
```

### 1.4 圆角系统

```css
--radius-sm: 4px;      /* 输入框 */
--radius-md: 8px;      /* 按钮 */
--radius-lg: 24px;     /* 卡片 */
--radius-pill: 100px;  /* 胶囊按钮/标签 */
```

### 1.5 动效曲线

```css
--ease: cubic-bezier(0.2, 0.0, 0.2, 1);
```

---

## 二、布局规范

### 2.1 三栏布局 (可拖拽/可折叠)

```
+------+----------+---||---+------------------+---||---+----------+
| Icon | Sidebar  |Resizer |   Main Content   |Resizer |  Panel   |
| Bar  | Content  |        |                  |        |          |
| 48px | 180-400px|  8px   |     flex-1       |  8px   | 240-480px|
+------+----------+---||---+------------------+---||---+----------+
        ^ 可折叠              ^ 可拖拽                 ^ 可拖拽/可折叠
```

### 2.2 关键布局参数


| 元素              | 宽度                   | 约束            |
| --------------- | -------------------- | ------------- |
| Icon Bar        | 48px                 | 固定，始终可见       |
| Sidebar Content | 240px (默认)           | 180-400px，可折叠 |
| Main Content    | flex-1               | 最小 400px      |
| Context Panel   | 280px (默认)           | 240-480px，可折叠 |
| Resizer         | 8px (可点击) / 1px (可见) | 拖拽调节          |


### 2.3 Icon Bar 图标项


| ID       | 图标    | Label (Tooltip) | 功能            |
| -------- | ----- | --------------- | ------------- |
| toggle   | 侧边栏图标 | Toggle Sidebar  | 折叠/展开 Sidebar |
| projects | 文件夹   | Projects        | 项目列表          |
| search   | 搜索    | Search          | 全局搜索          |
| ai       | 机器人   | AI Assistant    | AI 面板         |
| history  | 时钟    | Version History | 版本历史          |
| settings | 齿轮    | Settings        | 设置 (底部)       |


---

## 三、组件设计规范

### 3.1 品牌标识

```
WRITE + NOW (浅色部分)
字号: 18px, 字重: 600 + 300
```

### 3.2 导航项

- 默认: `color: #888888`
- 悬停/激活: `color: #ffffff`
- `+` 指示器: 绝对定位左侧，悬停时滑入

### 3.3 按钮


| 类型        | 背景          | 边框      | 圆角           |
| --------- | ----------- | ------- | ------------ |
| Primary   | #ffffff     | -       | 100px (pill) |
| Secondary | transparent | #222222 | 100px        |
| Ghost     | transparent | -       | -            |
| Icon      | transparent | -       | 8px          |


### 3.4 卡片

- 背景: `#0f0f0f` 或 `transparent`
- 边框: `1px solid #222222`
- 圆角: `24px`
- 悬停: 边框变为 `#444444`

### 3.5 输入框

- 背景: `#0f0f0f`
- 边框: `1px solid #222222`
- Focus: 边框变为 `#888888`
- 圆角: `4px`

### 3.6 AI 聊天面板

- 宽度: 360px
- 用户消息: 背景 `#080808` + 边框
- AI 消息: 无背景，直接文字
- 代码块: 背景 `#1a1a1a` + 边框 + 操作按钮

---

## 四、页面实现清单

### 4.1 设计稿已覆盖 (直接对照实现)


| 页面               | 设计稿文件                          | 优先级 |
| ---------------- | ------------------------------ | --- |
| Login            | `design-255901f0`              | P0  |
| Dashboard        | `design-a2aabb70` (带 AI Panel) | P0  |
| Editor           | `design-a565d21b`              | P0  |
| Settings Modal   | `design-5d03b9cc`              | P1  |
| Dashboard (无 AI) | `design-d383ab30`              | P1  |


### 4.2 需要 Agent 推导 (按设计系统一致性实现)


| 页面/组件                 | 推导基准                 | 优先级 |
| --------------------- | -------------------- | --- |
| Register              | 参照 Login 风格          | P1  |
| Forgot Password       | 参照 Login 风格          | P2  |
| Command Palette       | 深色浮层 + 搜索框           | P1  |
| Export Dialog         | 参照 Settings Modal 风格 | P2  |
| Version History Panel | 参照 Context Panel 风格  | P1  |
| File Tree             | 参照 Sidebar 导航风格      | P0  |
| Toast/Notification    | 深色背景 + 边框            | P1  |
| Skills Panel          | 参照 AI Panel 风格       | P1  |
| Memory Panel          | 参照 Context Panel 风格  | P2  |


---

## 五、技术实现方案

### 5.1 技术栈


| 类别     | 选型                           | 版本         |
| ------ | ---------------------------- | ---------- |
| 框架     | React                        | 18.x       |
| 语言     | TypeScript                   | 5.x (严格模式) |
| 构建     | Vite                         | 6.x        |
| 样式     | Tailwind CSS + CSS Variables | 4.x        |
| 组件原语   | Radix UI                     | latest     |
| 富文本编辑器 | TipTap                       | 2.x        |
| 路由     | React Router                 | 6.x        |
| 状态管理   | Zustand                      | 4.x        |


### 5.2 项目结构

```
writenow-ui/
src/
  styles/
    tokens.css              # Design Tokens
    fonts.css               # @font-face 声明
    globals.css             # 全局样式
  components/
    primitives/             # 原子组件 (无业务逻辑)
      Button/
      Input/
      Card/
      ...
    patterns/               # 通用交互模式 (可跨模块复用)
      EmptyState/
      LoadingState/
      ErrorState/
      CodeBlock/
    layout/                 # 布局组件 (页面骨架)
      AppShell/
      IconBar/
      Sidebar/
      Panel/
      Resizer/
  features/                 # 功能模块 (业务组件内聚)
    auth/
      components/           # 模块私有组件
      LoginPage.tsx
    dashboard/
      components/
        ProjectCard.tsx     # 业务组件在模块内部
        HeroCard.tsx
      DashboardPage.tsx
    editor/
    ai-panel/
      components/
        MessageBubble.tsx   # 业务组件在模块内部
      AIPanel.tsx
    settings/
  stores/                   # Zustand stores
  pages/                    # 页面入口
  lib/                      # 工具函数
```

---

## 六、实施路线 (细化)

### Phase 0: 项目初始化 (P0-01 ~ P0-06)


| 任务    | 内容                    | 产出                                   |
| ----- | --------------------- | ------------------------------------ |
| P0-01 | 创建项目，初始化 package.json | writenow-ui/ 目录                      |
| P0-02 | 安装配置 Tailwind CSS 4   | tailwind.config.ts                   |
| P0-03 | 创建 tokens.css         | src/styles/tokens.css                |
| P0-04 | 配置 Web 字体             | src/styles/fonts.css + public/fonts/ |
| P0-05 | 创建 globals.css        | src/styles/globals.css               |
| P0-06 | 配置 TypeScript         | tsconfig.json (严格模式)                 |


### Phase 1A: 原子组件 primitives/ (P1A-01 ~ P1A-15)


| 任务     | 组件       | Props/状态                                                              |
| ------ | -------- | --------------------------------------------------------------------- |
| P1A-01 | Button   | variant(primary/secondary/ghost/icon/danger), size, disabled, loading |
| P1A-02 | Input    | type(text/password/search), icon, error, disabled                     |
| P1A-03 | Textarea | autoHeight, maxLength, showCount                                      |
| P1A-04 | Card     | variant(default/hover/active), onClick                                |
| P1A-05 | Badge    | variant(default/success/warning/error)                                |
| P1A-06 | Divider  | orientation(h/v), label                                               |
| P1A-07 | Switch   | checked, onChange, disabled                                           |
| P1A-08 | Checkbox | checked, onChange, indeterminate, disabled                            |
| P1A-09 | Tooltip  | content, side, delayDuration                                          |
| P1A-10 | Avatar   | src, fallback, size                                                   |
| P1A-11 | Spinner  | size(sm/md/lg)                                                        |
| P1A-12 | Select   | options, value, placeholder, disabled, error                          |
| P1A-13 | Popover  | trigger, content, side, align                                         |
| P1A-14 | Dialog   | open, onOpenChange, title, description, footer                        |
| P1A-15 | Toast    | variant(default/success/error/warning), duration                      |


### Phase 1B: 交互模式 patterns/ (P1B-01 ~ P1B-05)


| 任务     | 组件            | 功能                           |
| ------ | ------------- | ---------------------------- |
| P1B-01 | EmptyState    | 图标 + 标题 + 描述 + 操作按钮          |
| P1B-02 | LoadingState  | 骨架屏 (shimmer) / Spinner 两种模式 |
| P1B-03 | ErrorState    | 图标 + 错误信息 + 重试按钮             |
| P1B-04 | ConfirmDialog | 标题 + 描述 + 取消/确认按钮            |
| P1B-05 | CodeBlock     | 语法高亮 + 复制按钮 + 语言标签           |


### Phase 2: 布局组件 (P2-01 ~ P2-07)


| 任务    | 组件             | 功能                   |
| ----- | -------------- | -------------------- |
| P2-01 | IconBar        | 48px 图标导航，Tooltip 悬浮 |
| P2-02 | Resizer        | 可拖拽分割线，min/max 限制    |
| P2-03 | SidebarContent | 可折叠内容区，Section/Item  |
| P2-04 | Panel          | 右侧面板，可折叠             |
| P2-05 | Toolbar        | 60px/80px 高度         |
| P2-06 | AppShell       | 整合所有布局组件             |
| P2-07 | layoutStore    | 管理宽度/折叠状态            |


### Phase 3: 核心页面 (P3-01 ~ P3-16)


| 任务    | 内容                 | 依赖                     |
| ----- | ------------------ | ---------------------- |
| P3-01 | 配置路由               | React Router           |
| P3-02 | authStore          | 本地单用户模式                |
| P3-03 | LoginForm          | Input, Button          |
| P3-04 | OAuthButtons       | Button                 |
| P3-05 | Login 页面           | P3-03, P3-04           |
| P3-06 | projectStore       | 对接 project:* IPC       |
| P3-07 | ProjectCard        | Card, Badge            |
| P3-08 | HeroCard           | Card                   |
| P3-09 | Dashboard Grid     | ProjectCard            |
| P3-10 | Dashboard Sidebar  | SidebarContent         |
| P3-11 | Dashboard 页面       | AppShell, P3-09, P3-10 |
| P3-12 | editorStore        | 文档状态管理                 |
| P3-13 | EditorToolbar      | Toolbar                |
| P3-14 | TipTap 集成          | Design Tokens 样式       |
| P3-15 | EditorDetailsPanel | Panel                  |
| P3-16 | Editor 页面          | AppShell, TipTap       |


### Phase 4: AI 面板 (P4-01 ~ P4-07)


| 任务    | 组件            | 功能                  |
| ----- | ------------- | ------------------- |
| P4-01 | aiStore       | 对接 ai:skill:run IPC |
| P4-02 | MessageBubble | User/Assistant 样式   |
| P4-03 | CodeBlock     | 语法高亮，复制/应用          |
| P4-04 | AIInput       | 多行输入，发送             |
| P4-05 | AIHeader      | 模型/角色选择             |
| P4-06 | AIPanel       | 360px 宽度面板          |
| P4-07 | 集成到 Editor    | 右侧 Panel            |


### Phase 5-8: 后续功能

详见 TODO 列表 (P5-01 ~ P8-05)

### Phase 9: 后端对齐

详见 TODO 列表 (P9-01 ~ P9-07) 及 [DESIGN_SPEC.md 第九部分](/home/leeky/work/WriteNow/Variant/DESIGN_SPEC.md)

---

## 七、前后端对齐概要

详细分析见 [DESIGN_SPEC.md 第九部分](/home/leeky/work/WriteNow/Variant/DESIGN_SPEC.md)

### 后端现有能力 (95 个 IPC 通道)

- file:* (文件操作)
- project:* (项目管理)
- character:* (角色管理)
- outline:* (大纲)
- kg:* (知识图谱)
- memory:* (用户记忆)
- skill:* (技能)
- ai:* (AI 功能)
- search:* (搜索)
- version:* (版本)
- export:* (导出)
- stats:* (统计)
- localLlm:* (本地 LLM)

### 前端设计需要但后端缺失


| 模块                         | 状态   | 优先级     |
| -------------------------- | ---- | ------- |
| 用户认证 (auth:*)              | 完全缺失 | P0 (后续) |
| 用户账户 (user:*)              | 完全缺失 | P1 (后续) |
| 项目状态扩展                     | 缺失   | P1      |
| 封面图上传 (upload:*)           | 缺失   | P1      |
| Collections (collection:*) | 缺失   | P1      |
| 分享功能 (share:*)             | 完全缺失 | P2      |
| 设置 Schema 标准化              | 部分   | P1      |
| 统计扩展 (目标/活动)               | 部分   | P1      |


### 临时方案

在后端认证系统完成前，前端采用本地单用户模式:

- 跳过登录验证，直接进入 Dashboard
- 使用 localStorage 存储设置
- 预留 API 对接接口

---

## 八、视觉一致性检查清单

实现时必须逐项核对：

### 颜色

- 背景: #080808 / #0f0f0f / #1a1a1a
- 边框: #222222 (默认) / #444444 (hover)
- 文字: #ffffff / #888888 / #444444
- 禁止使用任何其他颜色

### 尺寸

- Icon Bar: 48px
- Sidebar: 180-400px (默认 240px)
- Panel: 240-480px (默认 280px / AI 360px)
- Toolbar: 60px 或 80px
- Resizer 可点击区域: 8px

### 圆角

- 卡片: 24px
- 按钮 (pill): 100px
- 按钮 (icon): 8px
- 输入框: 4px
- Tooltip: 6px

### 字体

- UI: Inter
- 正文: Lora
- 代码: JetBrains Mono
- 权重: 300/400/500/600

### 动效

- 曲线: cubic-bezier(0.2, 0.0, 0.2, 1)
- 时长: 150ms / 200ms / 300ms
- Tooltip 延迟: 300ms

### 交互

- Resizer hover 颜色变化
- Resizer 拖拽时颜色变化
- Sidebar 折叠/展开动画
- Panel 折叠/展开动画
- Icon Bar 图标 active 指示器

