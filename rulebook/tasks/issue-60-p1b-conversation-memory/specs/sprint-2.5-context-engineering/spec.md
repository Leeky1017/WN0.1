# Spec (Delta): Sprint 2.5 P1-B — Conversation Memory

Authority: `openspec/specs/sprint-2.5-context-engineering/spec.md` and `openspec/specs/writenow-spec/spec.md`.

## Goals
- Persist conversations to `.writenow/conversations/` and maintain a global `index.json` for lookup and recency ordering.
- On conversation end, generate a short summary asynchronously (L2/small model) and store it for future token-efficient injection.
- Support “像上次那样” style recall by extracting preference signals from history and injecting them into the retrieved layer.

## Requirements
### Storage
- All files live under the user workspace `.writenow/`.
- Conversations are stored under `.writenow/conversations/<conversationId>.json`.
- `index.json` is the single source of truth for listing and retrieving metadata.
- Index updates are atomic and recoverable (no partial writes).

### IPC (main → renderer)
- All IPC handlers must return `IpcResponse<T>` (no thrown errors across the boundary).
- Failures must be observable and stable: `ok:false` with `error.code` + `error.message`.
- Timeout/cancel paths must be distinct and use `TIMEOUT` / `CANCELED` error codes (per `src/types/ipc-generated.ts`).

### Summary generation
- Triggered on “conversation ended” event.
- Runs asynchronously; must not block UI thread.
- Summary writeback updates both the conversation record and the global index.
- Retry is possible by re-triggering the same conversation end action.

### Recall injection
- When user input contains recall intent (e.g. “像上次那样/和上次一样”), loaders extract preference signals from index (and summary where present).
- Retrieved injection must be scoped and bounded (avoid unbounded token growth).

## Acceptance Scenarios
1) Create a conversation, write multiple turns, restart app → conversation appears in history and loads correctly.
2) End a conversation → summary is generated asynchronously and index reflects it; later prompt uses summary instead of full transcript.
3) User types “像上次那样…” → retrieved context includes preference signals derived from history; no silent failures on missing/corrupt data.
