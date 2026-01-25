# Sprint：Frontend V2（独立前端重构）

## 元信息

| 字段 | 值 |
|------|-----|
| 规范名称 | sprint-frontend-v2 |
| 状态 | Draft |
| 创建时间 | 2026-01-25 |
| 上游依赖 | writenow-spec/spec.md |
| 目标 | 脱离 Theia 前端，构建独立的高质量 React 前端 |

---

## 技术栈锁定（必读 · 禁止替换）

> **警告**：以下技术选型已经过评估并锁定，**执行任务时禁止替换为其他方案**。如需变更，必须先提交 RFC 并获得批准。

### 必读设计文档

执行任何工程任务前，**必须先阅读以下设计文档**：

| 文档 | 路径 | 说明 |
|------|------|------|
| 系统概览 | `design/00-overview.md` | 目录结构、架构图 |
| 设计令牌 | `design/01-design-tokens.md` | 颜色、间距、字体规范 |
| **技术选型** | `design/02-tech-stack.md` | **核心选型，禁止替换** |
| 布局系统 | `design/03-layout-system.md` | FlexLayout 配置 |
| RPC 客户端 | `design/04-rpc-client.md` | 后端通信 |
| Electron 集成 | `design/05-electron-integration.md` | 桌面打包 |

### 锁定的核心技术（禁止替换）

| 类别 | 锁定选型 | 禁止替换为 |
|------|---------|-----------|
| 构建工具 | **Vite 6.x** | Webpack, Parcel, Rollup |
| UI 框架 | **React 18.x** | Vue, Svelte, Solid |
| 类型系统 | **TypeScript 5.x（严格模式）** | JavaScript, Flow |
| 样式方案 | **Tailwind CSS 4.x** | CSS Modules, Styled Components, Emotion |
| 基础组件 | **shadcn/ui + Radix UI** | Ant Design, MUI, Chakra |
| 编辑器 | **TipTap** | Monaco, Quill, Slate, ProseMirror 直接使用 |
| 文件树 | **react-arborist** | rc-tree, react-treeview |
| 布局系统 | **FlexLayout** | react-grid-layout, rc-dock |
| 命令面板 | **cmdk** | kbar, react-command-palette |
| 通知 | **sonner** | react-toastify, notistack |
| 动画 | **Framer Motion** | react-spring, GSAP |
| 全局状态 | **Zustand** | Redux, MobX, Jotai, Recoil |
| 服务端状态 | **TanStack Query** | SWR, Apollo Client |
| 桌面容器 | **Electron 34.x + electron-vite** | Tauri, NW.js |

### 违规处理

- 任何未经批准的技术替换视为**任务失败**
- Agent 必须在执行前确认使用锁定的技术栈
- 发现替换行为，代码不予合并

---

## Purpose

本 Sprint 的目标是：**脱离 Theia 前端框架，构建一个独立的、高质量的 Vite + React + Tailwind 前端**，达到 Cursor/Linear 级别的视觉和交互质量，同时保留 Theia 后端服务。

### 背景与动机

当前基于 Theia 的前端存在以下问题：

| 问题 | 说明 |
|------|------|
| **Theia 前端无法高度定制** | CSS 特异性战争、样式污染、布局系统不可控 |
| **UI 达不到产品级水准** | 无法实现 Cursor/Linear 级别的精美设计 |
| **开发效率低** | 每次样式调整都要与 Theia 默认样式对抗 |
| **学习曲线陡峭** | Widget/Contribution Point 体系复杂 |

### 决策

| 决策项 | 决定 | 理由 |
|--------|------|------|
| Theia 后端 | **保留** | 后端服务已完善，无需重写 |
| Theia 前端 | **弃用** | 无法满足设计要求 |
| 新前端技术栈 | **Vite + React + Tailwind** | 现代、快速、完全可控 |

本规范是 `openspec/specs/writenow-spec/spec.md` 在"前端重构"范围内的可执行增量（Spec-first），并以本仓库治理规范 `AGENTS.md` 作为交付硬约束。

---

## Requirements

### Requirement: MUST 使用 Vite + React + TypeScript 创建独立前端项目

团队 MUST 创建一个独立的前端项目 `writenow-frontend/`，使用 Vite 6.x + React 18.x + TypeScript 5.x 技术栈，确保与现有 Theia 后端通过 WebSocket JSON-RPC 通信。

#### Scenario: 前端项目初始化

