# ISSUE-398

- Issue: #398
- Branch: task/398-dashboard-animations
- PR: <fill-after-created>

## Plan

- 为 DashboardPage 的 HeroCard、ProjectCard 网格和 Toolbar 添加入场动画

## Runs

### 2026-01-30 实现 DashboardPage 入场动画

- Command: `修改 DashboardPage.tsx 为 Toolbar 添加入场动画`
- Key output: Toolbar 包裹在 `animate-fade-in` 容器中

- Command: `修改 DashboardGrid.tsx 为 HeroCard 和 ProjectCard 添加入场动画`
- Key output:
  - HeroCard section 添加 `animate-fade-in delay-100`
  - 项目网格 section 添加 `animate-fade-in delay-200`
  - 每个 ProjectCard 根据索引添加 `delay-300`/`delay-400`
  - 新建项目按钮添加 `animate-fade-in delay-400`

- Evidence: linter 无错误

