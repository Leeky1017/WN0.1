# Notes — ISSUE-251

## Source Plan
- `.cursor/plans/frontend-completion-sprint_28130b62.plan.md`
  - Phases 1–4 largely marked complete upstream.
  - Remaining DoD checkbox: “每个已接入 API 的侧边栏视图有 E2E 测试” (plan §4 / DoD).

## Local State (pre-migration)
- Working tree on `main` contained significant uncommitted frontend UI/demo changes:
  - `writenow-frontend/` UI components + styles + sidebar views + AI panel changes
  - New dirs: `writenow-artistic-demo/`, `figma参考/`, `writenow-frontend/src/styles/tokens/`, `writenow-frontend/src/components/composed/`

## Decisions
- Use Git worktree isolation per AGENTS.md; migrate changes via `git diff --binary` patch + tar of untracked files.
- Keep `styles/tokens.css` entrypoint consistent with `openspec/specs/writenow-spec/spec.md` (if drift is found, fix code/spec together).

## Open Questions / Risks
- Some local style system refactors (tokens split into multiple files) may drift from spec; must reconcile before PR.
- E2E tests must use the real Electron app + real persistence (no stubs) per AGENTS.md.