- **WHEN** 团队创建 `writenow-frontend/` 项目
- **THEN** 必须包含 Vite 6.x、React 18.x、TypeScript 5.x（严格模式）、Tailwind CSS 4.x，并能独立启动开发服务器

#### Scenario: 与 Theia 后端通信

- **WHEN** 前端调用后端 API
- **THEN** 必须通过 WebSocket JSON-RPC 2.0 协议与 Theia 后端通信，复用现有 IPC 契约（`src/types/ipc-generated.ts`）

#### Scenario: 类型安全调用

- **WHEN** 前端发起 RPC 调用
- **THEN** 必须使用类型安全的 `invoke<T>(channel, payload)` 函数，payload 和 response 类型由 IPC 契约自动推导

---

### Requirement: MUST 建立完整的设计系统（Design Tokens + 主题）

团队 MUST 创建一套完整的设计系统，包括 Design Tokens（色彩/间距/圆角/字体/动效）、语义变量、多主题支持，确保所有组件风格一致且可主题切换。

#### Scenario: Design Tokens 定义

- **WHEN** 团队定义设计系统
- **THEN** 必须在 `styles/tokens.css` 中定义完整的 CSS 变量（基础色板、语义色、间距、圆角、字体、动效时长），符合 Cursor/Linear 风格

#### Scenario: 深色主题默认

- **WHEN** 用户首次启动应用
- **THEN** 必须默认使用 Midnight 深色主题（Cursor 风格深黑），并支持切换到 Dark/Light/High Contrast 主题

#### Scenario: 组件遵循 Token

- **WHEN** 开发任何 UI 组件
- **THEN** 必须使用语义变量（如 `--bg-panel`、`--text-primary`）而非硬编码颜色值，禁止内联样式

---

### Requirement: MUST 集成 shadcn/ui + Radix UI 作为基础组件库

团队 MUST 使用 shadcn/ui（基于 Radix UI）作为基础组件库，采用"复制粘贴"架构确保完全可控，并按需定制以符合设计系统。

#### Scenario: 基础组件集成

- **WHEN** 团队集成 shadcn/ui
- **THEN** 必须包含 Button、Input、Card、Dialog、Dropdown、Tabs、Tooltip 等基础组件，并调整为符合 Design Tokens 的样式

#### Scenario: 无障碍支持

- **WHEN** 用户使用键盘或辅助技术
- **THEN** 所有组件必须具备完整的键盘导航、焦点管理、ARIA 标签（继承自 Radix UI）

---

### Requirement: MUST 实现 IDE 级别的可拖拽布局系统

团队 MUST 使用 FlexLayout 实现 IDE 级别的布局系统，支持面板拖拽、调整大小、最大化/最小化、Tab 分组，并实现布局状态持久化。

#### Scenario: 基础布局结构

- **WHEN** 应用启动
- **THEN** 必须展示四区布局：左侧文件树、中间编辑器区域（支持多标签/分屏）、右侧 AI 面板、底部可选面板（版本历史/终端/日志）

#### Scenario: 面板交互

- **WHEN** 用户拖拽面板边缘或标题栏
- **THEN** 必须支持调整大小、拖拽重排、最大化/最小化，过渡动画流畅

#### Scenario: 布局持久化

- **WHEN** 用户修改布局后刷新或重启
- **THEN** 必须恢复到上次的布局状态（面板位置、大小、展开/折叠状态）

---

### Requirement: MUST 实现高性能文件树（react-arborist）

团队 MUST 使用 react-arborist 实现文件树组件，支持虚拟化渲染（万级文件）、拖拽排序、右键菜单、内联重命名、文件类型图标。

#### Scenario: 虚拟化渲染

- **WHEN** 项目包含大量文件（>1000 个）
- **THEN** 文件树必须使用虚拟化渲染，滚动流畅无卡顿

#### Scenario: 文件操作

- **WHEN** 用户右键点击文件/文件夹
- **THEN** 必须显示上下文菜单（新建/重命名/删除/复制路径等），操作即时生效

#### Scenario: 内联重命名

- **WHEN** 用户双击或按 F2 重命名
- **THEN** 必须在原位置显示输入框，Enter 确认、Esc 取消

---

### Requirement: MUST 实现双模式编辑器（富文本 + Markdown）

团队 MUST 实现面向**创作者**的双模式编辑器，默认提供类似 Word 的富文本体验，同时支持 Markdown 模式供熟悉语法的用户使用。编辑器必须让不懂 Markdown 的普通用户也能流畅写作。

#### Scenario: 富文本模式（默认）

- **WHEN** 用户打开文档
- **THEN** 默认进入富文本模式，提供可视化工具栏（加粗/斜体/标题/列表/链接/图片等），用户无需了解任何 Markdown 语法即可完成所有格式化操作

#### Scenario: Markdown 模式（可选）

- **WHEN** 用户切换到 Markdown 模式
- **THEN** 支持 Markdown 语法快捷输入（打 `#` 自动变标题，`**` 变粗体），同时保持所见即所得

#### Scenario: 双模式无缝切换

- **WHEN** 用户在富文本模式和 Markdown 模式之间切换
- **THEN** 文档内容和格式必须完全保持，底层数据一致，用户可在设置中配置默认模式

#### Scenario: 创作者友好的工具栏

- **WHEN** 用户选中文字或点击工具栏
- **THEN** 必须提供直观的格式化按钮（类似 Word/Notion），包括：字体样式、标题级别、列表、引用、链接、图片插入、表格等

#### Scenario: 多标签编辑

- **WHEN** 用户打开多个文件
- **THEN** 必须在编辑器区域显示 Tab 栏，支持切换、关闭、拖拽重排，显示 dirty 状态（未保存标记）

#### Scenario: 分屏视图

- **WHEN** 用户触发分屏操作
- **THEN** 必须支持水平/垂直分屏，每个分屏独立滚动和编辑

#### Scenario: 自动保存

- **WHEN** 文档被修改
- **THEN** 必须在 2 秒无操作后自动保存，保存失败必须可观测且可重试

---

### Requirement: MUST 支持多格式导出（Word/PDF/HTML）

团队 MUST 实现多格式导出功能，让创作者可以将作品导出为 Word (.docx)、PDF、HTML 等格式，满足投稿、打印、发布等不同场景需求。

#### Scenario: Word 导出

- **WHEN** 用户选择导出为 Word
- **THEN** 必须生成格式正确的 .docx 文件，保留标题、列表、加粗、斜体、链接、图片等格式

#### Scenario: PDF 导出

- **WHEN** 用户选择导出为 PDF
- **THEN** 必须生成可打印的 PDF 文件，支持自定义页面大小、页边距

#### Scenario: HTML 导出

- **WHEN** 用户选择导出为 HTML
- **THEN** 必须生成干净的 HTML 代码，可直接用于网页发布

#### Scenario: 剪贴板格式适配

- **WHEN** 用户复制内容到剪贴板
- **THEN** 必须同时提供纯文本和富文本格式，粘贴到微信公众号、知乎等平台时保持格式

---

### Requirement: MUST 重做 AI 面板 UI 并实现 Cursor 风格体验

团队 MUST 复用现有 AI 后端逻辑，完全重做 AI 面板 UI，实现 Cursor 风格的对话体验、流式输出、Diff 对比、斜杠命令、技能选择器。

#### Scenario: 对话体验

- **WHEN** 用户在 AI 面板输入消息
- **THEN** 必须显示对话历史、流式输出 AI 响应、支持随时取消（Esc 键）

#### Scenario: Diff 视图

- **WHEN** AI 生成修改建议
- **THEN** 必须显示 Diff 对比视图（红色删除、绿色新增），用户可一键接受/拒绝/部分接受

#### Scenario: 斜杠命令

- **WHEN** 用户输入 `/` 开头的命令
- **THEN** 必须显示命令补全菜单（/polish、/expand、/shorten 等 SKILL 列表）

#### Scenario: 内联 AI（Cmd+K）

- **WHEN** 用户在编辑器内按 Cmd+K
- **THEN** 必须在光标位置显示内联 AI 输入框，直接触发 AI 操作

---

### Requirement: MUST 实现 cmdk 命令面板

团队 MUST 使用 cmdk 实现全局命令面板，支持 Cmd+K 触发、模糊搜索、分类（文件/命令/SKILL）、最近使用记录、键盘导航。

#### Scenario: 命令面板触发

- **WHEN** 用户按 Cmd+K（或 Ctrl+K）
- **THEN** 必须显示命令面板，焦点自动进入搜索框

#### Scenario: 模糊搜索

- **WHEN** 用户输入搜索词
- **THEN** 必须实时过滤并高亮匹配的文件/命令/SKILL，按相关性排序

#### Scenario: 分类展示

- **WHEN** 命令面板显示结果
- **THEN** 必须分组展示（文件、命令、SKILL），每组有明确标题

---

### Requirement: MUST 实现设置面板与主题切换

团队 MUST 实现设置面板，支持分类设置项、搜索过滤、即时预览（主题切换等），并与后端同步配置。

