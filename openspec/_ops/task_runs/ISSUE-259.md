# ISSUE-259

- Issue: #259
- Branch: task/259-frontend-refactor
- PR: https://github.com/Leeky1017/WN0.1/pull/260

## Plan

- 基于 `writenow-artistic-demo` 重建前端，建立干净的「Theia 后端 + 独立前端」架构
- 集成功能代码（RPC、Zustand、TipTap、文件树、AI 面板）
- 清理旧代码（`figma参考/`、`writenow-artistic-demo/`）

## Runs

### 2026-01-27 Phase 1: 提取功能代码

- Command: `mkdir -p backup/writenow-frontend-logic && cp -r writenow-frontend/src/{lib,stores,features,components/editor,types} backup/writenow-frontend-logic/`
- Key output: 功能代码备份到 `backup/writenow-frontend-logic/`
- Evidence: `backup/writenow-frontend-logic/` 目录

### 2026-01-27 Phase 2: 目录操作 + 依赖 + Electron 配置

- Command: `mv writenow-artistic-demo writenow-frontend` (Demo 升级为新前端)
- Key output: 新 `writenow-frontend/` 基于 Demo 样式
- Evidence: 
  - `writenow-frontend/package.json` 已添加 TipTap、Zustand、RPC 等依赖
  - `writenow-frontend/electron/` 复制自旧前端

### 2026-01-27 Phase 3: 集成功能代码

- Commands:
  - `cp -r backup/writenow-frontend-logic/lib/rpc src/lib/`
  - `cp -r backup/writenow-frontend-logic/stores src/`
  - `cp -r backup/writenow-frontend-logic/components/editor src/components/`
  - `cp -r backup/writenow-frontend-logic/features/* src/features/`
- Key output: 功能代码集成到新前端，保留 Demo 样式
- Evidence: 
  - `writenow-frontend/src/lib/rpc/` (RPC 通信层)
  - `writenow-frontend/src/stores/` (Zustand 状态管理)
  - `writenow-frontend/src/components/editor/` (TipTap 编辑器)

### 2026-01-27 Phase 4: 清理旧代码

- Commands:
  - `rm -rf figma参考/`
  - `rm -rf writenow-artistic-demo/`
- Key output: 旧代码清理完成
- Evidence: 目录已删除

### 2026-01-27 Phase 5: 更新文档

- Command: 更新 `openspec/specs/writenow-spec/spec.md`
- Key output: 前端基线描述更新为基于 Demo 的新架构
- Evidence: `openspec/specs/writenow-spec/spec.md` 修改

### 2026-01-27 GitHub 交付

- Command: `gh issue create -t "feat: 前端架构重构 - Demo 升级为主前端"`
- Key output: `https://github.com/Leeky1017/WN0.1/issues/259`
- Evidence: Issue #259 创建成功
