# GAP-P1-007: 关于对话框

Status: pending

## Goal

创建关于对话框，显示应用版本信息和致谢。

## Dependencies

- 无

## Expected File Changes

| 操作 | 文件路径 |
|------|---------|
| Add | `writenow-core/src/browser/about-dialog.tsx` |
| Add | `writenow-core/src/browser/style/about.css` |
| Update | `writenow-core/src/browser/writenow-core-contribution.ts` |

## Acceptance Criteria

- [ ] Help > About WriteNow 打开关于对话框
- [ ] 显示应用名称：WriteNow
- [ ] 显示版本号：从 package.json 读取
- [ ] 显示构建日期
- [ ] 显示 Theia 版本
- [ ] 显示开源许可证信息
- [ ] 显示主要依赖致谢

## Tests

- [ ] E2E：打开关于对话框显示版本号
- [ ] E2E：版本号与 package.json 一致