#### Scenario: 设置面板访问

- **WHEN** 用户触发设置命令
- **THEN** 必须打开设置面板，分类展示设置项（通用/编辑器/AI/外观）

#### Scenario: 主题切换

- **WHEN** 用户在设置中切换主题
- **THEN** 必须即时预览效果，无需刷新

#### Scenario: 配置持久化

- **WHEN** 用户修改设置
- **THEN** 必须与后端同步保存，重启后配置保持

---

### Requirement: MUST 实现 Electron 集成与打包

团队 MUST 使用 electron-vite 实现 Electron 集成，主进程负责启动 Theia 后端、创建窗口、处理系统事件，并使用 electron-builder 打包三平台安装包。

#### Scenario: 主进程启动后端

- **WHEN** Electron 应用启动
- **THEN** 主进程必须自动启动 Theia 后端服务，等待其就绪后再加载前端

#### Scenario: 开发环境

- **WHEN** 开发者运行开发命令
- **THEN** 必须同时启动 Vite dev server 和 Electron，支持 HMR

#### Scenario: 生产打包

- **WHEN** 执行打包命令
- **THEN** 必须生成 Windows（NSIS）、macOS（DMG）、Linux（AppImage）安装包

---

### Requirement: MUST 达到 Cursor/Linear 级别的视觉和交互质量

团队 MUST 确保最终产品达到 Cursor/Linear 级别的视觉和交互质量，包括精美的动效、hover/focus 效果、响应式反馈、无障碍支持。

#### Scenario: 动效质量

- **WHEN** 用户触发过渡效果（面板展开/收起、页面切换）
- **THEN** 必须使用 Framer Motion 实现流畅、有意义的动画（时长 100-200ms，ease-out 曲线）

#### Scenario: 交互反馈

- **WHEN** 用户执行任何操作
- **THEN** 必须有即时视觉反馈（hover 变色、点击波纹、加载状态）

#### Scenario: 性能指标

- **WHEN** 测量应用性能
- **THEN** 首屏加载必须 < 2s，交互响应必须 < 100ms

---

## Phases（实施阶段）

### Phase 0：基础设施

| 任务 ID | 说明 | 产出 |
|---------|------|------|
| P0-001 | 创建 writenow-frontend 项目骨架 | Vite + React + TypeScript 项目 |
| P0-002 | 配置 Tailwind + Design Tokens | 样式系统就绪 |
| P0-003 | 集成 shadcn/ui 基础组件 | Button/Input/Card 等 |
| P0-004 | 实现 RPC 客户端 | 能连接 Theia 后端 |
| P0-005 | 验证端到端通路 | 调用 project:bootstrap 成功 |

**验收标准**：新前端能成功调用后端接口并显示项目信息。

### Phase 1：核心布局

| 任务 ID | 说明 | 产出 |
|---------|------|------|
| P1-001 | 集成 FlexLayout 布局系统 | 可拖拽面板布局 |
| P1-002 | 实现文件树（react-arborist） | 浏览/选择文件 |
| P1-003 | 实现 Status Bar | 字数统计、AI 状态 |
| P1-004 | 布局持久化 | 刷新后恢复布局 |

**验收标准**：可以浏览文件、调整布局、看到状态栏。

### Phase 2：编辑器

| 任务 ID | 说明 | 产出 |
|---------|------|------|
| P2-001 | 迁移 TipTap 编辑器组件 | 打开/编辑文件 |
| P2-002 | 实现多标签编辑 | Tab 切换 |
| P2-003 | 实现文件保存 | 自动保存 + 手动保存 |
| P2-004 | 实现浮动工具栏 | 格式化操作 |
| P2-005 | 实现富文本工具栏 | Word-like 工具栏体验 |
| P2-006 | 实现双模式切换 | 富文本 ↔ Markdown 切换 |
| P2-007 | 实现多格式导出 | Word/PDF/HTML 导出 |

**验收标准**：普通用户（不懂 Markdown）可以流畅地创作、编辑、导出文档。

### Phase 3：AI 面板

| 任务 ID | 说明 | 产出 |
|---------|------|------|
| P3-001 | 迁移 AI 面板逻辑 | 对话/流式输出 |
| P3-002 | 重做 AI 面板 UI | Cursor 风格 |
| P3-003 | 实现 Diff 视图 | 对比/应用修改 |
| P3-004 | 实现斜杠命令 | /polish, /expand 等 |

**验收标准**：可以选中文字、调用 AI、查看 Diff、应用修改。

