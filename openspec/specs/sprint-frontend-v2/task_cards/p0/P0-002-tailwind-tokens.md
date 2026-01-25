# P0-002: 配置 Tailwind + Design Tokens

## 元信息

| 字段 | 值 |
|------|-----|
| ID | P0-002 |
| Phase | 0 - 基础设施 |
| 优先级 | P0 |
| 状态 | Done |
| Issue | #223 |
| PR | TBD |
| RUN_LOG | openspec/_ops/task_runs/ISSUE-223.md |
| 依赖 | P0-001 |

## 必读前置（执行前必须阅读）

- [x] `design/01-design-tokens.md` — Design Tokens 规范
- [x] `design/02-tech-stack.md` — **技术选型（禁止替换）**

## 目标

配置 Tailwind CSS 4.x 并创建完整的 Design Tokens 系统。

## 任务清单

- [x] 安装 Tailwind CSS 4.x
- [x] 创建 `styles/tokens.css`（Design Tokens）
- [x] 创建 `styles/globals.css`（全局样式）
- [x] 配置 `tailwind.config.ts`
- [x] 创建 `styles/themes/` 主题目录
- [x] 实现 Midnight 深色主题（默认）

## 验收标准

- [x] Design Tokens CSS 变量定义完整
- [x] Tailwind 可正常编译
- [x] 深色主题正确应用

## 产出

- `src/styles/tokens.css`
- `src/styles/globals.css`
- `tailwind.config.ts`

## 技术细节

### tokens.css

参考 `design/01-design-tokens.md` 中的完整 CSS 变量定义。

### tailwind.config.ts

```typescript
import type { Config } from 'tailwindcss';

export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      colors: {
        // 使用 CSS 变量
        'bg-app': 'var(--bg-app)',
        'bg-sidebar': 'var(--bg-sidebar)',
        'bg-panel': 'var(--bg-panel)',
        // ... 其他语义色
      },
      spacing: {
        1: 'var(--space-1)',
        2: 'var(--space-2)',
        3: 'var(--space-3)',
        4: 'var(--space-4)',
        6: 'var(--space-6)',
        8: 'var(--space-8)',
      },
      borderRadius: {
        sm: 'var(--radius-sm)',
        md: 'var(--radius-md)',
        lg: 'var(--radius-lg)',
      },
    },
  },
  plugins: [],
} satisfies Config;
```
