# Proposal: P2 Frontend Features Batch

## Summary

实现前端缺口分析规范（wn-frontend-gap-analysis/spec.md）中的 P2 优先级功能。

## Impact

- 可访问性改进：所有用户（包括使用辅助技术的用户）都能更好地使用 WriteNow
- 高对比度主题：满足视觉障碍用户需求
- 新增 6 个 Widget：增强专业用户体验

## Changes

### P2-001: 可访问性基础
- 文件：`writenow-core/src/browser/style/tokens.css` - 添加 `--wn-focus-ring` token
- 文件：`writenow-core/src/browser/style/*.css` - 移除 `outline: none` 或添加替代样式
- 文件：所有 Widget 组件 - 添加 `aria-label` 和 `role` 属性

### P2-002: 高对比度主题
- 新建：`writenow-core/src/browser/style/theme-high-contrast.css`
- 修改：`settings-widget.tsx` - 添加主题选择

### P2-003: 角色管理面板
- 新建：`writenow-core/src/browser/character/character-widget.tsx`
- 新建：`writenow-core/src/browser/character/character-contribution.ts`

### P2-004: 术语表管理
- 新建：`writenow-core/src/browser/terminology/terminology-widget.tsx`
- 新建：`writenow-core/src/browser/terminology/terminology-contribution.ts`

### P2-005: 写作统计面板
- 新建：`writenow-core/src/browser/stats/stats-widget.tsx`
- 新建：`writenow-core/src/browser/stats/stats-contribution.ts`

### P2-006: 错误日志查看器
- 新建：`writenow-core/src/browser/log-viewer/log-viewer-widget.tsx`
- 新建：`writenow-core/src/browser/log-viewer/log-viewer-contribution.ts`

### P2-007: 用户指南
- 新建：`writenow-core/src/browser/user-guide/user-guide-widget.tsx`
- 新建：`writenow-core/assets/docs/getting-started.md`

### P2-008: 自动更新 UI
- 新建：`writenow-core/src/browser/update/update-notification.tsx`
- 新建：`writenow-core/src/browser/update/update-contribution.ts`

## References

- 规范：`openspec/specs/wn-frontend-gap-analysis/spec.md`
- IPC 契约：`src/types/ipc-generated.ts`
