# ISSUE-197

- Issue: #197
- Branch: task/197-frontend-qa
- PR: https://github.com/Leeky1017/WN0.1/pull/198

## Plan

- 安装依赖并构建 Theia 应用（browser mode）
- 使用 MCP Browser 工具逐一验证 P0-P3 共 30 个功能
- 记录 bug 和体验问题，生成 QA 报告

## Runs

### 2026-01-25 创建 worktree

- Command: `git worktree add -b "task/197-frontend-qa" ".worktrees/issue-197-frontend-qa" origin/main`
- Key output: `HEAD is now at e79e20c feat(theia): P3 AI Panel Feature Batch (#194) (#195)`
- Evidence: worktree created at `.worktrees/issue-197-frontend-qa`

### 2026-01-25 启动 Theia 应用

- Command: `cd writenow-theia && yarn install && yarn build:browser && yarn start:browser --hostname 0.0.0.0 --port 3000`
- Key output: `webpack 5.104.1 compiled successfully` / `HTTP 200 on localhost:3000`
- Evidence: 服务器成功启动，应用加载正常

### 2026-01-25 P0 功能验证

验证方法: 使用 MCP Browser (cursor-ide-browser) 自动化测试

**验证结果:**
| ID | 功能 | 状态 | 备注 |
|----|------|------|------|
| P0-001 | 设置面板 | PASS | 通过 F1 命令面板打开 |
| P0-002 | API Key 配置 | FAIL | writenow.ai 设置未注册 |
| P0-003 | 编辑器工具栏 | BLOCKED | 需验证 .md 文件场景 |
| P0-004 | 查找/替换 | PASS | Ctrl+F 功能完整 |
| P0-005 | 状态栏字数 | PASS | 显示 "0 字" |
| P0-006 | AI 状态 | PASS | 显示 "AI 未连接" |
| P0-007 | 崩溃恢复 | BLOCKED | 需模拟崩溃场景 |
| P0-008 | 最近文件 | PASS | Welcome 页面可见 |

**发现问题:**
- BUG-001: AI API Key 设置未注册到设置系统（严重）
- UX-001: Ctrl+, 快捷键无法打开设置面板

- Evidence: `openspec/_ops/verification/FRONTEND-QA-REPORT.md`
