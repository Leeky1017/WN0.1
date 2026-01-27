# ISSUE-267
- Issue: #267
- Branch: task/267-archive-old-specs
- PR: https://github.com/Leeky1017/WN0.1/pull/268

## Plan
- 归档 15 个旧 Sprint/Remediation specs 到 `_archived/`
- 删除不合规的 `sprint-frontend-polish/`
- 更新 writenow-spec 路线图引用

## Runs

### 2026-01-27 13:50 执行归档操作

- Command: `mkdir -p openspec/specs/_archived && mv openspec/specs/{skill-system-v2,sprint-*,wn-*} openspec/specs/_archived/`
- Key output: 15 个目录已移动到 `_archived/`
- Evidence: `openspec/specs/_archived/`

归档的 specs：
1. skill-system-v2
2. sprint-1-editor
3. sprint-2-ai
4. sprint-2.5-context-engineering
5. sprint-3-rag
6. sprint-4-release
7. sprint-5-project
8. sprint-6-experience
9. sprint-7-cloud
10. sprint-frontend-v2
11. sprint-ide-advanced
12. sprint-theia-migration
13. wn-frontend-deep-remediation
14. wn-frontend-gap-analysis
15. wn-theia-ui-remediation

- Command: `rm -rf openspec/specs/sprint-frontend-polish`
- Key output: 已删除（刚创建但不符合规范）
- Evidence: N/A

保留的活跃 specs：
- `api-contract/`（IPC 契约）
- `writenow-spec/`（项目主规范）
