# P4-003: 实现主题切换

## 元信息

| 字段 | 值 |
|------|-----|
| ID | P4-003 |
| Phase | 4 - 命令面板与设置 |
| 优先级 | P1 |
| 状态 | Done |
| Issue | #223 |
| PR | https://github.com/Leeky1017/WN0.1/pull/224 |
| RUN_LOG | openspec/_ops/task_runs/ISSUE-223.md |
| 依赖 | P4-002 |

## 必读前置（执行前必须阅读）

- [x] `design/01-design-tokens.md` — 主题定义与切换
- [x] `design/02-tech-stack.md` — **技术选型（禁止替换）**

## 目标

实现主题切换功能，支持即时预览。

## 任务清单

- [x] 定义主题变量集（Midnight/Dark/Light/High Contrast）
- [x] 实现主题切换逻辑
- [x] 实现即时预览（无需刷新）
- [x] 实现主题持久化
- [x] 支持跟随系统主题

## 验收标准

- [x] 主题可切换
- [x] 切换即时生效
- [x] 重启后主题保持
- [x] 跟随系统可选

## 产出

- `src/styles/themes/midnight.css`
- `src/styles/themes/dark.css`
- `src/styles/themes/light.css`
- `src/styles/themes/high-contrast.css`
- `src/lib/theme/themeManager.ts`
- `src/stores/themeStore.ts`

## 技术细节

### 主题定义

```css
/* themes/light.css */
[data-theme='light'] {
  --bg-app: var(--gray-50);
  --bg-sidebar: var(--gray-100);
  --bg-panel: white;
  --bg-editor: white;
  --bg-input: var(--gray-100);
  --bg-hover: var(--gray-200);
  --bg-active: var(--gray-300);

  --text-primary: var(--gray-900);
  --text-secondary: var(--gray-600);
  --text-muted: var(--gray-500);

  --border-subtle: var(--gray-200);
  --border-default: var(--gray-300);
}
```

### 主题管理器

```typescript
// lib/theme/themeManager.ts
type Theme = 'midnight' | 'dark' | 'light' | 'high-contrast' | 'system';

class ThemeManager {
  private currentTheme: Theme = 'midnight';
  
  setTheme(theme: Theme) {
    const resolvedTheme = theme === 'system' 
      ? this.getSystemTheme()
      : theme;
    
    document.documentElement.setAttribute('data-theme', resolvedTheme);
    this.currentTheme = theme;
    
    // 持久化
    localStorage.setItem('theme', theme);
    
    // 如果是跟随系统，监听变化
    if (theme === 'system') {
      this.watchSystemTheme();
    }
  }
  
  private getSystemTheme(): 'light' | 'dark' {
    return window.matchMedia('(prefers-color-scheme: dark)').matches
      ? 'dark'
      : 'light';
  }
  
  private watchSystemTheme() {
    const mq = window.matchMedia('(prefers-color-scheme: dark)');
    mq.addEventListener('change', (e) => {
      if (this.currentTheme === 'system') {
        document.documentElement.setAttribute(
          'data-theme', 
          e.matches ? 'dark' : 'light'
        );
      }
    });
  }
}

export const themeManager = new ThemeManager();
```

### Theme Store

```typescript
// stores/themeStore.ts
export const useThemeStore = create<ThemeState>((set) => ({
  theme: 'midnight',
  setTheme: (theme) => {
    themeManager.setTheme(theme);
    set({ theme });
  },
}));
```
