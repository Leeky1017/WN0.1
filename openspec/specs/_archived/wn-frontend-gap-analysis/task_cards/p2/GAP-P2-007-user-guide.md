# GAP-P2-007: 用户指南

Status: done
Issue: #188
PR: https://github.com/Leeky1017/WN0.1/pull/189

## Goal

创建嵌入式用户指南，帮助用户了解应用功能。

## Dependencies

- 无

## Expected File Changes

| 操作 | 文件路径 |
|------|---------|
| Add | `writenow-core/src/browser/help-widget.tsx` |
| Add | `writenow-core/src/browser/style/help.css` |
| Add | `writenow-core/assets/docs/*.md` |
| Update | `writenow-core/src/browser/writenow-core-contribution.ts` |

## Acceptance Criteria

- [ ] Help > User Guide 打开用户指南
- [ ] 指南按功能模块组织
- [ ] 支持搜索指南内容
- [ ] Markdown 格式渲染
- [ ] 支持 i18n（中英文版本）

## Tests

- [ ] E2E：打开用户指南显示内容
- [ ] E2E：搜索返回匹配章节
