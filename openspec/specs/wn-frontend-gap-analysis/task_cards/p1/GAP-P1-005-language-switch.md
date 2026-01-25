# GAP-P1-005: 语言切换 UI

Status: done
Issue: #182
PR: https://github.com/Leeky1017/WN0.1/pull/183

## Goal

在设置面板中添加界面语言切换功能，利用已有的 i18n 支持。

## Dependencies

- GAP-P0-001（设置面板基础）

## Expected File Changes

| 操作 | 文件路径 |
|------|---------|
| Update | `writenow-core/src/browser/settings-widget.tsx` |

## Acceptance Criteria

- [ ] 设置面板"语言"分类可选择界面语言
- [ ] 支持语言：简体中文、English
- [ ] 切换语言后界面文本实时更新
- [ ] 语言设置持久化存储
- [ ] 重启应用后保持已选语言

## Tests

- [ ] E2E：切换语言后界面文本变更
- [ ] E2E：重启后语言设置保留
