# 001-poc-tiptap-theia

## Verdict
- Status: PASS (with IME follow-up)
- Date: 2026-01-22

## Environment
- OS: Ubuntu 24.04.3 LTS (WSL2)
- Node: v20.19.6
- Yarn: 1.22.22
- Theia: 1.67.0 (`generator-theia-extension`)

## What we built (PoC scope)
- A custom `.md` editor implemented as a Theia `ReactWidget` + `Saveable` + `Navigatable`, rendering a minimal TipTap editor (Markdown as SSOT).
  - Widget: `theia-poc/writenow-theia-poc/src/browser/tiptap-markdown-editor-widget.tsx`
  - Widget factory: `theia-poc/writenow-theia-poc/src/browser/tiptap-markdown-editor-widget-factory.ts`
  - `.md` opener (higher priority than default): `theia-poc/writenow-theia-poc/src/browser/tiptap-markdown-open-handler.ts`
- A deterministic way to open a known markdown file for headless verification (without relying on File Explorer rendering).
  - Preference-gated auto-open: `theia-poc/writenow-theia-poc/src/browser/writenow-theia-poc-frontend-startup.ts`
- A real UI smoke script (Puppeteer) validating input + key routing + save to disk.
  - `theia-poc/scripts/poc001-browser-smoke.cjs`

## Verification steps
### One-command headless verification (recommended)
1) Install/build the PoC once:
   - `cd theia-poc && yarn install`
2) Run the smoke script:
   - `node theia-poc/scripts/poc001-browser-smoke.cjs`
3) Expected output:
   - `[poc001] PASS`

### What the smoke script verifies
- `.md` is opened with TipTap widget (`data-testid="writenow-tiptap-markdown-editor"`).
- Typing works (including non-ASCII text support via direct Unicode input).
- `Tab` is handled by the editor (inserts indentation, does not move focus).
- `Ctrl/Cmd+B` stays in-editor (toggles bold).
- `Ctrl/Cmd+Z` / `Ctrl/Cmd+Shift+Z` stays in-editor (undo/redo).
- `Ctrl/Cmd+S` triggers Theia save and persists to the real filesystem (`theia-poc/poc-workspace/test.md`).
- `Ctrl/Cmd+K` is rerouted to a WriteNow-owned command (PoC message).

## Findings
### 1) Theia keybinding capture vs ProseMirror key handling conflict (root cause)
- Theia keybinding registry listens on `document` capture phase and will consume many shortcuts globally.
- A naive mitigation (“capture + `event.preventDefault()` before Theia sees it”) breaks ProseMirror/TipTap handling because ProseMirror ignores `defaultPrevented` keyboard events.

### 2) Focus + keyboard routing must be layered and explicit
- We must only intercept keys when the event target is inside the editor widget node; otherwise we would break global shortcuts outside the editor.
- IME safety matters: during composition, key events should not be hijacked.

## Solution / Workarounds
### Layered shortcut routing (implemented)
- We intercept `keydown` at `window` capture **only when the event target is within the widget DOM**, and only for editor-owned keys (`Tab`, `Ctrl/Cmd+Z/Y`, `Ctrl/Cmd+B`, `Ctrl/Cmd+K`).
- For intercepted keys we call TipTap commands directly (e.g. `editor.commands.undo()`), because ProseMirror won’t handle `defaultPrevented` events.
- We explicitly skip interception when `event.isComposing` to reduce IME risk (composition events remain owned by the editor/browser).

### Save/Dirty lifecycle (implemented)
- Widget implements `Saveable` and uses `setDirty(this, dirty)` so Theia can render dirty state and route `Ctrl/Cmd+S` through Theia’s save pipeline.

## Limitations / Follow-ups
- **IME composition (real Chinese IME) is not fully automated in this PoC**: we added an `event.isComposing` guard, but recommend a manual verification pass on Windows/macOS with a real IME before committing to Phase 1.
- If we later introduce editor-level inline AI for `Ctrl/Cmd+K`, we should graduate from “DOM capture hook” to Theia’s context-key driven keybinding strategy (to avoid long-term fragility).

## Recommendation for Phase 1
- Keep TipTap as the editor candidate: the core conflicts are solvable with explicit routing.
- Move the routing policy into a dedicated, testable “keyboard router” module when the surface area grows (shortcuts, keymaps, platform differences).
