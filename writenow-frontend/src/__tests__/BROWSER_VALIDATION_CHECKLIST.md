# Stage 1 浏览器验证清单

此清单用于在浏览器 DevTools 中手动验证设计系统的正确性。

## 1. CSS 变量验证

打开 Chrome DevTools → Elements → Computed → 筛选 CSS 变量

### Dark Theme 验证
- [ ] `--bg-base` = `#09090b`
- [ ] `--bg-surface` = `#0f0f11`
- [ ] `--bg-elevated` = `#18181b`
- [ ] `--fg-default` = `#fafafa`
- [ ] `--fg-muted` = `#a1a1aa`
- [ ] `--accent-default` = `#3b82f6`
- [ ] `--border-default` = `rgba(255, 255, 255, 0.08)`

### Light Theme 验证
切换到 Light Theme (`data-theme="light"`)
- [ ] `--bg-base` = `#ffffff`
- [ ] `--bg-surface` = `#fafafa`
- [ ] `--bg-elevated` = `#ffffff`
- [ ] `--fg-default` = `#18181b`
- [ ] `--fg-muted` = `#52525b`
- [ ] `--accent-default` = `#2563eb`
- [ ] `--border-default` = `#e4e4e7`

## 2. 主题切换验证

在控制台执行:
```js
// 切换到 Light
document.documentElement.setAttribute('data-theme', 'light');

// 切换到 Dark
document.documentElement.setAttribute('data-theme', 'dark');

// 重置为默认
document.documentElement.removeAttribute('data-theme');
```

- [ ] 主题切换无闪烁
- [ ] 所有组件颜色正确更新
- [ ] 滚动条样式正确
- [ ] 选中文本样式正确

## 3. 组件状态验证

### Button
- [ ] Hover 状态背景色变化
- [ ] Active 状态背景色变化
- [ ] Focus 状态有焦点环
- [ ] Disabled 状态半透明，不可点击
- [ ] Loading 状态显示 spinner

### Input
- [ ] Focus 状态有蓝色边框
- [ ] Error 状态有红色边框
- [ ] Disabled 状态半透明
- [ ] Placeholder 颜色正确

### IconButton
- [ ] Hover 状态背景色变化
- [ ] Active 状态图标加粗
- [ ] Tooltip 正常显示

### Badge
- [ ] 5 种 variant 颜色都正确
- [ ] 文字大写、字间距正确

### Avatar
- [ ] 3 种 size 尺寸正确
- [ ] Fallback 显示首字母

### Tooltip
- [ ] 显示/隐藏动画流畅
- [ ] 定位正确（上下左右）

### Popover
- [ ] Glass 效果正确
- [ ] 显示/隐藏动画流畅
- [ ] 阴影正确

## 4. 性能验证

使用 Chrome DevTools Performance 面板:
- [ ] 主题切换 < 100ms
- [ ] 动画帧率 >= 60fps
- [ ] 无 Layout Thrashing

## 5. 无障碍验证

- [ ] 所有按钮可用键盘 Tab 聚焦
- [ ] Focus 状态可见
- [ ] 对比度满足 WCAG AA (4.5:1)
- [ ] Divider 有 aria-orientation

---

## 验证结果

日期: ____________

测试人员: ____________

- [ ] Dark Theme 验证通过
- [ ] Light Theme 验证通过
- [ ] 主题切换验证通过
- [ ] 组件状态验证通过
- [ ] 性能验证通过
- [ ] 无障碍验证通过

备注:
