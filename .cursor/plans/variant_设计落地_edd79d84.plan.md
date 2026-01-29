---
name: Variant 设计落地
overview: 废弃现有 writenow-frontend 代码，基于 Variant 深色极简设计重新实现 WriteNow 前端。设计稿未覆盖的页面由 Agent 按已有风格推导，保持视觉一致性。
spec_authority: Variant/DESIGN_SPEC.md
todos:
  - id: p0-init-project
    content: "P0-01: 创建 writenow-ui 项目目录，初始化 package.json | 规范: DESIGN_SPEC.md 1.2 技术栈"
    status: pending
  - id: p0-tailwind
    content: "P0-02: 安装配置 Tailwind CSS 4 | 规范: DESIGN_SPEC.md 1.2 技术栈"
    status: pending
  - id: p0-tokens-css
    content: "P0-03: 创建 tokens.css (所有 CSS Variables) | 规范: DESIGN_SPEC.md 2.1 tokens.css (完整复制)"
    status: pending
  - id: p0-fonts
    content: "P0-04: 配置 Web 字体 (Inter/Lora/JetBrains Mono) | 规范: DESIGN_SPEC.md 2.1 字体系统"
    status: pending
  - id: p0-globals
    content: "P0-05: 创建 globals.css | 规范: DESIGN_SPEC.md 2.1 全局重置"
    status: pending
  - id: p0-tsconfig
    content: "P0-06: 配置 tsconfig.json 严格模式 | 规范: DESIGN_SPEC.md 1.3 项目目录结构"
    status: pending
  - id: p1a-button
    content: "P1A-01: primitives/Button | 规范: DESIGN_SPEC.md 3.1 Button (Props + 像素规范 + 代码)"
    status: pending
  - id: p1a-input
    content: "P1A-02: primitives/Input | 规范: DESIGN_SPEC.md 3.2 Input (Props + 像素规范)"
    status: pending
  - id: p1a-textarea
    content: "P1A-03: primitives/Textarea | 规范: DESIGN_SPEC.md 3.8 Textarea (Props + 像素规范)"
    status: pending
  - id: p1a-card
    content: "P1A-04: primitives/Card | 规范: DESIGN_SPEC.md 3.3 Card (Props + 像素规范)"
    status: pending
  - id: p1a-badge
    content: "P1A-05: primitives/Badge | 规范: DESIGN_SPEC.md 3.4 Badge (Props + 变体颜色)"
    status: pending
  - id: p1a-divider
    content: "P1A-06: primitives/Divider | 规范: DESIGN_SPEC.md 3.7 Divider (Props + 像素规范)"
    status: pending
  - id: p1a-switch
    content: "P1A-07: primitives/Switch | 规范: DESIGN_SPEC.md 3.5 Switch (Props + 像素规范)"
    status: pending
  - id: p1a-checkbox
    content: "P1A-08: primitives/Checkbox | 规范: DESIGN_SPEC.md 3.6 Checkbox (Props + 像素规范)"
    status: pending
  - id: p1a-tooltip
    content: "P1A-09: primitives/Tooltip | 规范: DESIGN_SPEC.md 3.10 Tooltip (Props + 像素规范)"
    status: pending
  - id: p1a-avatar
    content: "P1A-10: primitives/Avatar | 规范: DESIGN_SPEC.md 3.9 Avatar (Props + 像素规范)"
    status: pending
  - id: p1a-spinner
    content: "P1A-11: primitives/Spinner | 规范: DESIGN_SPEC.md 3.14 Spinner (Props + 像素规范)"
    status: pending
  - id: p1a-select
    content: "P1A-12: primitives/Select | 规范: DESIGN_SPEC.md 3.15 Select (Props + 像素规范)"
    status: pending
  - id: p1a-popover
    content: "P1A-13: primitives/Popover | 规范: DESIGN_SPEC.md 3.11 Popover (Props + 像素规范)"
    status: pending
  - id: p1a-dialog
    content: "P1A-14: primitives/Dialog | 规范: DESIGN_SPEC.md 3.12 Dialog (Props + 像素规范)"
    status: pending
  - id: p1a-toast
    content: "P1A-15: primitives/Toast | 规范: DESIGN_SPEC.md 3.13 Toast (Props + 像素规范)"
    status: pending
  - id: p1b-empty-state
    content: "P1B-01: patterns/EmptyState | 规范: DESIGN_SPEC.md 5.1 EmptyState (Props + 像素规范 + 代码)"
    status: pending
  - id: p1b-loading-state
    content: "P1B-02: patterns/LoadingState | 规范: DESIGN_SPEC.md 5.2 LoadingState (Props + Skeleton + 代码)"
    status: pending
  - id: p1b-error-state
    content: "P1B-03: patterns/ErrorState | 规范: DESIGN_SPEC.md 5.3 ErrorState (Props + 像素规范 + 代码)"
    status: pending
  - id: p1b-confirm-dialog
    content: "P1B-04: patterns/ConfirmDialog | 规范: DESIGN_SPEC.md 5.4 ConfirmDialog (Props + 代码)"
    status: pending
  - id: p1b-code-block
    content: "P1B-05: patterns/CodeBlock | 规范: DESIGN_SPEC.md 5.5 CodeBlock (Props + 像素规范 + 代码)"
    status: pending
  - id: p2-icon-bar
    content: "P2-01: layout/IconBar | 规范: DESIGN_SPEC.md 4.2 Icon Bar (Props + 像素规范 + 代码)"
    status: pending
  - id: p2-resizer
    content: "P2-02: layout/Resizer | 规范: DESIGN_SPEC.md 4.6 Resizer (Props + 像素规范 + 代码)"
    status: pending
  - id: p2-sidebar-content
    content: "P2-03: layout/SidebarContent | 规范: DESIGN_SPEC.md 4.3 Sidebar Content (Props + 代码)"
    status: pending
  - id: p2-panel
    content: "P2-04: layout/Panel | 规范: DESIGN_SPEC.md 4.5 Panel (Props + 像素规范)"
    status: pending
  - id: p2-toolbar
    content: "P2-05: layout/Toolbar | 规范: DESIGN_SPEC.md 4.4 Toolbar (Props + 像素规范)"
    status: pending
  - id: p2-app-shell
    content: "P2-06: layout/AppShell | 规范: DESIGN_SPEC.md 4.1 AppShell (布局结构 + Props + 代码)"
    status: pending
  - id: p2-layout-store
    content: "P2-07: stores/layoutStore | 规范: DESIGN_SPEC.md 4.1 AppShell (状态管理)"
    status: pending
  - id: p3-router
    content: "P3-01: 配置 React Router | 规范: DESIGN_SPEC.md 1.3 项目目录结构 (pages/)"
    status: pending
  - id: p3-auth-store
    content: "P3-02: 创建 authStore (本地单用户模式) | 规范: DESIGN_SPEC.md 11.7 临时方案"
    status: pending
  - id: p3-login-form
    content: "P3-03: features/auth/LoginForm | 规范: DESIGN_SPEC.md 7.1 Login 页面 (像素规范)"
    status: pending
  - id: p3-login-oauth
    content: "P3-04: features/auth/OAuthButtons | 规范: DESIGN_SPEC.md 7.1 Login 页面"
    status: pending
  - id: p3-login-page
    content: "P3-05: pages/Login | 规范: DESIGN_SPEC.md 7.1 + 设计稿 design-255901f0"
    status: pending
  - id: p3-project-store
    content: "P3-06: stores/projectStore | 规范: DESIGN_SPEC.md 11.1 后端现有能力 (project:*)"
    status: pending
  - id: p3-project-card
    content: "P3-07: features/dashboard/ProjectCard | 规范: DESIGN_SPEC.md 6.1 ProjectCard (像素规范)"
    status: pending
  - id: p3-hero-card
    content: "P3-08: features/dashboard/HeroCard | 规范: DESIGN_SPEC.md 6.2 HeroCard (像素规范)"
    status: pending
  - id: p3-dashboard-grid
    content: "P3-09: features/dashboard/Grid | 规范: DESIGN_SPEC.md 7.2 Dashboard 页面"
    status: pending
  - id: p3-dashboard-sidebar
    content: "P3-10: features/dashboard/Sidebar | 规范: DESIGN_SPEC.md 4.3 Sidebar Content"
    status: pending
  - id: p3-dashboard-page
    content: "P3-11: pages/Dashboard | 规范: DESIGN_SPEC.md 7.2 + 设计稿 design-a2aabb70"
    status: pending
  - id: p3-editor-store
    content: "P3-12: stores/editorStore | 规范: DESIGN_SPEC.md 8.1 核心用户流程 (编辑流程)"
    status: pending
  - id: p3-editor-toolbar
    content: "P3-13: features/editor/Toolbar | 规范: DESIGN_SPEC.md 4.4 Toolbar + 7.3 Editor"
    status: pending
  - id: p3-editor-tiptap
    content: "P3-14: TipTap 集成 | 规范: DESIGN_SPEC.md 7.3 Editor 页面 (正文样式规范)"
    status: pending
  - id: p3-editor-details
    content: "P3-15: features/editor/DetailsPanel | 规范: DESIGN_SPEC.md 4.5 Panel"
    status: pending
  - id: p3-editor-page
    content: "P3-16: pages/Editor | 规范: DESIGN_SPEC.md 7.3 + 设计稿 design-a565d21b"
    status: pending
  - id: p4-ai-store
    content: "P4-01: stores/aiStore | 规范: DESIGN_SPEC.md 11.1 后端现有能力 (ai:*)"
    status: pending
  - id: p4-message-bubble
    content: "P4-02: features/ai/MessageBubble | 规范: DESIGN_SPEC.md 6.3 MessageBubble (像素规范)"
    status: pending
  - id: p4-code-block
    content: "P4-03: features/ai/CodeBlock | 规范: DESIGN_SPEC.md 5.5 CodeBlock (完整参照)"
    status: pending
  - id: p4-ai-input
    content: "P4-04: features/ai/AIInput | 规范: DESIGN_SPEC.md 3.8 Textarea (基础) + AI 场景扩展"
    status: pending
  - id: p4-ai-header
    content: "P4-05: features/ai/AIHeader | 规范: DESIGN_SPEC.md 4.5 Panel (AI 变体 360px)"
    status: pending
  - id: p4-ai-panel
    content: "P4-06: features/ai/AIPanel | 规范: DESIGN_SPEC.md 4.5 Panel (AI 360px) + 8.1.7 AI 对话流程"
    status: pending
  - id: p4-ai-integration
    content: "P4-07: AI Panel 集成到 Editor | 规范: DESIGN_SPEC.md 4.1 AppShell (Panel 整合)"
    status: pending
  - id: p5-settings-store
    content: "P5-01: stores/settingsStore | 规范: DESIGN_SPEC.md 11.7 临时方案 (localStorage)"
    status: pending
  - id: p5-settings-nav
    content: "P5-02: features/settings/SettingsNav | 规范: DESIGN_SPEC.md 7.4 Settings Modal"
    status: pending
  - id: p5-settings-section
    content: "P5-03: features/settings/SettingsSection | 规范: DESIGN_SPEC.md 7.4 Settings Modal"
    status: pending
  - id: p5-settings-writing
    content: "P5-04: features/settings/WritingSettings | 规范: DESIGN_SPEC.md 7.4 + 8.1.3 设置流程"
    status: pending
  - id: p5-settings-data
    content: "P5-05: features/settings/DataSettings | 规范: DESIGN_SPEC.md 7.4 Settings Modal"
    status: pending
  - id: p5-settings-appearance
    content: "P5-06: features/settings/AppearanceSettings | 规范: DESIGN_SPEC.md 7.4 Settings Modal"
    status: pending
  - id: p5-settings-modal
    content: "P5-07: features/settings/SettingsModal | 规范: DESIGN_SPEC.md 7.4 + 设计稿 design-5d03b9cc"
    status: pending
  - id: p6-file-store
    content: "P6-01: stores/fileStore | 规范: DESIGN_SPEC.md 11.1 后端现有能力 (file:*)"
    status: pending
  - id: p6-file-tree-item
    content: "P6-02: features/files/FileTreeItem | 规范: DESIGN_SPEC.md 4.3 Sidebar + 8.1.6 文件管理流程"
    status: pending
  - id: p6-file-tree
    content: "P6-03: features/files/FileTree | 规范: DESIGN_SPEC.md 4.3 Sidebar (递归渲染)"
    status: pending
  - id: p6-file-tree-integration
    content: "P6-04: FileTree 集成到 Sidebar | 规范: DESIGN_SPEC.md 4.1 AppShell"
    status: pending
  - id: p7-command-store
    content: "P7-01: stores/commandStore | 规范: DESIGN_SPEC.md 8.1.4 搜索流程"
    status: pending
  - id: p7-command-palette
    content: "P7-02: features/command/CommandPalette | 规范: DESIGN_SPEC.md 8.1.4 + 8.3 键盘导航"
    status: pending
  - id: p7-version-store
    content: "P7-03: stores/versionStore | 规范: DESIGN_SPEC.md 11.1 后端现有能力 (version:*)"
    status: pending
  - id: p7-version-item
    content: "P7-04: features/version/VersionItem | 规范: DESIGN_SPEC.md 8.1.5 版本历史流程"
    status: pending
  - id: p7-version-panel
    content: "P7-05: features/version/VersionHistoryPanel | 规范: DESIGN_SPEC.md 4.5 Panel + 8.1.5"
    status: pending
  - id: p7-export-dialog
    content: "P7-06: features/export/ExportDialog | 规范: DESIGN_SPEC.md 3.12 Dialog (基础) + 9. 推导规则"
    status: pending
  - id: p7-toast
    content: "P7-07: patterns/Toast 集成 | 规范: DESIGN_SPEC.md 3.13 Toast (已有规范)"
    status: pending
  - id: p8-register-page
    content: "P8-01: pages/Register | 规范: DESIGN_SPEC.md 9. Agent 推导规则 (参照 Login)"
    status: pending
  - id: p8-forgot-password
    content: "P8-02: pages/ForgotPassword | 规范: DESIGN_SPEC.md 9. Agent 推导规则 (参照 Login)"
    status: pending
  - id: p8-skills-panel
    content: "P8-03: features/ai/SkillsPanel | 规范: DESIGN_SPEC.md 9. 推导规则 (参照 AI Panel)"
    status: pending
  - id: p8-memory-panel
    content: "P8-04: features/ai/MemoryPanel | 规范: DESIGN_SPEC.md 9. 推导规则 (参照 Context Panel)"
    status: pending
  - id: p8-search-panel
    content: "P8-05: features/search/SearchPanel | 规范: DESIGN_SPEC.md 8.1.4 搜索流程"
    status: pending
  - id: p9-project-extend
    content: "P9-01: 扩展 Project 模型 | 规范: DESIGN_SPEC.md 11.3 数据模型扩展需求"
    status: pending
  - id: p9-collection-api
    content: "P9-02: Collection CRUD API | 规范: DESIGN_SPEC.md 11.6 API 契约新增清单"
    status: pending
  - id: p9-settings-api
    content: "P9-03: Settings API 标准化 | 规范: DESIGN_SPEC.md 11.6 API 契约新增清单"
    status: pending
  - id: p9-stats-extend
    content: "P9-04: Stats API 扩展 | 规范: DESIGN_SPEC.md 11.2.5 统计功能扩展"
    status: pending
  - id: p9-upload-api
    content: "P9-05: 图片上传 API | 规范: DESIGN_SPEC.md 11.6 API 契约新增清单"
    status: pending
  - id: p9-auth-api
    content: "P9-06: 认证 API (后续迭代) | 规范: DESIGN_SPEC.md 11.2.1 用户认证系统"
    status: pending
  - id: p9-share-api
    content: "P9-07: 分享 API (后续迭代) | 规范: DESIGN_SPEC.md 11.2.4 分享功能"
    status: pending
