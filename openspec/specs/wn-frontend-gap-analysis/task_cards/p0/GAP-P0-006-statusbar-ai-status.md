# GAP-P0-006: 状态栏 AI 状态

Status: pending

## Goal

在状态栏显示 AI 连接状态指示器，让用户了解 AI 服务是否可用。

## Dependencies

- GAP-P0-005（状态栏基础设施）

## Expected File Changes

| 操作 | 文件路径 |
|------|---------|
| Update | `writenow-core/src/browser/writenow-statusbar-contribution.ts` |

## Acceptance Criteria

- [ ] 状态栏左侧显示 AI 状态指示器
- [ ] 状态：已连接（绿色）、连接中（黄色）、未连接（红色）、请求中（蓝色）
- [ ] 点击状态指示器显示详细信息（Provider、Model、最后请求时间）
- [ ] 未配置 API Key 时显示"未配置"状态
- [ ] AI 请求失败时更新状态

## Tests

- [ ] E2E：配置 API Key 后状态变为已连接
- [ ] E2E：AI 请求中状态变为请求中
- [ ] E2E：请求完成后状态恢复为已连接
