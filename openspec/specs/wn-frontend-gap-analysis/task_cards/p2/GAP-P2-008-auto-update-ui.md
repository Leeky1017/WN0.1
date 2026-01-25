# GAP-P2-008: 自动更新 UI

Status: done
Issue: #188
PR: https://github.com/Leeky1017/WN0.1/pull/189

## Goal

实现自动更新检查和下载 UI，暴露后端 update 模块能力。

## Dependencies

- 无

## Expected File Changes

| 操作 | 文件路径 |
|------|---------|
| Add | `writenow-core/src/browser/update-notification.tsx` |
| Update | `writenow-core/src/browser/writenow-core-frontend-module.ts` |

## Acceptance Criteria

- [ ] 启动时自动检查更新
- [ ] 有新版本时显示通知
- [ ] 通知显示版本号和更新内容摘要
- [ ] 可选择"立即更新"或"稍后提醒"
- [ ] 下载更新时显示进度
- [ ] 下载完成后提示重启

## Tests

- [ ] E2E：模拟有新版本时显示通知
- [ ] E2E：点击更新开始下载
