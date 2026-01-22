# Spec Delta: FRONTEND-P2-004 autosave debounce + i18n guard

## References

- Task card: `openspec/specs/wn-frontend-deep-remediation/task_cards/p2/FRONTEND-P2-004-autosave-debounce-and-i18n.md`
- Baseline i18n spec (Sprint 4): `openspec/specs/sprint-4-release/spec.md` (Requirement: 应用 MUST 建立基础 i18n)

## Requirements

### Autosave (debounce + coalescing)

- Autosave MUST debounce editor changes and coalesce multiple save requests into the minimal number of disk writes.
- Autosave MUST only persist when the editor is dirty (`isDirty === true`).
- While a save is in-flight, additional save requests MUST be merged and executed after the current save completes (at most one pending save).
- Save errors MUST be observable via editor state (`saveStatus: 'error'`), and MUST NOT leave the editor stuck in a pending state.

### i18n coverage + CI gate

- All visible UI text MUST be sourced from i18n keys (zh-CN + en) and MUST NOT be hardcoded in UI components.
- CI MUST fail when new hardcoded UI text is introduced, and MUST print:
  - file:line:column locations
  - a short fix hint: "Replace with `t('...')` and add keys to `src/locales/zh-CN.json` + `src/locales/en.json`."

## Scenarios

#### Scenario: Long document typing does not spam IPC writes

- **GIVEN** an opened document and the editor is dirty
- **WHEN** the user types continuously
- **THEN** autosave requests are debounced and coalesced
- **AND** after the user stops typing for the debounce window, a save is triggered and status becomes "Saved"

#### Scenario: Language switch updates UI text

- **GIVEN** the settings panel is open
- **WHEN** the user switches language between zh-CN and en
- **THEN** visible UI text updates immediately and consistently