isProject: false
---

# Variant 设计落地 - WriteNow 前端重新实现

> 详细设计规范文档: [Variant/DESIGN_SPEC.md](/home/leeky/work/WriteNow/Variant/DESIGN_SPEC.md)

---

## 零、设计规范约束（宪法级，必须遵守）

### SSOT（唯一权威规范）

| 类型 | 路径 | 说明 |
|------|------|------|
| **设计规范** | `Variant/DESIGN_SPEC.md` | 唯一权威，禁止偏离 |
| **设计稿** | `Variant/designs/*.html` | 11 个高保真设计稿 |

### 必读前置

**执行任何组件/页面任务前，必须先阅读：**

1. `Variant/DESIGN_SPEC.md` **第二部分：Design Tokens 完整规范** (tokens.css)
2. `Variant/DESIGN_SPEC.md` **对应组件章节** (Props + 像素规范 + 代码示例)
3. 如有对应设计稿，必须同时参照 `Variant/designs/` 下的 HTML 文件

### 禁止事项（硬禁）

| 禁止行为 | 原因 |
|----------|------|
| 自定义颜色值 | 必须使用 `var(--color-*)` CSS 变量 |
| 自定义间距值 | 必须使用 `var(--spacing-*)` 或规范中的标准值 |
| 自定义圆角值 | 只允许 4px/6px/8px/16px/24px/100px |
| 自定义字体 | 只允许 Inter/Lora/JetBrains Mono |
| 自定义动效曲线 | 只允许 `cubic-bezier(0.2, 0.0, 0.2, 1)` |
| "看起来差不多" | 必须像素级还原规范 |
| 随意添加 hover 效果 | 必须按规范定义的状态实现 |
| 跳过规范直接编码 | 必须先读规范再写代码 |

### 验收标准模板

每个组件/页面验收必须满足：

```markdown
## 验收检查清单

### Props 对齐
- [ ] Props 接口与 DESIGN_SPEC.md 一致
- [ ] 所有 Props 都有正确的 TypeScript 类型

### 视觉还原
- [ ] 所有颜色使用 CSS Variables (禁止硬编码)
- [ ] 像素规范完全还原 (字号/间距/圆角/尺寸)
- [ ] 与设计稿对比无偏差

### 交互状态
- [ ] default 状态正确
- [ ] hover 状态正确
- [ ] focus 状态正确 (如适用)
- [ ] active 状态正确 (如适用)
- [ ] disabled 状态正确 (如适用)

### 代码质量
- [ ] 无 any 类型
- [ ] 无 ESLint 错误
- [ ] 组件可独立使用
```

### 图标系统约束

| 约束 | 要求 |
|------|------|
| 图标库 | 只允许 Lucide React |
| 图标尺寸 | 14px/16px/20px/48px |
| 图标颜色 | 使用 `currentColor` 继承 |

详见 `DESIGN_SPEC.md 3.16 图标系统`

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

