# GAP-P3-001: 上下文调试器

Status: pending

## Goal

创建上下文调试器面板，方便开发者查看 AI 上下文组装情况。

## Dependencies

- 无

## Expected File Changes

| 操作 | 文件路径 |
|------|---------|
| Add | `writenow-core/src/browser/context-debugger-widget.tsx` |
| Add | `writenow-core/src/browser/style/context-debugger.css` |
| Update | `writenow-core/src/browser/writenow-core-frontend-module.ts` |
| Update | `writenow-core/src/browser/writenow-core-contribution.ts` |

## Acceptance Criteria

- [ ] View > Developer > Context Debugger 打开调试器
- [ ] 显示当前上下文层级结构
- [ ] 显示 token 预算使用情况
- [ ] 显示每层上下文来源和内容摘要
- [ ] 实时更新

## Tests

- [ ] E2E：打开调试器显示上下文信息
