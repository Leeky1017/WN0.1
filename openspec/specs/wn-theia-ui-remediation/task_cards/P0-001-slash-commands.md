# Task Card: P0-001 斜杠命令系统

Issue: #199

## Summary

实现类 Cursor 的斜杠命令系统，支持 /polish、/expand、/outline、/style 快捷命令。

## Acceptance Criteria

- [ ] 输入 "/" 触发弹出菜单
- [ ] 菜单显示 4 个命令：polish（润色）、expand（扩写）、outline（大纲）、style（改写风格）
- [ ] 支持键盘导航：↑↓ 选择，Enter 确认，Esc 关闭
- [ ] 支持模糊搜索过滤（输入 /pol 只显示 polish）
- [ ] 选择命令后自动设置对应 skillId 并发送

## Implementation Notes

1. 创建 `SlashCommandMenu` 组件
2. 命令映射到现有 skill 系统：
   - /polish → pkg.writenow.builtin/polish
   - /expand → pkg.writenow.builtin/expand
   - /outline → pkg.writenow.builtin/outline（若不存在则 placeholder）
   - /style → pkg.writenow.builtin/style（若不存在则 placeholder）
3. 使用 CSS 变量实现样式
