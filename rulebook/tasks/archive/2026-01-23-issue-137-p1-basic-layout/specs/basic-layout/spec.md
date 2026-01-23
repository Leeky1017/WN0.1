# Spec Delta: basic-layout (Issue #137)

## Purpose

将 `writenow-theia/` 从“默认 Theia IDE 外观”升级为可辨识的 WriteNow 应用，并落地一套稳定的基础布局骨架（左侧资源管理 + 主编辑区 + 右侧面板占位），为后续 AI Panel / 知识图谱 / 人物卡片等 Widget 提供明确插槽与接线点，避免后续任务重复重排布局。

SSOT references:

- `openspec/specs/sprint-theia-migration/task_cards/p1/007-basic-layout.md`
- `openspec/specs/sprint-theia-migration/spec.md`
- `openspec/specs/writenow-spec/spec.md`

## Requirements

### Requirement: Theia app MUST present WriteNow branding (title/productName/icon)

The system MUST show "WriteNow" branding for both Browser and Electron targets, and MUST be configured for Electron packaging (productName + icon assets).

#### Scenario: Browser startup shows WriteNow branding
- **GIVEN** the user starts the Browser target.
- **WHEN** the frontend shell is ready.
- **THEN** the document/window title MUST include "WriteNow".

#### Scenario: Electron startup shows WriteNow branding
- **GIVEN** the user starts the Electron target.
- **WHEN** the first window is created.
- **THEN** the window title MUST include "WriteNow".
- **AND** the app icon MUST be configured (placeholder is acceptable but MUST be wired).

### Requirement: Default theme MUST be dark and theme switching MUST remain functional

WriteNow MUST default to a dark theme suitable for long-form writing while keeping Theia's built-in theme switch mechanism usable.

#### Scenario: Default theme is dark
- **GIVEN** a fresh user profile (no existing Theia preferences).
- **WHEN** the app starts.
- **THEN** the default theme MUST be dark.

#### Scenario: User can switch theme
- **GIVEN** the app is running.
- **WHEN** the user opens Settings and changes the theme.
- **THEN** the theme MUST switch without breaking layout/widgets.

### Requirement: Layout skeleton MUST be stable (left explorer / main editor / right panel)

The app MUST expose a stable three-column skeleton:

- Left: File Explorer (default open)
- Main: editor area (TipTap `.md` editor is the primary editor)
- Right: a reserved panel slot for future AI/graph widgets (placeholder is acceptable)

#### Scenario: Startup layout has left + main + right areas
- **GIVEN** the app starts.
- **WHEN** the initial layout is initialized.
- **THEN** the Explorer MUST be available and open by default.
- **AND** the right side panel area MUST be visible (or can be revealed by a single, stable entrypoint).
- **AND** the right area MUST contain an AI Panel placeholder.

### Requirement: Activity Bar MUST be creator-focused

The Activity Bar MUST NOT expose programmer-IDE entrypoints (Debug/Git/Extensions) and SHOULD only contain creator-focused entrypoints (Explorer / Search / Settings) for Phase 1.

#### Scenario: Activity Bar does not contain IDE-only entries
- **GIVEN** the app starts.
- **WHEN** the Activity Bar is visible.
- **THEN** it MUST NOT contain Debug/Git/Extensions.

### Requirement: TipTap Editor Widget workflow MUST not regress

The base layout and branding changes MUST NOT break the primary workflow: open a `.md` file from Explorer and edit/save with dirty marker.

#### Scenario: Open `.md` and dirty/save is intact
- **GIVEN** a workspace contains a `.md` file.
- **WHEN** the user opens the file from Explorer and edits it.
- **THEN** the file opens in TipTap editor, dirty marker appears.
- **AND** Save persists to disk and clears dirty on success.
