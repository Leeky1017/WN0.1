## 0. Spec housekeeping
- [x] 0.1 Add RUN_LOG `openspec/_ops/task_runs/ISSUE-86.md`
- [x] 0.2 Mark task cards as done (completed in earlier sprints): `FRONTEND-P1-003`, `FRONTEND-P2-001`

## 1. P0: Design system foundation
- [x] 1.1 Establish tokens SSOT (`src/styles/tokens.css`) with Primitive → Semantic → Component layers
- [x] 1.2 Wire Light/Dark theme mapping to consume `--wn-*` tokens
- [x] 1.3 Add lint/CI guard: ban hardcoded colors + undefined `wn-*` classes
- [x] 1.4 Add `src/components/wn/` wrapper layer (WnPanel/WnButton/WnInput/WnResizable/WnDialog)
- [x] 1.5 Upgrade Markdown preview (GFM, highlight multi-theme, math, mermaid, scroll sync, large-doc perf)

## 2. P1: Layout and status
- [x] 2.1 Refactor layout to 4-column贯穿 + resizable panels + persistence
- [x] 2.2 Unify StatusBar (≤24px) with progressive disclosure + focus-mode reduction

## 3. Testing (Playwright E2E, real UI + persistence)
- [x] 3.1 Layout: drag resize → restart → widths restored
- [x] 3.2 Markdown: table/task-list/math/mermaid/code highlight rendered correctly in Light/Dark
- [x] 3.3 StatusBar: single source of status info; expand/collapse UX works

## 4. Validation
- [x] 4.1 `npm run lint`
- [x] 4.2 `npm run test:e2e`
- [x] 4.3 `openspec validate --specs --strict --no-interactive`
