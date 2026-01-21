# Sprint 6: Experience - Stats + Pomodoro (Issue #70)

## Purpose

Deliver the Sprint 6 “体验增强” task package A: persisted writing statistics + an in-app Pomodoro timer that is stable, recoverable across restarts, and credits focus minutes into `writing_stats`.

## Requirements

### Requirement: Writing stats are persisted and queryable

#### Scenario: Saving a document updates daily word count
- **WHEN** the user saves a document successfully
- **THEN** the app MUST update today’s `writing_stats.word_count` using a single, consistent counting policy
- **AND** the data MUST be persisted in SQLite and survive restart

#### Scenario: Creating a document increments daily articles_created
- **WHEN** the user creates a new document successfully
- **THEN** the app MUST increment today’s `writing_stats.articles_created` by `+1`

#### Scenario: Stats panel supports day/week/month views
- **WHEN** the user opens the “创作统计” panel and switches between day/week/month
- **THEN** the UI MUST query stats in the selected date range and render aggregates + recent trend

### Requirement: Pomodoro timer is stable, recoverable, and stats-linked

#### Scenario: Basic Pomodoro flow
- **WHEN** the user starts a Pomodoro
- **THEN** the app MUST enter `focus` phase, countdown accurately, and allow pause/resume/stop
- **WHEN** the focus phase ends
- **THEN** the app MUST transition to `break` phase and notify the user (at minimum in-app)

#### Scenario: Focus completion credits writing_minutes
- **WHEN** the user completes a focus phase
- **THEN** the app MUST increment today’s `writing_stats.writing_minutes` by the completed focus minutes

#### Scenario: Restart recovery is explicit and consistent
- **WHEN** the app exits/restarts while Pomodoro is running or paused
- **THEN** the next launch MUST restore correct phase + remaining time (or present an explicit “restore?” prompt)
- **AND** the app MUST NOT silently lose an in-progress timer

### Requirement: IPC boundary errors are stable and observable

#### Scenario: Stats and Pomodoro APIs return typed results
- **WHEN** the renderer calls `stats:*` IPC APIs
- **THEN** the main process MUST return `IpcResponse<T>` with stable `error.code`/`error.message` on failures
- **AND** failures MUST be observable and recoverable (no silent failures; no raw stack leakage to renderer)
