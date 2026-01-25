# 技术选型

## 核心框架

| 类别 | 选择 | 版本 | 理由 |
|------|------|------|------|
| **构建工具** | Vite | 6.x | 极速 HMR，开箱即用 TypeScript |
| **UI 框架** | React | 18.x | 生态成熟，组件丰富 |
| **类型系统** | TypeScript | 5.x | 类型安全，与后端共享类型 |
| **样式方案** | Tailwind CSS | 4.x | 原子化 CSS，与 Design Token 配合 |
| **桌面容器** | Electron | 34.x | 成熟稳定，与后端集成方便 |
| **构建集成** | electron-vite | 3.x | Vite + Electron 最佳实践 |

## UI 组件库

| 类别 | 选择 | 理由 |
|------|------|------|
| **基础组件** | shadcn/ui | 复制粘贴架构，完全可控，基于 Radix |
| **无障碍原语** | Radix UI | 无样式、可访问、键盘导航完善 |
| **图标** | Lucide React | 与 shadcn/ui 配套，Linear 风格 |

## 功能组件

| 功能 | 选择 | GitHub Stars | 理由 |
|------|------|--------------|------|
| **编辑器** | TipTap | 29k+ | 基于 ProseMirror，Markdown 友好，已在用 |
| **文件树** | react-arborist | 3k+ | 虚拟化、拖拽、性能优秀 |
| **布局系统** | FlexLayout | 1.2k+ | IDE 级 dock panel，成熟稳定 |
| **命令面板** | cmdk | 12k+ | Cursor/Linear 同款，无样式可定制 |
| **通知** | sonner | 12k+ | Emil Kowalski 出品，动效精美 |
| **动画** | Framer Motion | 27k+ | 手势/过渡动画，性能优秀 |

## 状态管理

| 类别 | 选择 | 理由 |
|------|------|------|
| **全局状态** | Zustand | 轻量、简单、与 React 18 配合好 |
| **服务端状态** | TanStack Query | 缓存、重试、乐观更新 |

## 通信层

| 类别 | 选择 | 理由 |
|------|------|------|
| **协议** | JSON-RPC 2.0 | 与 Theia 后端兼容 |
| **传输** | WebSocket | 支持双向通信（AI 流式推送） |
| **客户端库** | vscode-ws-jsonrpc | Theia 同款，开箱即用 |
