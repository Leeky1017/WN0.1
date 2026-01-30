# ISSUE-396

- Issue: #396
- Branch: task/396-visual-alignment
- PR: <fill-after-created>

## Plan

- 修复 globals.css 入场动画（添加 translateY + 延迟类 + 指示器样式 + 滚动条）
- 为 SidebarItem 添加「+」指示器滑入效果
- 清理所有硬编码颜色值，替换为 Design Token
- 为 LoginPage 应用入场动画

## Runs

### 2026-01-30 Phase 1: 基础样式修复

- Command: 修改 `globals.css`
- Key output:
  - 修复 fadeIn 动画添加 `translateY(10px)` 位移
  - 动画时长从 0.2s 改为 0.8s
  - 添加 `forwards` 保持最终状态
  - 添加延迟类 `.delay-100` ~ `.delay-400`
  - 添加导航项 `+` 指示器样式 `.nav-item-indicator`
  - 滚动条宽度从 8px 改为 6px

- Command: 清理硬编码颜色值
- Key output:
  - `IconBar.tsx`: `#666666` → `var(--color-text-tertiary)` (3处)
  - `SidebarSection.tsx`: `#666666` → `var(--color-text-tertiary)`
  - `Dialog.tsx`: `#666666` → `var(--color-text-tertiary)`, `bg-black/80` → `var(--color-overlay)`
  - `EmptyState.tsx`: `#666666` → `var(--color-text-tertiary)`
  - `CodeBlock.tsx`: 多处硬编码颜色替换为 tokens
  - `LoadingState.tsx`: `#1a1a1a` → `var(--color-bg-hover)`

- Command: 修改 `tokens.css`
- Key output: 新增 `--color-overlay: rgba(0, 0, 0, 0.8)`

### 2026-01-30 Phase 2: 核心微交互补充

- Command: 修改 `SidebarItem.tsx`
- Key output:
  - 添加 `group relative` 类名用于 hover 控制
  - 添加 `nav-item-active` 类名用于激活状态
  - 添加 `+` 指示器元素

- Command: 修改 `Card.tsx`
- Key output: hover 边框色从 `--color-border-focus` (#444) 改为 `--color-border-active` (#888)

### 2026-01-30 Phase 3: 页面入场动画

- Command: 修改 `LoginPage.tsx`
- Key output:
  - 左侧面板 Brand 添加 `animate-fade-in`
  - Tagline 添加 `animate-fade-in delay-100`
  - Footer 添加 `animate-fade-in delay-200`
  - 右侧面板添加 `animate-fade-in delay-200`

- Evidence: `npm run lint` 无错误

