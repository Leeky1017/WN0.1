# ISSUE-367

- Issue: #367
- Branch: task/367-variant-design-spec
- PR: https://github.com/Leeky1017/WN0.1/pull/368

## Plan

- 复制 DESIGN_SPEC.md 到 Variant/
- 复制 HTML 设计稿到 Variant/designs/
- 复制 plan 文件到 .cursor/plans/
- 删除 Zone.Identifier 文件（不提交）

## Runs

### 2026-01-29 21:58 创建 worktree

- Command: `git worktree add -b "task/367-variant-design-spec" ".worktrees/issue-367-variant-design-spec" origin/main`
- Key output: `HEAD is now at a03e0e8`
- Evidence: worktree 创建成功

### 2026-01-29 21:59 复制文件

- Command: `cp /home/leeky/work/WriteNow/Variant/DESIGN_SPEC.md Variant/`
- Command: `cp /home/leeky/work/WriteNow/Variant/*.html Variant/designs/`
- Command: `cp /home/leeky/.cursor/plans/variant_设计落地_edd79d84.plan.md .cursor/plans/`
- Key output: 文件复制成功
- Evidence: 
  - Variant/DESIGN_SPEC.md (3706 行，深色极简设计规范)
  - Variant/designs/*.html (11 个 HTML 设计稿)
  - .cursor/plans/variant_设计落地_edd79d84.plan.md
