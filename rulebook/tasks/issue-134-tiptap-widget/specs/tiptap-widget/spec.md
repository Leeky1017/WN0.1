# Spec Delta: tiptap-widget (Issue #134)

## Purpose

将 PoC 中验证可行的 TipTap editor 集成，迁移为 `writenow-theia/writenow-core` 的正式 `.md` Editor Widget，并补齐 Save/Dirty 生命周期、Markdown SSOT 与可解释的快捷键分层路由策略，使其可作为后续 Phase 1/2 editor 迁移的稳定基础。

SSOT references:

- `openspec/specs/sprint-theia-migration/design/tiptap-integration.md`
- `openspec/specs/sprint-theia-migration/task_cards/p1/006-tiptap-widget.md`

## Requirements

### Requirement: `.md` files MUST open in TipTap editor widget

The system MUST bind `.md` resources to the TipTap Markdown Editor Widget via a Theia open handler / widget factory registration, so users do not land in the default editor for Markdown files.

#### Scenario: Open `.md` from File Explorer
- **GIVEN** a workspace contains a `.md` file.
- **WHEN** user double-clicks the `.md` file in File Explorer.
- **THEN** Theia opens it with the TipTap Markdown Editor Widget (not the default editor).

### Requirement: Markdown MUST be the single source of truth (SSOT)

The editor MUST treat disk Markdown as the canonical representation and MUST serialize editor state back to Markdown for persistence.

#### Scenario: Save writes Markdown (not HTML)
- **GIVEN** the editor has loaded a `.md` file from disk.
- **WHEN** user edits content in the editor and triggers Save.
- **THEN** the editor serializes the document to Markdown.
- **AND** the file written to disk is Markdown text (not HTML).

### Requirement: The widget MUST implement Save/Dirty lifecycle

The widget MUST implement Theia's Saveable/dirty semantics so global save commands behave consistently, and failures remain recoverable.

#### Scenario: Dirty mark and save clears only on success
- **GIVEN** the editor has loaded a `.md` file from disk.
- **WHEN** editor content differs from last-saved disk content.
- **THEN** the widget becomes dirty and Theia shows a dirty marker on the tab.
- **WHEN** save succeeds.
- **THEN** dirty clears.
- **WHEN** save fails (read-only FS, permission error, etc.).
- **THEN** a user-visible error is shown and dirty MUST remain set to allow retry.

### Requirement: Shortcut routing MUST be layered and explainable

Shortcut routing MUST follow `design/tiptap-integration.md`: reserved IDE shortcuts are handled by Theia even when the editor is focused; editor semantic shortcuts are delegated to TipTap/ProseMirror.

#### Scenario: Theia reserved shortcuts still work while editor is focused
- **GIVEN** the TipTap editor has focus.
- **WHEN** user presses a reserved shortcut (at minimum `Ctrl/Cmd+S`).
- **THEN** the shortcut is routed to the corresponding Theia command.
- **AND** default browser actions are prevented to avoid double-trigger.

#### Scenario: Editor semantic shortcuts work while editor is focused
- **GIVEN** the TipTap editor has focus.
- **WHEN** user presses an editor semantic shortcut like `Ctrl/Cmd+B` (bold) or `Ctrl/Cmd+Z` (undo).
- **THEN** TipTap/ProseMirror handles it.

### Requirement: IME composition MUST be safe

During IME composition, the editor MUST avoid intercepting key events that would break composition text input (except explicitly reserved shortcuts).

#### Scenario: Chinese IME input is not broken
- **GIVEN** user is composing with an IME (`event.isComposing === true`).
- **WHEN** user types inside the editor.
- **THEN** the editor MUST NOT intercept non-reserved shortcuts and MUST preserve normal text input.
