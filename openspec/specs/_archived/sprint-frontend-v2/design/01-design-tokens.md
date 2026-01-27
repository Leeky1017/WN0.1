# Design Tokens

## CSS 变量定义

```css
:root {
  /* ===== 基础色板（Cursor 风格） ===== */
  --gray-50: #fafafa;
  --gray-100: #f4f4f5;
  --gray-200: #e4e4e7;
  --gray-300: #d4d4d8;
  --gray-400: #a1a1aa;
  --gray-500: #71717a;
  --gray-600: #52525b;
  --gray-700: #3f3f46;
  --gray-800: #27272a;
  --gray-850: #1f1f23;
  --gray-900: #18181b;
  --gray-950: #09090b;

  /* ===== 主题色（Linear 风格低饱和蓝） ===== */
  --blue-50: #eff6ff;
  --blue-100: #dbeafe;
  --blue-200: #bfdbfe;
  --blue-300: #93c5fd;
  --blue-400: #60a5fa;
  --blue-500: #3b82f6;  /* 主色 */
  --blue-600: #2563eb;
  --blue-700: #1d4ed8;

  /* ===== 语义色 ===== */
  --color-success: #22c55e;
  --color-warning: #f59e0b;
  --color-error: #ef4444;

  /* ===== 深色主题语义变量 ===== */
  --bg-app: var(--gray-950);
  --bg-sidebar: var(--gray-900);
  --bg-panel: var(--gray-850);
  --bg-editor: var(--gray-900);
  --bg-input: var(--gray-800);
  --bg-hover: var(--gray-800);
  --bg-active: var(--gray-700);

  --text-primary: var(--gray-50);
  --text-secondary: var(--gray-300);
  --text-muted: var(--gray-500);

  --border-subtle: var(--gray-800);
  --border-default: var(--gray-700);

  --accent: var(--blue-500);
  --accent-hover: var(--blue-400);

  /* ===== 间距 ===== */
  --space-1: 4px;
  --space-2: 8px;
  --space-3: 12px;
  --space-4: 16px;
  --space-6: 24px;
  --space-8: 32px;

  /* ===== 圆角（克制，不要太圆） ===== */
  --radius-sm: 4px;
  --radius-md: 6px;
  --radius-lg: 8px;

  /* ===== 字体 ===== */
  --font-sans: -apple-system, BlinkMacSystemFont, "Segoe UI", "Inter", sans-serif;
  --font-mono: "SF Mono", "Fira Code", "JetBrains Mono", monospace;

  --text-xs: 11px;
  --text-sm: 12px;
  --text-base: 13px;
  --text-lg: 14px;

  /* ===== 动效 ===== */
  --duration-fast: 100ms;
  --duration-normal: 150ms;
  --duration-slow: 200ms;
  --ease-out: cubic-bezier(0.16, 1, 0.3, 1);
}
```

## 主题支持

| 主题 | 说明 |
|------|------|
| **Midnight**（默认） | Cursor 风格深黑 |
| **Dark** | 标准深色 |
| **Light** | 浅色主题 |
| **High Contrast** | 无障碍高对比 |

## 使用规范

### 禁止硬编码

```tsx
// ❌ 错误
<div style={{ backgroundColor: '#18181b' }}>

// ✅ 正确
<div className="bg-[var(--bg-panel)]">
```

### 语义变量优先

```tsx
// ❌ 避免直接使用基础色
<span className="text-gray-300">

// ✅ 使用语义变量
<span className="text-[var(--text-secondary)]">
```
