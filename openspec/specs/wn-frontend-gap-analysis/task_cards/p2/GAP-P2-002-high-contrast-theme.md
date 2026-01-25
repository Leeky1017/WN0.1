# GAP-P2-002: 高对比度主题

Status: done
Issue: #188
PR: https://github.com/Leeky1017/WN0.1/pull/189

## Goal

创建高对比度主题变体，满足视觉障碍用户需求。

## Dependencies

- GAP-P2-001（可访问性基础）

## Expected File Changes

| 操作 | 文件路径 |
|------|---------|
| Add | `writenow-core/src/browser/style/theme-high-contrast.css` |
| Update | `writenow-core/src/browser/style/index.css` |
| Update | `writenow-core/src/browser/settings-widget.tsx` |

## Acceptance Criteria

- [ ] 新增高对比度主题选项
- [ ] 所有文本对比度符合 WCAG AA（4.5:1）
- [ ] 边框和分隔线清晰可见
- [ ] 检测系统高对比度设置自动切换
- [ ] 可在设置面板手动选择

## Tests

- [ ] 自动化：对比度检查所有文本
- [ ] 手动测试：视觉验证高对比度效果
