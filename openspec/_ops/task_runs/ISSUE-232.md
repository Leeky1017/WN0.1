# ISSUE-232
- Issue: #232
- Branch: task/232-simplify-layout
- PR: https://github.com/Leeky1017/WN0.1/pull/233

## Goal
- 修复 Maximize 按钮点击后黑屏问题
- 移除不必要的底部面板（版本历史/组件）

## Plan
- 禁用 `tabSetEnableMaximize` 防止布局崩溃
- 移除底部面板
- 升级 LAYOUT_VERSION 强制清除旧缓存

## Runs
### 2026-01-26 15:48 问题诊断
- 用户报告：点击 Maximize 按钮导致黑屏
- 用户报告："组件" 标签是测试用的，不应该存在
- 用户报告："版本历史" 位置不合理

### 2026-01-26 15:49 修复
- Command: `vim writenow-frontend/src/components/layout/layout-config.ts`
- 添加 `tabSetEnableMaximize: false` 禁用最大化按钮
- 移除底部面板配置（版本历史/组件）
- 升级 LAYOUT_VERSION 到 3
- Command: `npm run build`
- Key output: `✓ built in 3.55s`
- Evidence: 浏览器截图显示简化后的布局（无底部面板，无最大化按钮）
