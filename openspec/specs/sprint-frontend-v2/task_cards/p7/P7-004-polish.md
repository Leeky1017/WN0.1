# P7-004: 细节打磨

## 元信息

| 字段 | 值 |
|------|-----|
| ID | P7-004 |
| Phase | 7 - 打磨与优化 |
| 优先级 | P1 |
| 状态 | Pending |
| 依赖 | P7-001 |

## 必读前置（执行前必须阅读）

- [ ] `design/01-design-tokens.md` — Design Tokens 规范
- [ ] `design/02-tech-stack.md` — **技术选型（禁止替换）**

## 目标

打磨 UI 细节，确保 hover/focus/active 效果一致且精美。

## 任务清单

- [ ] 审查所有 hover 效果
- [ ] 审查所有 focus 效果
- [ ] 审查所有 active/pressed 效果
- [ ] 统一阴影使用
- [ ] 统一边框使用
- [ ] 优化图标对齐
- [ ] 优化文字间距
- [ ] 添加微交互（如按钮涟漪效果）

## 验收标准

- [ ] 所有交互状态有反馈
- [ ] 效果风格统一
- [ ] 达到 Cursor/Linear 级别

## 产出

- 优化后的组件样式
- 设计审查报告

## 技术细节

### Hover 效果规范

```css
/* 背景变化 */
.hoverable {
  transition: background-color var(--duration-fast) var(--ease-out);
}
.hoverable:hover {
  background-color: var(--bg-hover);
}

/* 颜色变化 */
.link {
  transition: color var(--duration-fast) var(--ease-out);
}
.link:hover {
  color: var(--accent-hover);
}

/* 缩放效果（用于图标按钮） */
.icon-button {
  transition: transform var(--duration-fast) var(--ease-out);
}
.icon-button:hover {
  transform: scale(1.05);
}
```

### Active/Pressed 效果

```css
.button {
  transition: transform var(--duration-fast) var(--ease-out);
}
.button:active {
  transform: scale(0.98);
}
```

### 阴影规范

```css
:root {
  --shadow-sm: 0 1px 2px rgba(0, 0, 0, 0.3);
  --shadow-md: 0 4px 8px rgba(0, 0, 0, 0.3);
  --shadow-lg: 0 8px 16px rgba(0, 0, 0, 0.4);
  --shadow-xl: 0 16px 32px rgba(0, 0, 0, 0.5);
}

/* 使用场景 */
.dropdown { box-shadow: var(--shadow-md); }
.dialog { box-shadow: var(--shadow-lg); }
.command-palette { box-shadow: var(--shadow-xl); }
```

### 审查清单

| 组件 | Hover | Focus | Active | 通过 |
|------|-------|-------|--------|------|
| Button | 背景变亮 | 蓝色边框 | 轻微缩小 | |
| Input | 边框变亮 | 蓝色边框 | - | |
| Tab | 背景变亮 | 下划线 | 选中态 | |
| Tree Item | 背景变亮 | 蓝色边框 | 选中态 | |
| Menu Item | 背景变亮 | 蓝色边框 | 选中态 | |
| Card | 边框变亮 | 蓝色边框 | - | |

### 图标对齐

```tsx
// 使用 flex 确保图标和文字对齐
<button className="flex items-center gap-2">
  <Icon size={16} className="shrink-0" />
  <span>按钮文字</span>
</button>
```

### 文字间距规范

```css
/* 标题 */
.heading { letter-spacing: -0.02em; }

/* 正文 */
.body { letter-spacing: 0; }

/* 小号文字 */
.caption { letter-spacing: 0.02em; }
```
