# GAP-P0-002: API Key 与模型配置 UI

Status: done
Issue: #178
PR: https://github.com/Leeky1017/WN0.1/pull/179

## Goal

在设置面板中实现 AI Provider、API Key 和模型选择的配置界面。

## Dependencies

- GAP-P0-001（设置面板基础）

## Expected File Changes

| 操作 | 文件路径 |
|------|---------|
| Update | `writenow-core/src/browser/settings-widget.tsx` |
| Update | `writenow-core/src/browser/style/settings.css` |

## Acceptance Criteria

- [ ] 可选择 AI Provider（OpenAI、Claude 等）
- [ ] 可输入 API Key，支持显示/隐藏切换
- [ ] 可选择模型（下拉列表，根据 Provider 动态变化）
- [ ] 可配置 Temperature 和 Max Tokens
- [ ] 配置变更实时保存到 preferences
- [ ] API Key 使用安全存储
- [ ] 配置变更后 AI 服务使用新配置

## Tests

- [ ] E2E：配置 API Key 后可正常调用 AI
- [ ] E2E：切换模型后下一次请求使用新模型
- [ ] E2E：验证 API Key 不明文存储
