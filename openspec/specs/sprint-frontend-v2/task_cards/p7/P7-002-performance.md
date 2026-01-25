# P7-002: 性能优化

## 元信息

| 字段 | 值 |
|------|-----|
| ID | P7-002 |
| Phase | 7 - 打磨与优化 |
| 优先级 | P0 |
| 状态 | Pending |
| 依赖 | P6-004 |

## 目标

优化应用性能，确保首屏加载 < 2s，交互响应 < 100ms。

## 任务清单

- [ ] 配置代码分割（React.lazy）
- [ ] 实现路由懒加载
- [ ] 优化大型组件的重渲染（memo/useMemo）
- [ ] 配置 Tree shaking
- [ ] 优化 Bundle size
- [ ] 添加资源预加载
- [ ] 优化图片加载
- [ ] 添加性能监控

## 验收标准

- [ ] 首屏加载 < 2s
- [ ] 交互响应 < 100ms
- [ ] Bundle size 合理（< 2MB）
- [ ] 无明显卡顿

## 产出

- 优化后的 Vite 配置
- 性能测试报告

## 技术细节

### 代码分割

```typescript
// app/routes.tsx
import { lazy, Suspense } from 'react';

const SettingsPanel = lazy(() => import('@/features/settings/SettingsPanel'));
const VersionHistory = lazy(() => import('@/features/version-history/VersionHistoryPanel'));

function App() {
  return (
    <Suspense fallback={<Skeleton />}>
      <Routes>
        <Route path="/settings" element={<SettingsPanel />} />
        <Route path="/history" element={<VersionHistory />} />
      </Routes>
    </Suspense>
  );
}
```

### Vite 优化配置

```typescript
// vite.config.ts
export default defineConfig({
  build: {
    rollupOptions: {
      output: {
        manualChunks: {
          'react-vendor': ['react', 'react-dom'],
          'ui-vendor': ['@radix-ui/react-dialog', '@radix-ui/react-dropdown-menu'],
          'editor-vendor': ['@tiptap/core', '@tiptap/react', '@tiptap/starter-kit'],
        },
      },
    },
    // 压缩
    minify: 'terser',
    terserOptions: {
      compress: {
        drop_console: true,
        drop_debugger: true,
      },
    },
  },
  // 预构建优化
  optimizeDeps: {
    include: ['react', 'react-dom', 'zustand', '@tanstack/react-query'],
  },
});
```

### 重渲染优化

```typescript
// 使用 memo 避免不必要的重渲染
const FileTreeItem = memo(function FileTreeItem({ node }: Props) {
  // ...
});

// 使用 useMemo 缓存计算结果
const filteredFiles = useMemo(() => {
  return files.filter(f => f.name.includes(search));
}, [files, search]);

// 使用 useCallback 稳定回调引用
const handleClick = useCallback((id: string) => {
  openFile(id);
}, [openFile]);
```

### 性能测试

```bash
# 使用 Lighthouse 测试
npx lighthouse http://localhost:5173 --view

# 使用 Vite 分析 Bundle
npx vite-bundle-visualizer
```

### 性能指标

| 指标 | 目标 | 实际 | 通过 |
|------|------|------|------|
| FCP (First Contentful Paint) | < 1s | | |
| LCP (Largest Contentful Paint) | < 2s | | |
| TTI (Time to Interactive) | < 2s | | |
| CLS (Cumulative Layout Shift) | < 0.1 | | |
| Bundle Size (gzip) | < 500KB | | |
