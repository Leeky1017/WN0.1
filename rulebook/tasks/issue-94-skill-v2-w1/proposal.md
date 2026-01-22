# Proposal: issue-94-skill-v2-w1

## Why
Ship SKILL System V2 Wave 1 end-to-end so skills become file-based SSOT (SKILL.md) with a DB index, enabling discovery, management UI, and future package/workflow work without keeping duplicate hardcoded sources.

## What Changes
- Add V2 `SKILL.md` types/parser/validator (stable error codes, token/length guards).
- Introduce SkillIndexService (builtin/global/project scan, incremental indexing, file watching).
- Add skill management IPC (list/read/toggle + create/edit/save) and renderer UI (SkillList + Skill Studio).
- Remove renderer dependency on `src/lib/skills.ts` builtin constants; builtin skills move to shipped `SKILL.md`.

## Impact
- Affected specs: `openspec/specs/skill-system-v2/spec.md`, `openspec/specs/skill-system-v2/tasks/001-004-*`
- Affected code: `src/lib/skills/v2/*`, `electron/services/skills/*`, `electron/ipc/skills.cjs`, `electron/database/schema.sql`, `src/components/*`, `src/stores/*`, `src/types/ipc-generated.ts`
- Breaking change: NO (builtin skills stay usable with same ids)
- User benefit: Skills are discoverable/manageable/editable with immediate effect; new skills can be created in-app.
