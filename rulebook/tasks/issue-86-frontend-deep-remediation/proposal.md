# Proposal: issue-86-frontend-deep-remediation

## Why
WriteNow 前端需要建立可持续演进的设计系统与布局基线，消除风格漂移与“硬编码颜色”导致的主题破裂风险，并把核心写作路径（编辑/预览/AI）升级到专业软件质感（Linear/Cursor 类克制风格）。

## What Changes
- Spec housekeeping：将已在其他 Sprint 完成的任务卡片标记为 done（避免重复交付）
- P0：建立 tokens SSOT（Primitive → Semantic → Component）+ Light/Dark 映射，并将主题消费点收敛到 `--wn-*`
- P0：新增 lint/CI guard，禁止硬编码颜色（hex/rgb/hsl）与未定义 `wn-*` 类名
- P0：新增 `src/components/wn/` 组件封装层（WnPanel/WnButton/WnInput/WnResizable/WnDialog），统一 API 与默认密度
- P0：升级 Markdown 预览为全保真渲染（GFM、代码高亮多主题、数学公式、Mermaid、滚动同步、大文档性能策略）
- P1：重构主界面为四栏贯穿布局（ActivityBar | Sidebar | MainContent | AIPanel），面板宽度可拖拽并持久化
- P1：合并状态信息到单一超细 StatusBar（≤24px），支持渐进披露与专注模式精简

## Impact
- Affected specs: `openspec/specs/wn-frontend-deep-remediation/spec.md`, `openspec/specs/wn-frontend-deep-remediation/task_cards/p0/*`, `openspec/specs/wn-frontend-deep-remediation/task_cards/p1/*`, `openspec/_ops/task_runs/ISSUE-86.md`
- Affected code: `src/styles/*`, `src/components/wn/*`, `src/App.tsx`（或布局入口）, `src/components/**`（预览/状态栏/布局容器）, `tests/e2e/*`, `eslint.config.js`（或 lint 脚本）
- Breaking change: NO（内部重构；用户可见为体验升级）
- User benefit: 主题一致性可扩展、布局更专业且可定制、Markdown 预览全保真、状态信息低干扰但可发现
