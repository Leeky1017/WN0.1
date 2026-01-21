# FRONTEND-P0-004: Markdown 预览全保真（GFM + Shiki + KaTeX + Mermaid + Scroll Sync）

Status: done
Issue: #86
PR: https://github.com/Leeky1017/WN0.1/pull/87
RUN_LOG: openspec/_ops/task_runs/ISSUE-86.md

## Goal

把 Markdown 预览升级为全保真渲染能力，满足高级创作者需求，并保证大文档性能与编辑/预览滚动同步可用。

## Dependencies

- `FRONTEND-P0-001`（主题 token，用于预览主题联动）

## Expected File Changes

- Update: `src/components/Editor/`（预览渲染组件与 Split 模式实现）
- Add: `src/components/Editor/MarkdownPreview.tsx`
- Add: `src/components/Editor/preview/`（渲染管线：code/math/mermaid）
- Update: `package.json` / `package-lock.json`（引入渲染依赖）
- Add: `tests/e2e/frontend-markdown-preview.spec.ts`（真实渲染能力 E2E）

## Acceptance Criteria

- [x] 代码块支持高亮，且 Light/Dark 主题一致
- [x] 数学公式正确渲染（KaTeX）且不破坏布局
- [x] Mermaid 渲染可用（至少支持 flowchart/sequence 基础），且有安全策略（不执行任意脚本）
- [x] 编辑区与预览区滚动同步可用且不抖动
- [x] 大文档下预览性能不明显卡顿（有明确的 debounce/缓存策略）

## Tests

- [x] Playwright E2E 覆盖：输入包含 code/math/mermaid 的 Markdown → 打开预览 → 断言关键元素存在 → 滚动同步可观测
