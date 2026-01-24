# GAP-P1-004: 导出菜单（Markdown/Word/PDF）

Status: pending

## Goal

添加导出功能菜单入口，暴露后端已有的导出能力。

## Dependencies

- 无

## Expected File Changes

| 操作 | 文件路径 |
|------|---------|
| Update | `writenow-core/src/browser/writenow-core-contribution.ts` |
| Add | `writenow-core/src/browser/export-dialog.tsx` |

## Acceptance Criteria

- [ ] File 菜单添加 Export 子菜单
- [ ] 导出选项：Markdown（.md）
- [ ] 导出选项：Word（.docx）
- [ ] 导出选项：PDF（.pdf）
- [ ] 点击导出弹出保存路径选择对话框
- [ ] 导出成功显示成功通知
- [ ] 导出失败显示错误信息
- [ ] 无文档打开时导出选项禁用

## Tests

- [ ] E2E：导出 Markdown 文件内容正确
- [ ] E2E：导出 Word 文件可正常打开
- [ ] E2E：导出 PDF 文件可正常打开
