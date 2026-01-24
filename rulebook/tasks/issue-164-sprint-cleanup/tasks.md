## 1. Implementation
- [ ] 1.1 Create RUN_LOG + capture pre-cleanup snapshots
- [ ] 1.2 Close Task 012 card metadata + acceptance checkmarks
- [ ] 1.3 Delete `theia-poc/` via `git rm`
- [ ] 1.4 Clean `src/`:
  - keep: `src/types/`, `src/locales/`, `src/lib/context/` (only if still referenced)
  - remove: legacy UI/state/entrypoints (`src/components/`, `src/stores/`, pages/views, `src/App.tsx`, `src/main.tsx`, etc.)
- [ ] 1.5 Audit `electron/` usage by `writenow-theia/`; remove migrated pieces or document why kept
- [ ] 1.6 Update `package.json` scripts/entrypoints and prune unused deps

## 2. Verification
- [ ] 2.1 Install: `npm ci`
- [ ] 2.2 Lint/unit/build: `npm run lint`, `npm test`, `npm run build`
- [ ] 2.3 Smoke (Browser): start Theia browser app from `writenow-theia/`
- [ ] 2.4 Smoke (Electron): start Theia electron app (or current Electron entrypoint)

## 3. Documentation / Delivery
- [ ] 3.1 Update docs/specs (AGENTS.md, writenow-spec, README, deprecated specs)
- [ ] 3.2 Record deletion/keep lists + post-cleanup snapshots + verification outputs in RUN_LOG
- [ ] 3.3 PR: enable auto-merge with `Closes #164`
