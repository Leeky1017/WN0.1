# GAP-P0-001: 设置面板基础

Status: done
Issue: #178
PR: https://github.com/Leeky1017/WN0.1/pull/179

## Goal

创建设置面板基础架构，作为所有用户配置的统一入口。

## Dependencies

- 无（P0 基础设施）

## Expected File Changes

| 操作 | 文件路径 |
|------|---------|
| Add | `writenow-core/src/browser/settings-widget.tsx` |
| Add | `writenow-core/src/browser/style/settings.css` |
| Update | `writenow-core/src/browser/writenow-core-frontend-module.ts` |
| Update | `writenow-core/src/browser/writenow-core-contribution.ts` |

## Acceptance Criteria

- [ ] 设置面板可通过 Cmd+, 打开
- [ ] 设置面板可通过 File > Preferences > Settings 打开
- [ ] 面板布局包含左侧导航和右侧配置区
- [ ] 导航分类：AI、编辑器、外观、快捷键、语言
- [ ] 面板样式使用 `--wn-*` design tokens
- [ ] 支持 i18n

## Tests

- [ ] E2E：通过快捷键打开设置面板
- [ ] E2E：通过菜单打开设置面板
- [ ] E2E：验证各分类导航可切换
