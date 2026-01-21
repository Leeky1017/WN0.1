## Checklist
- [x] Add `openspec/_ops/task_runs/ISSUE-61.md`
- [x] Implement `src/stores/editorContextStore.ts` (debounced selection/cursor/paragraph + surrounding window)
- [x] Wire TipTap subscriptions in `src/components/Editor/` to update Immediate SSOT
- [x] Add `src/lib/context/entity-detect.ts` + vitest coverage (zh/en, partial match, same-name)
- [x] Update `src/lib/context/loaders/settings-loader.ts` with `prefetchByEntities` and safe degradation
- [x] Upgrade `src/lib/context/prompt-template.ts` + `src/lib/context/assembler.ts` (versioned, stable prefix, deterministic rules order, skill variants)
- [x] Add Playwright Electron E2E for P1-A (editor context sync, entity inject, prefix stability evidence)
- [x] Run `npm run lint && npm test`
- [x] Run `npm run build && npm run test:e2e`
- [x] Run `openspec validate --specs --strict --no-interactive`
- [x] If IPC touched: run `npm run contract:generate && npm run contract:check` (N/A: no IPC changes)
- [ ] Update task cards acceptance + completion metadata for `CONTEXT-P1-005/006/007`
- [ ] Create PR with `Closes #61` and enable auto-merge

## Acceptance
- TipTap selection/cursor/paragraph sync lands in store within default 200ms debounce (configurable) without editor jank.
- Entity detection is explainable; prefetch makes corresponding `.writenow/characters|settings/*.md` available to assembly; failures degrade safely.
- PromptTemplate stable prefix is deterministic + versioned; dynamic suffix inject order is Settings → Retrieved → Immediate; rules order is stable and traceable.

## Notes
- Keep a single implementation path (no backward-compat dual stack) per `AGENTS.md`.
