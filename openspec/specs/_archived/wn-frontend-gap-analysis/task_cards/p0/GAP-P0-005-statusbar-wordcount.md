# GAP-P0-005: 状态栏字数统计

Status: done
Issue: #178
PR: https://github.com/Leeky1017/WN0.1/pull/179

## Goal

在状态栏显示当前文档的字数统计，利用后端已有的 stats IPC。

## Dependencies

- 无

## Expected File Changes

| 操作 | 文件路径 |
|------|---------|
| Add | `writenow-core/src/browser/writenow-statusbar-contribution.ts` |
| Update | `writenow-core/src/browser/writenow-core-frontend-module.ts` |

## Acceptance Criteria

- [ ] 状态栏显示当前文档字数
- [ ] 格式：`1,234 字`（中文）或 `1,234 words`（英文）
- [ ] 编辑时实时更新（防抖 500ms）
- [ ] 无文档打开时不显示
- [ ] 点击字数可显示详细统计（字符数、段落数、阅读时间）

## Tests

- [ ] E2E：打开文档后状态栏显示字数
- [ ] E2E：编辑文档后字数更新
- [ ] E2E：关闭文档后字数隐藏
