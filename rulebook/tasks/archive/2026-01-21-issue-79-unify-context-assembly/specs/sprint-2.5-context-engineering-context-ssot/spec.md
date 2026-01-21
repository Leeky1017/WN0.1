# Spec (Delta): ContextAssembler SSOT for `ai:skill:run` (Issue #79)

Authority:
- `openspec/specs/sprint-2.5-context-engineering/spec.md`
- `openspec/specs/sprint-2-ai/spec.md`
- `openspec/specs/writenow-spec/spec.md`

## Goals
- Remove the legacy prompt assembly path in main process and make `ContextAssembler` the only way to build model prompts for SKILL runs.
- Ensure Context Viewer shows **the exact prompt** sent to the model (no “preview vs actual” divergence).
- Keep IPC error semantics stable and observable (`IpcResponse<T>` with stable error codes/messages).

## Requirements
### Single prompt assembly chain
- `electron/ipc/ai.cjs` MUST NOT assemble prompts via ad-hoc template replacement.
- `ai:skill:run` MUST use `ContextAssembler.assemble()` output as the single source of truth for:
  - `systemPrompt`
  - `userContent`

### Viewer ↔ model prompt consistency
- For any `ai:skill:run` invocation, the prompt displayed in Context Viewer MUST be bitwise identical to the prompt sent to the model.
- The system SHOULD expose a deterministic equality check (e.g. stable hash) for debugging and E2E assertions.

### Failure semantics (no silent failure)
- Prompt assembly failures MUST be returned as `ok:false` with stable `error.code` + `error.message` (no thrown errors across IPC).
- Cancel/timeout MUST be distinguishable and MUST clear pending state (`CANCELED` / `TIMEOUT`).

## Acceptance Scenarios (E2E)
1) Trigger a SKILL with a selection → open Context Viewer → viewer prompt equals the prompt actually sent to the model.
2) Trigger a SKILL with empty selection → viewer prompt still equals actual prompt; no crashes; assembled context remains explainable.
3) Cancel an in-flight SKILL → UI returns to idle; no stuck loading; last assembled prompt remains consistent and debuggable.

