# ISSUE-50
- Issue: #50
- Branch: task/50-sprint-5-project-management
- PR: <fill-after-created>

## Plan
- Implement projects/characters/outline/knowledge graph end-to-end
- Add Playwright E2E coverage for Sprint 5 flows
- Ship via PR with required checks green

## Runs
### 2026-01-20 00:00 bootstrap
- Command: `gh issue create -t "Sprint 5: Project management (projects/characters/outline/knowledge graph)" -b "..."`
- Key output: `https://github.com/Leeky1017/WN0.1/issues/50`

### 2026-01-20 00:00 worktree
- Command: `git worktree add .worktrees/issue-50-sprint-5-project-management -b task/50-sprint-5-project-management`
- Key output: `Preparing worktree (new branch 'task/50-sprint-5-project-management')`

### 2026-01-20 00:00 spec-first
- Command: `git commit -m "chore: sprint 5 task scaffolding (#50)"`
- Key output: `8f9e91b chore: sprint 5 task scaffolding (#50)`

### 2026-01-20 00:00 projects
- Command: `git commit -m "feat: projects bootstrap and switching (#50)"`
- Key output: `ce90852 feat: projects bootstrap and switching (#50)`

### 2026-01-20 00:00 lint
- Command: `eslint src`
- Key output: `0 errors (react-refresh warnings in ui/*)`

### 2026-01-20 00:00 characters
- Command: `git commit -m "feat: character cards CRUD (#50)"`
- Key output: `fa546a8 feat: character cards CRUD (#50)`

### 2026-01-20 00:00 outline
- Command: `git commit -m "feat: outline persistence and editor jump (#50)"`
- Key output: `48c8bc5 feat: outline persistence and editor jump (#50)`

### 2026-01-20 00:00 knowledge-graph
- Command: `git commit -m "feat: knowledge graph CRUD and visualization (#50)"`
- Key output: `239e918 feat: knowledge graph CRUD and visualization (#50)`
