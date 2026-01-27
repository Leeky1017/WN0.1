# sprint-write-mode-ide delta (ISSUE-287 closeout)

本任务仅做 **OpenSpec 收口/同步**，不改实现行为。

## Delta requirements

### D1: Task cards 必须回填完成元信息并勾选验收

- **MUST** 对应 task cards 必须补齐：
  - `Status: done`
  - `Issue: #281`
  - `PR: https://github.com/Leeky1017/WN0.1/pull/286`
  - `RUN_LOG: openspec/_ops/task_runs/ISSUE-281.md`
- **MUST** 将验收清单从 `- [ ]` 更新为 `- [x]`（不得遗漏）。

### D2: writenow-spec 必须同步路线图/当前状态

- **MUST** 在 `openspec/specs/writenow-spec/spec.md` 中记录 Write Mode SSOT 的完成事实（引用 Issue/PR/RUN_LOG），避免规范漂移。

