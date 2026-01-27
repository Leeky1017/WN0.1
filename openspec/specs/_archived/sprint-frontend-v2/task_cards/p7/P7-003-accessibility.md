# P7-003: 无障碍优化

## 元信息

| 字段 | 值 |
|------|-----|
| ID | P7-003 |
| Phase | 7 - 打磨与优化 |
| 优先级 | P1 |
| 状态 | Pending |
| 依赖 | P6-004 |

## 必读前置（执行前必须阅读）

- [ ] `design/02-tech-stack.md` — **技术选型（Radix UI 无障碍原语）**
- [ ] `spec.md` 无障碍 Requirement — WCAG 2.1 AA 标准

## 目标

优化无障碍支持，确保键盘可完全操作，符合 WCAG 2.1 AA 标准。

## 任务清单

- [ ] 审查所有组件的键盘导航
- [ ] 添加 ARIA 标签
- [ ] 确保焦点可见
- [ ] 确保颜色对比度符合标准
- [ ] 添加跳过导航链接
- [ ] 测试屏幕阅读器兼容性
- [ ] 实现 High Contrast 主题

## 验收标准

- [ ] 所有功能可键盘操作
- [ ] 焦点状态清晰可见
- [ ] 颜色对比度 ≥ 4.5:1
- [ ] 屏幕阅读器可正确读取

## 产出

- 无障碍审查报告
- 优化后的组件
- High Contrast 主题

## 技术细节

### 焦点样式

```css
/* 全局焦点样式 */
*:focus-visible {
  outline: 2px solid var(--accent);
  outline-offset: 2px;
}

/* 移除鼠标点击时的焦点框 */
*:focus:not(:focus-visible) {
  outline: none;
}
```

### ARIA 标签示例

```tsx
// 文件树
<nav aria-label="文件浏览器">
  <ul role="tree" aria-label="项目文件">
    <li role="treeitem" aria-expanded={isExpanded}>
      {/* ... */}
    </li>
  </ul>
</nav>

// AI 面板
<aside aria-label="AI 助手">
  <div role="log" aria-live="polite" aria-label="对话历史">
    {messages.map(msg => (
      <div role="article" aria-label={`${msg.role}消息`}>
        {msg.content}
      </div>
    ))}
  </div>
</aside>

// 编辑器状态
<div role="status" aria-live="polite">
  {saveStatus === 'saving' ? '正在保存...' : '已保存'}
</div>
```

### 键盘导航检查清单

| 组件 | Tab | Arrow | Enter | Esc | 通过 |
|------|-----|-------|-------|-----|------|
| 文件树 | ✓ | 上下展开 | 打开 | - | |
| Tab 栏 | ✓ | 左右切换 | 选择 | - | |
| 命令面板 | ✓ | 上下选择 | 执行 | 关闭 | |
| AI 输入框 | ✓ | - | 发送 | - | |
| 设置面板 | ✓ | 上下切换 | 确认 | 关闭 | |

### High Contrast 主题

```css
/* themes/high-contrast.css */
[data-theme='high-contrast'] {
  --bg-app: #000000;
  --bg-sidebar: #000000;
  --bg-panel: #000000;
  
  --text-primary: #ffffff;
  --text-secondary: #ffffff;
  
  --border-subtle: #ffffff;
  --border-default: #ffffff;
  
  --accent: #ffff00;
}
```

### 自动化测试

```bash
# 使用 axe-core 测试
npx @axe-core/cli http://localhost:5173

# 使用 pa11y 测试
npx pa11y http://localhost:5173
```
