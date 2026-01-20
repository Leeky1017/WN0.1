# Design: FRONTEND Deep Remediation Overview

## Goals

- 统一设计系统（Tokens + WN 组件封装层）作为前端 UI 的单一事实源，避免风格漂移与主题扩展破裂。
- 重构布局体系消除“三明治陷阱”，把空间留给内容，让侧边容器垂直贯穿。
- 让编辑器与 AI 面板具备专业软件的“密度感”和“层级感”，同时不牺牲心流。
- 用可验证的质量门禁（E2E + 视觉回归 + 多分辨率矩阵）阻止回归与“糖果味”复发。

## Non-Goals

- 不在本阶段引入新的“砍功能”决策；所有建议以“形态/位置/渐进披露”优化为准。
- 不把具体实现绑定到单一库（例如编辑器/渲染/动效库）：允许在任务卡片实施时做可证伪的选型。

## Architecture Overview

- **Design System SSOT**
  - `tokens`（Primitive → Semantic → Component）→ CSS variables（`--wn-*`）
  - Tailwind/shadcn/ui/WN components 只消费语义 token
- **WN Component Layer**
  - `src/components/wn/` 封装 shadcn/ui → 统一密度/交互/动效/可访问性
  - 业务页面只拼装 WN 组件与布局组合，不再“手搓 div + 硬编码颜色”
- **Layout System**
  - 主布局基于可拖拽面板（Sidebar/Main/AIPanel），状态持久化
  - 顶部横向条（StatsBar 等）不再切断侧边栏；状态信息合并至底部超细 StatusBar
- **Quality Gates**
  - 设计 token/硬编码约束进入 CI
  - Playwright E2E 覆盖核心真实路径
  - 视觉回归保护密度/颜色/阴影/圆角一致性

