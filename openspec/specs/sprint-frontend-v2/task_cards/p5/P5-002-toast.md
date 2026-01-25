# P5-002: 实现通知系统

## 元信息

| 字段 | 值 |
|------|-----|
| ID | P5-002 |
| Phase | 5 - 辅助功能 |
| 优先级 | P1 |
| 状态 | Pending |
| 依赖 | P4-003 |

## 目标

使用 sonner 实现 Toast 通知系统。

## 任务清单

- [ ] 安装 sonner 依赖
- [ ] 配置 Toaster 组件
- [ ] 调整样式符合 Design Tokens
- [ ] 封装常用 toast 方法
- [ ] 在关键操作点添加 toast（保存成功/失败、AI 完成等）

## 验收标准

- [ ] Toast 样式符合设计
- [ ] 动效流畅
- [ ] 支持多种类型（success/error/info/warning）

## 产出

- `src/components/ui/toaster.tsx`
- `src/lib/toast.ts`

## 技术细节

### Toaster 配置

```tsx
// components/ui/toaster.tsx
import { Toaster as Sonner } from 'sonner';

export function Toaster() {
  return (
    <Sonner
      position="bottom-right"
      toastOptions={{
        classNames: {
          toast: 'bg-[var(--bg-panel)] border border-[var(--border-default)] text-[var(--text-primary)]',
          title: 'text-sm font-medium',
          description: 'text-xs text-[var(--text-muted)]',
          actionButton: 'bg-[var(--accent)] text-white',
          cancelButton: 'bg-[var(--bg-input)] text-[var(--text-primary)]',
          success: 'border-l-4 border-l-green-500',
          error: 'border-l-4 border-l-red-500',
          warning: 'border-l-4 border-l-yellow-500',
          info: 'border-l-4 border-l-blue-500',
        },
      }}
    />
  );
}
```

### Toast 封装

```typescript
// lib/toast.ts
import { toast as sonnerToast } from 'sonner';

export const toast = {
  success: (message: string, options?: { description?: string }) => {
    sonnerToast.success(message, options);
  },
  
  error: (message: string, options?: { description?: string }) => {
    sonnerToast.error(message, options);
  },
  
  info: (message: string, options?: { description?: string }) => {
    sonnerToast.info(message, options);
  },
  
  promise: <T>(
    promise: Promise<T>,
    options: {
      loading: string;
      success: string;
      error: string;
    }
  ) => {
    return sonnerToast.promise(promise, options);
  },
};
```

### 使用示例

```typescript
// 保存成功
toast.success('文件已保存');

// 保存失败
toast.error('保存失败', { description: '请检查网络连接' });

// 异步操作
toast.promise(saveFile(), {
  loading: '正在保存...',
  success: '保存成功',
  error: '保存失败',
});
```
