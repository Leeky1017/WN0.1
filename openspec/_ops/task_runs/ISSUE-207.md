# ISSUE-207
- Issue: #207
- Branch: task/207-frontend-refactor-spec
- PR: https://github.com/Leeky1017/WN0.1/pull/208

## Plan
- 添加前端重构规范文档 `前端重构任务内容.md`
- 修复根目录 `tsconfig.json` 的类型定义报错

## Runs
### 2026-01-25 16:10 创建规范文档
- Command: `git add 前端重构任务内容.md && git commit`
- Key output: `1 file changed, 713 insertions(+)`
- Evidence: `前端重构任务内容.md`

### 2026-01-25 16:15 修复 tsconfig.json
- Command: 移除 `types` 字段中不存在的类型定义
- Key output: 移除 `react`, `react-dom`, `node`, `vite/client`, `vitest/globals`
- Evidence: `tsconfig.json`
- Reason: 根目录未安装这些类型定义包，导致 TypeScript 报错
