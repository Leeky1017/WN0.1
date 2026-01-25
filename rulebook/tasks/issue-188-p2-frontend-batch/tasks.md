# Tasks: P2 Frontend Features Batch

## P2-001: 可访问性基础

- [ ] 添加 `--wn-focus-ring` token 到 `tokens.css`
- [ ] 审计所有 CSS 文件，移除 `outline: none` 或添加替代 focus 样式
- [ ] 为所有按钮添加 `aria-label`
- [ ] 为面板添加 `role="region"`

## P2-002: 高对比度主题

- [ ] 创建 `style/theme-high-contrast.css`
- [ ] 修改 `settings-widget.tsx` 添加主题选择功能
- [ ] 确保所有文本对比度 >= 4.5:1

## P2-003: 角色管理面板

- [ ] 创建 `character-widget.tsx`
- [ ] 创建 `character-contribution.ts`
- [ ] 实现列表/新建/编辑/删除角色
- [ ] 调用 `character:list/create/update/delete` IPC

## P2-004: 术语表管理

- [ ] 创建 `terminology-widget.tsx`
- [ ] 创建 `terminology-contribution.ts`
- [ ] 实现列表/新建/编辑/删除术语
- [ ] 支持搜索

## P2-005: 写作统计面板

- [ ] 创建 `stats-widget.tsx`
- [ ] 创建 `stats-contribution.ts`
- [ ] 显示总字数、总时间
- [ ] 日/周/月统计图表

## P2-006: 错误日志查看器

- [ ] 创建 `log-viewer-widget.tsx`
- [ ] 创建 `log-viewer-contribution.ts`
- [ ] 显示最近日志
- [ ] 按级别过滤
- [ ] 支持导出

## P2-007: 用户指南

- [ ] 创建 `user-guide-widget.tsx`
- [ ] 创建 `user-guide-contribution.ts`
- [ ] 创建 `assets/docs/getting-started.md`
- [ ] Markdown 渲染
- [ ] 支持搜索

## P2-008: 自动更新 UI

- [ ] 创建 `update-notification.tsx`
- [ ] 创建 `update-contribution.ts`
- [ ] 启动时调用 `update:check` IPC
- [ ] 有新版本显示通知
- [ ] 下载进度显示

## Integration

- [ ] 在 `writenow-core-frontend-module.ts` 注册所有新组件
- [ ] 在 `style/index.css` 导入新样式
- [ ] 构建成功
- [ ] Lint 通过
