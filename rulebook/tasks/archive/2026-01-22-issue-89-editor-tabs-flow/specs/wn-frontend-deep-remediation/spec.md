# Spec Delta: issue-89-editor-tabs-flow

## Scope
- Implements P2 acceptance for:
  - `FRONTEND-P2-002` (TabBar + Toolbar single row + true multi-tabs)
  - `FRONTEND-P2-003` (Typewriter / Paragraph Focus / Zen)

## Requirements (references)
- `openspec/specs/wn-frontend-deep-remediation/spec.md`
  - `FROTNEND-EDITOR-001`: TabBar + Toolbar single row + true multi-tabs
  - `FROTNEND-FLOW-001`: Typewriter/Focus/Zen flow protection

## Scenarios
- Multi-tab safety: switching tabs preserves content + dirty state; closing a dirty tab provides an explicit user choice (save / discard / cancel).
- Typewriter stability: caret stays near vertical center with configurable tolerance, without jitter during continuous typing.
- Paragraph focus: non-current paragraphs are visually deemphasized with configurable strength, without breaking selection/copy.
- Zen: hides non-editor chrome, supports edge-hover peek, and restores prior UI state on exit.

