# Delta Spec: issue-321-e2e-write-mode-flake-fixes

## Context

- CI 失败 run（证据）：`https://github.com/Leeky1017/WN0.1/actions/runs/21420469086`
- 现象：
  - WM-003：点击 Accept 后 `data-testid="wm-review-root"` 仍可见（等待隐藏超时）。
  - WM-005：重启链路出现 `[backend] port 3000 in use; waiting for release` → `firstWindow` 超时 → worker teardown timeout（级联失败）。

## Delta Requirements

### Requirement: E2E backend lifecycle MUST be globally cleanable

- **WHEN** E2E 启动时使用随机 `WN_USER_DATA_DIR`
- **THEN** Electron main MUST 将 backend child PID 记录到一个稳定位置（例如 OS tmpdir）以便跨 test run 清理
- **AND THEN** 后续启动 MUST 能检测并终止 stale backend（避免 `port 3000 in use` 级联）
- **AND THEN** E2E teardown MUST 有界（bounded）且具备 SIGKILL 兜底，避免 Playwright worker teardown hang

### Requirement: Review Accept MUST clear review state deterministically

- **WHEN** 用户点击 Accept
- **THEN** Review UI（`wm-review-root`）MUST 被清理（消失/隐藏），并且编辑器可继续输入
- **AND THEN** 即使 editor diff session 丢失（remount / external sync），在“安全可判定”的前提下 Accept 仍 MUST 成功或给出明确错误码
- **AND THEN** 对 “Ctrl+A 全量选区” 场景，允许在文档未漂移时使用全量替换的兜底路径（确保确定性）

## Scenarios (Regression)

- **Scenario: WM-003** Accept 后 `wm-review-root` 消失且 autosave 最终到达 Saved。
- **Scenario: WM-005** force close 后 relaunch 能创建窗口（`firstWindow` 可得），且不会出现 port 3000 in use 的级联。

