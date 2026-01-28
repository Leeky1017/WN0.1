# ISSUE-327
- Issue: #327
- Branch: task/327-p2-002-graphiti-eval
- PR: https://github.com/Leeky1017/WN0.1/pull/328

## Plan
- 完成 SQLite 图模拟 PoC：样例数据 + 查询（search / 1-hop / 2-hop / time filter）+ 基准延迟统计（P50/P95）。
- 调研 Graphiti（Zep）能力与依赖（尤其 Neo4j），评估对桌面端分发/运维/启动复杂度的影响与缓解策略。
- 输出可复现评估报告并收口 task card / Rulebook task；跑通 openspec validate 等门禁并记录证据。

## Runs

### 2026-01-28 13:20 create issue
- Command: `gh issue create -t "[OPEN-SOURCE-OPT-P2] P2-002: Graphiti 评估（SQLite 图模拟 PoC）" -b "..."`
- Key output: `https://github.com/Leeky1017/WN0.1/issues/327`
- Evidence: Issue #327；task card `openspec/specs/sprint-open-source-opt/task_cards/p2/P2-002-graphiti-eval.md`

### 2026-01-28 13:22 worktree
- Command: `git fetch origin && git worktree add -b "task/327-p2-002-graphiti-eval" ".worktrees/issue-327-p2-002-graphiti-eval" origin/main`
- Key output: `Preparing worktree (new branch 'task/327-p2-002-graphiti-eval')`
- Evidence: `.worktrees/issue-327-p2-002-graphiti-eval/`

### 2026-01-28 13:23 rulebook task create
- Command: `rulebook task create issue-327-p2-002-graphiti-eval`
- Key output: `✅ Task issue-327-p2-002-graphiti-eval created successfully`
- Evidence: `rulebook/tasks/issue-327-p2-002-graphiti-eval/`

### 2026-01-28 13:29 theia deps install
- Command: `npm run theia:install`
- Key output: `yarn --cwd writenow-theia install --frozen-lockfile` → `Done in 51.19s.`
- Evidence: `writenow-theia/node_modules/`, `writenow-theia/writenow-core/lib/`

### 2026-01-28 13:30 sqlite graph simulation PoC
- Command: `node writenow-theia/writenow-core/scripts/p2-002-sqlite-graph-poc.cjs`
- Key output: `entitySearch P50≈0.028ms / P95≈0.067ms; expand(2-hop) P50≈0.079ms / P95≈0.174ms; DB size≈224KB`
- Evidence:
  - PoC script: `writenow-theia/writenow-core/scripts/p2-002-sqlite-graph-poc.cjs`
  - Dataset: `writenow-theia/writenow-core/scripts/p2-002-sqlite-graph-poc.dataset.json`
  - Report: `rulebook/tasks/issue-327-p2-002-graphiti-eval/evidence/graphiti-eval.md`

### 2026-01-28 13:32 graphiti research (deps + ops)
- Command: research Graphiti docs + README
- Key output: Graphiti（Zep）为 Python 3.10+；primary backend 为 Neo4j 5.26+（亦支持 FalkorDB/Kuzu/Neptune 等）；默认依赖外部 LLM/Embedding（建议 Structured Output）
- Evidence:
  - `https://github.com/getzep/graphiti`
  - `https://help.getzep.com/graphiti/graphiti/installation`
  - `https://help.getzep.com/graphiti/configuration/graph-db-configuration`

### 2026-01-28 13:34 rulebook validate
- Command: `rulebook task validate issue-327-p2-002-graphiti-eval`
- Key output: `✅ Task issue-327-p2-002-graphiti-eval is valid` (warning: `No spec files found`)
- Evidence: `rulebook/tasks/issue-327-p2-002-graphiti-eval/`

### 2026-01-28 13:34 openspec validate (strict)
- Command: `npx -y @fission-ai/openspec@0.17.2 validate --specs --strict --no-interactive`
- Key output: `Totals: 5 passed, 0 failed (5 items)`
- Evidence: `openspec/specs/sprint-open-source-opt/**`, `openspec/specs/writenow-spec/spec.md`

### 2026-01-28 13:35 lint (CI parity)
- Command: `npm run lint`
- Key output: `contract:check` + `theia:install` + `writenow-core build` succeeded
- Evidence: `writenow-theia/writenow-core/lib/` (tsc output), command output

### 2026-01-28 13:36 create PR
- Command: `gh pr create --title "[OPEN-SOURCE-OPT-P2] P2-002: Graphiti eval + SQLite graph PoC (#327)" --body "Closes #327 ..."`
- Key output: `https://github.com/Leeky1017/WN0.1/pull/328`
- Evidence: PR #328

### 2026-01-28 13:37 closeout (task card + writenow-spec)
- Command: update task card + writenow-spec + run log PR link
- Key output: mark `P2-002` as done and add canonical report path under `openspec/specs/sprint-open-source-opt/evidence/graphiti-eval.md`
- Evidence:
  - `openspec/specs/sprint-open-source-opt/task_cards/p2/P2-002-graphiti-eval.md`
  - `openspec/specs/sprint-open-source-opt/evidence/graphiti-eval.md`
  - `openspec/specs/writenow-spec/spec.md`