### Phase 4：命令面板与设置

| 任务 ID | 说明 | 产出 |
|---------|------|------|
| P4-001 | 集成 cmdk 命令面板 | Cmd+K 触发 |
| P4-002 | 实现设置面板 | 配置项管理 |
| P4-003 | 实现主题切换 | 深色/浅色主题 |

**验收标准**：Cmd+K 打开命令面板，可切换主题。

### Phase 5：辅助功能

| 任务 ID | 说明 | 产出 |
|---------|------|------|
| P5-001 | 实现版本历史面板 | 查看/回退版本 |
| P5-002 | 实现通知系统（sonner） | Toast 提示 |
| P5-003 | 实现快捷键系统 | 全局快捷键 |

**验收标准**：版本历史可用，操作有反馈。

### Phase 6：Electron 打包

| 任务 ID | 说明 | 产出 |
|---------|------|------|
| P6-001 | 配置 electron-vite | 开发环境就绪 |
| P6-002 | 实现主进程启动后端 | 后端自动启动 |
| P6-003 | 配置 electron-builder | 生成安装包 |
| P6-004 | 测试各平台安装包 | Windows/Mac/Linux |

**验收标准**：可生成可安装的桌面应用。

### Phase 7：打磨与优化

| 任务 ID | 说明 | 产出 |
|---------|------|------|
| P7-001 | 动效优化（Framer Motion） | 过渡动画 |
| P7-002 | 性能优化 | 懒加载、虚拟化 |
| P7-003 | 无障碍优化 | 键盘导航、ARIA |
| P7-004 | 细节打磨 | hover/focus 效果 |

**验收标准**：达到 Cursor/Linear 级别的视觉和交互质量。

---

## 验收标准

### 功能验收

| 功能 | 标准 |
|------|------|
| 文件浏览 | 可浏览项目文件夹 |
| 富文本编辑 | 普通用户可通过工具栏完成所有格式化操作，无需了解 Markdown |
| Markdown 编辑 | 熟悉 Markdown 的用户可使用语法快捷输入 |
| 双模式切换 | 可在富文本和 Markdown 模式间无缝切换 |
| 多格式导出 | 可导出为 Word (.docx)、PDF、HTML 格式 |
| AI 调用 | 可选中文字、调用 AI、查看结果 |
| 版本历史 | 可查看历史版本、回退 |
| 命令面板 | Cmd+K 可触发，可搜索命令 |
| 设置 | 可配置 API Key、切换主题、默认编辑模式 |

### 设计验收

| 维度 | 标准 |
|------|------|
| 视觉 | 达到 Cursor/Linear 级别 |
| 动效 | 过渡自然、有意义 |
| 响应 | 操作有即时反馈 |
| 一致性 | 所有组件风格统一 |

### 技术验收

| 维度 | 标准 |
|------|------|
| 类型安全 | 无 any，严格模式通过 |
| 构建 | 无警告，bundle size 合理 |
| 性能 | 首屏 < 2s，交互 < 100ms |
| 打包 | 三平台安装包可用 |

---

## Out of Scope（本 Sprint 不包含）

- Theia 后端服务重写（保留现有实现）
- 云同步功能（Sprint 7 范围）
- 知识图谱可视化重写（仅迁移现有实现）
- 新 AI 能力开发（仅迁移现有 SKILL 系统）

## 风险与应对

| 风险 | 概率 | 影响 | 应对 |
|------|------|------|------|
| 后端接口不兼容 | 低 | 高 | 后端服务已稳定，复用现有协议 |
| FlexLayout 功能不足 | 中 | 中 | 备选：rc-dock 或自定义 |
| Electron 打包问题 | 中 | 中 | 使用成熟的 electron-vite |
| 设计质量达不到预期 | 中 | 高 | 参考 Cursor/Linear，多次迭代 |

## References

- 产品与路线图基线：`openspec/specs/writenow-spec/spec.md`
- 治理与交付约束：`AGENTS.md`
- 设计参考：Cursor、Linear、Notion、Obsidian
- 技术文档：shadcn/ui、TipTap、FlexLayout、react-arborist、cmdk

## 状态同步触发点

- Phase 0 完成 → 更新 writenow-spec，标记前端重构启动
- Phase 2 完成 → 更新 writenow-spec，标记编辑器迁移完成
- Phase 6 完成 → 更新 writenow-spec，标记打包可用
- 全部 Phase 完成 → 更新 writenow-spec 架构章节，确认新前端为正式基线
