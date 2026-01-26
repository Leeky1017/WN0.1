# Notes — issue-227-writenow-frontend-figma-style

## Findings
- `figma参考/` 提供了 `ActivityBar/StatsBar/SidebarPanel/Editor/AIPanel` 的 Tailwind 样式参考；`writenow-frontend` 当前已有对应布局组件与部分 Figma 样式实现。
- `writenow-frontend/src/features/ai-panel/AIPanel.tsx` 已具备 Mode/SKILL/Model 三段控件，但 SKILL 目前为列表型下拉；本任务将按“网格卡片样式”改造其展示（不改变发送/取消/diff 等现有逻辑）。
- 编辑器工具栏已存在 `EditorToolbar.tsx` 的 Figma 样式切换栏（Markdown/Word + Edit/Preview/Split），主要风险在于只做样式调整时需避免影响 TipTap 交互与快捷键。

## Decisions
- SKILL 网格卡片将复用 `figma参考/src/components/sidebar-views/MaterialsView.tsx` 的卡片布局样式（grid + card），仅替换内容与点击行为（仍然走现有 `handleSkillClick`/`setSelectedSkillId`）。

## Later
- 如需进一步“像素级”对齐（如主题变量映射 `--bg-app` vs `--bg-primary`），在 lint 通过后再评估是否需要最小化的变量桥接，避免影响现有主题系统。

