#!/usr/bin/env bash
set -euo pipefail

usage() {
  cat <<'EOF'
Usage: scripts/agent_worktree_cleanup.sh <N> <slug> [--dry-run] [--force-worktree] [--force-branches]

Removes the local git worktree for issue N/slug and deletes merged local branches.

Expected worktree path:
  .worktrees/issue-<N>-<slug>

Default branch deletion behavior:
  - Deletes local branches matching: refs/heads/task/<N>-*
  - Only deletes branches that are merged into main (or origin/main).

Flags:
  --dry-run        Print what would be done, but do nothing.
  --force-worktree Allow removal even if the target worktree has uncommitted changes.
  --force-branches Delete branches even if not merged.
EOF
}

die() {
  echo "error: $*" >&2
  exit 1
}

DRY_RUN=0
FORCE_WORKTREE=0
FORCE_BRANCHES=0

if [[ $# -lt 2 ]]; then
  usage
  exit 2
fi

N="$1"
SLUG="$2"
shift 2

while [[ $# -gt 0 ]]; do
  case "$1" in
    --dry-run)
      DRY_RUN=1
      ;;
    --force-worktree)
      FORCE_WORKTREE=1
      ;;
    --force-branches)
      FORCE_BRANCHES=1
      ;;
    -h|--help)
      usage
      exit 0
      ;;
    *)
      die "unknown argument: $1"
      ;;
  esac
  shift
done

if ! command -v git >/dev/null 2>&1; then
  die "git is required"
fi

TOPLEVEL="$(git rev-parse --show-toplevel 2>/dev/null)" || die "not a git repository"

# This repository uses a convention where the primary worktree ("controlplane")
# contains the shared `.worktrees/` directory. If we're running from another
# linked worktree, locate the controlplane so cleanup works from anywhere.
controlplane="$TOPLEVEL"
if [[ ! -d "$controlplane/.worktrees" ]]; then
  while IFS= read -r line; do
    case "$line" in
      worktree\ *)
        wt_path="${line#worktree }"
        if [[ -d "$wt_path/.worktrees" ]]; then
          controlplane="$wt_path"
          break
        fi
        ;;
    esac
  done < <(git worktree list --porcelain)
fi

cd "$controlplane"

default_base_branch="main"
base_branch=""

# Prefer origin/main as the merge source of truth.
if git show-ref --verify --quiet "refs/remotes/origin/${default_base_branch}"; then
  base_branch="origin/${default_base_branch}"
elif git show-ref --verify --quiet "refs/heads/${default_base_branch}"; then
  base_branch="${default_base_branch}"
else
  die "cannot find base branch '${default_base_branch}' (neither local nor origin/${default_base_branch})"
fi

expected_worktree_abs="${controlplane}/.worktrees/issue-${N}-${SLUG}"

worktrees=()
if [[ -d "$expected_worktree_abs" ]]; then
  worktrees+=("$expected_worktree_abs")
else
  # If the expected path doesn't exist, try to locate any worktrees for this issue.
  issue_prefix="${controlplane}/.worktrees/issue-${N}-"
  while IFS= read -r line; do
    case "$line" in
      worktree\ *)
        wt_path="${line#worktree }"
        if [[ "$wt_path" == "$issue_prefix"* ]]; then
          worktrees+=("$wt_path")
        fi
        ;;
    esac
  done < <(git worktree list --porcelain)
fi

if [[ ${#worktrees[@]} -eq 0 ]]; then
  echo "No matching worktrees found for issue ${N} (expected: ${expected_worktree_abs})."
else
  for wt in "${worktrees[@]}"; do
    wt_abs="$wt"
    if [[ "$wt_abs" == "$controlplane"/* ]]; then
      wt_display="${wt_abs#"$controlplane"/}"
    else
      wt_display="$wt_abs"
    fi

    if [[ -d "$wt_abs" ]]; then
      case "$PWD/" in
        "$wt_abs"/*)
          die "refusing to remove current worktree ($wt_display). Run from the controlplane worktree instead."
          ;;
      esac

      if [[ $FORCE_WORKTREE -eq 0 ]]; then
        if [[ -n "$(git -C "$wt_abs" status --porcelain 2>/dev/null || true)" ]]; then
          die "worktree '$wt_display' has uncommitted changes (use --force-worktree to override)"
        fi
      fi

      echo "Removing worktree: $wt_display"
      if [[ $DRY_RUN -eq 0 ]]; then
        if [[ $FORCE_WORKTREE -eq 1 ]]; then
          git worktree remove --force "$wt_abs"
        else
          git worktree remove "$wt_abs"
        fi
      fi
    else
      echo "Worktree path not found on disk (skipping): $wt_display"
    fi
  done

  echo "Pruning worktree metadata"
  if [[ $DRY_RUN -eq 0 ]]; then
    git worktree prune
  fi
fi

# Delete local branches for this issue.
branches=()
while IFS= read -r b; do
  [[ -n "$b" ]] && branches+=("$b")
done < <(git for-each-ref --format='%(refname:short)' "refs/heads/task/${N}-"'*')

if [[ ${#branches[@]} -eq 0 ]]; then
  echo "No local branches found under: task/${N}-*"
else
  current_branch="$(git symbolic-ref --quiet --short HEAD 2>/dev/null || true)"
  for b in "${branches[@]}"; do
    if [[ -n "$current_branch" && "$b" == "$current_branch" ]]; then
      echo "Skipping current branch: $b (switch away from it to delete)"
      continue
    fi
    if [[ $FORCE_BRANCHES -eq 0 ]]; then
      if git merge-base --is-ancestor "$b" "$base_branch" >/dev/null 2>&1; then
        echo "Deleting merged branch: $b (merged into $base_branch)"
        [[ $DRY_RUN -eq 0 ]] && git branch -d "$b"
      else
        echo "Keeping unmerged branch: $b (not merged into $base_branch)"
      fi
    else
      echo "Force deleting branch: $b"
      [[ $DRY_RUN -eq 0 ]] && git branch -D "$b"
    fi
  done
fi

echo "Done."
