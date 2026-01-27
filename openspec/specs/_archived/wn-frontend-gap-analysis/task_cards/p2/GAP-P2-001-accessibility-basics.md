# GAP-P2-001: 可访问性基础（Focus/ARIA）

Status: done
Issue: #188
PR: https://github.com/Leeky1017/WN0.1/pull/189

## Goal

修复基础可访问性问题，包括 focus 指示器和 ARIA 标签。

## Dependencies

- 无

## Expected File Changes

| 操作 | 文件路径 |
|------|---------|
| Update | `writenow-core/src/browser/style/*.css` |
| Update | 所有 Widget 组件 |
| Update | `writenow-core/src/browser/style/tokens.css` |

## Acceptance Criteria

- [ ] 移除所有 `outline: none` 或提供可见替代方案
- [ ] 添加 `--wn-focus-ring` token
- [ ] 所有可交互元素有清晰的 focus 指示器
- [ ] 所有按钮添加 `aria-label`
- [ ] 面板添加 `role="region"` 和 `aria-labelledby`
- [ ] 对话框添加 `role="dialog"` 和 `aria-modal`
- [ ] 状态信息添加 `aria-live`
- [ ] Tab 键可在所有可交互元素间导航

## Tests

- [ ] 手动测试：Tab 导航覆盖所有可交互元素
- [ ] 手动测试：focus 指示器清晰可见
- [ ] 自动化：检查 ARIA 属性存在
