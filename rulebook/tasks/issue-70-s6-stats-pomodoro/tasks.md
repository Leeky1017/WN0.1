## 1. Implementation
- [ ] 1.1 Implement `writing_stats` DB init + upsert/increment APIs (main process)
- [ ] 1.2 Add `stats:*` IPC endpoints + preload allowlist wiring
- [ ] 1.3 Renderer stats store + Stats panel (day/week/month) and StatsBar integration
- [ ] 1.4 Implement pomodoro state machine + persistence + notifications
- [ ] 1.5 Wire pomodoro completion → stats `writing_minutes` increment
- [ ] 1.6 Update OpenSpec task cards acceptance + completion metadata

## 2. Testing
- [ ] 2.1 E2E: create doc → save → today `word_count` updates
- [ ] 2.2 E2E: run pomodoro focus → minutes credited; restart → state restored

## 3. Documentation
- [ ] 3.1 Maintain `openspec/_ops/task_runs/ISSUE-70.md` evidence (commands + outputs)
