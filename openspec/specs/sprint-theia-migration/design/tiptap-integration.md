# TipTap Integration: Focus and Shortcut Strategy

## Goals
- Keep editor focus state explicit so Theia context keys and commands are predictable.
- Avoid shortcut conflicts between Theia and ProseMirror while preserving editor ergonomics.
- Ensure platform parity (Windows primary, macOS Cmd mapping).

## Focus Model

### Context Keys
Define and maintain Theia context keys (names are illustrative and should be centralized):
- `writenow.editorFocus`: true when the active TipTap view owns focus.
- `writenow.editorMode`: `markdown` | `richtext`.
- `writenow.editorReadonly`: true when editor is read-only.

### Focus Lifecycle
- On editor mount, register DOM focus/blur listeners and a FocusTracker for widget-level focus.
- On focus, set context keys and publish the active editor id.
- On blur, clear `writenow.editorFocus` unless another editor immediately gains focus.
- When multiple editors are open, only the active one may assert focus context keys.

## Shortcut Routing Policy

### Ownership Rules
- **Theia-owned**: app-level commands (save, open, search, command palette, navigation).
- **TipTap-owned**: text editing and formatting (bold, italic, headings, list toggles).
- **Shared**: when Theia commands must work inside the editor, Theia wins by explicit routing.

### Resolution Order
1. Editor keydown handler consults Theia keybinding resolution.
2. If a Theia command matches, prevent default and execute that command.
3. Otherwise, fall back to TipTap/ProseMirror keymaps.

This ensures global shortcuts keep working inside the editor while editor-specific shortcuts remain responsive.

### Reserved Shortcuts (examples)
Reserve the following for Theia even when the editor is focused:
- `Ctrl/Cmd+S` save
- `Ctrl/Cmd+P` quick open
- `Ctrl/Cmd+Shift+P` command palette
- `Ctrl/Cmd+F` find
- `Ctrl/Cmd+Shift+F` global search
- `Ctrl/Cmd+N` new

## Composition and IME Safety
- During IME composition, do not intercept keybindings except for hard-reserved commands.
- The editor should surface composition state so the keybinding resolver can skip safely.

## Implementation Notes
- All dependencies must be explicit: pass CommandRegistry, KeybindingRegistry, and ContextKeyService via widget props.
- Keep a single adapter that translates TipTap focus/selection events into Theia context keys.
- Define all editor-specific commands in Theia CommandRegistry, even if the handler delegates to TipTap.

## Test Matrix
- Focus transitions: editor -> sidebar -> editor updates context keys correctly.
- Shortcut routing: `Ctrl/Cmd+S` triggers save inside editor; bold/italic still work.
- IME: composition input is not interrupted by global keybindings.
