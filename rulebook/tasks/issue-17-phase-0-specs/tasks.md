# Tasks: issue-17-phase-0-specs

## Checklist
- [ ] Update `AGENTS.md` with constitutional constraints
- [ ] Create `openspec/specs/api-contract/spec.md` (IPC contract)
- [ ] Create `docs/code-standards.md`
- [ ] Create `docs/testing-standards.md`
- [ ] Create `src/types/` core types (no `any`)
- [ ] Run `npm test` / `npm run typecheck` (or equivalent) and keep CI green

## Acceptance
- `AGENTS.md` contains constitutional constraints as highest-priority rules.
- IPC contract covers all required channels with uniform envelope and error taxonomy.
- Docs are consistent and actionable, with no contradictions.
- Type definitions match the contract and forbid `any`.

