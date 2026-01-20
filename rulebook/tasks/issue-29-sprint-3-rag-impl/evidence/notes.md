# Notes: issue-29-sprint-3-rag-impl

## Decisions
- Keep Sprint 3 minimal surface on IPC (`search:*`, `embedding:*`) and add one optional retrieval IPC only if needed for E2E/AI integration.

## Open Questions
- sqlite-vec extension loading strategy for Electron packaging (asarUnpack/extraResources) per platform.
- Embedding model asset strategy: ship-with-app vs first-run download; E2E needs deterministic local availability.

## Later
- Add UI for search and RAG inspection (Sprint 3 out of scope; keep as data-layer + IPC for now).

