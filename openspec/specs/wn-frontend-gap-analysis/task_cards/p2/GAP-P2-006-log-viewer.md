# GAP-P2-006: 错误日志查看器

Status: done
Issue: #188
PR: https://github.com/Leeky1017/WN0.1/pull/189

## Goal

创建错误日志查看器，方便调试和问题排查。

## Dependencies

- 无

## Expected File Changes

| 操作 | 文件路径 |
|------|---------|
| Add | `writenow-core/src/browser/log-viewer-widget.tsx` |
| Add | `writenow-core/src/browser/style/log-viewer.css` |
| Update | `writenow-core/src/browser/writenow-core-contribution.ts` |

## Acceptance Criteria

- [ ] Help > View Logs 打开日志查看器
- [ ] 显示最近错误和警告日志
- [ ] 支持按级别过滤（Error/Warn/Info/Debug）
- [ ] 支持搜索日志内容
- [ ] 支持导出日志文件
- [ ] 显示时间戳和来源模块

## Tests

- [ ] E2E：打开日志查看器显示日志
- [ ] E2E：过滤后只显示匹配级别
- [ ] E2E：导出日志文件成功
