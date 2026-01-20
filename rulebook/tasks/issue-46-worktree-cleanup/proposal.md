# Proposal: issue-46-worktree-cleanup

## Why
We use git worktrees for task isolation, but merged tasks currently leave behind local worktrees and local branches.
This causes the controlplane working directory to accidentally remain on `task/*` branches and increases local repo clutter.

## What Changes
- Add a local-only cleanup script `scripts/agent_worktree_cleanup.sh`.
- Update docs to require running it after PR merge and controlplane sync.

## Impact
- Affected workflow docs: `openspec/AGENTS.md`, `AGENTS.md`
- Affected code: none (no runtime changes)
- Breaking change: NO
