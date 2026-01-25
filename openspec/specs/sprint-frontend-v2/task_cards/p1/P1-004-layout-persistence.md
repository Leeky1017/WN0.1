# P1-004: 布局持久化

## 元信息

| 字段 | 值 |
|------|-----|
| ID | P1-004 |
| Phase | 1 - 核心布局 |
| 优先级 | P1 |
| 状态 | Done |
| Issue | #223 |
| PR | https://github.com/Leeky1017/WN0.1/pull/224 |
| RUN_LOG | openspec/_ops/task_runs/ISSUE-223.md |
| 依赖 | P1-001 |

## 必读前置（执行前必须阅读）

- [x] `design/03-layout-system.md` — 布局持久化设计
- [x] `design/02-tech-stack.md` — **技术选型（禁止替换）**

## 目标

实现布局状态持久化，刷新或重启后恢复用户的布局设置。

## 任务清单

- [x] 监听 FlexLayout 布局变化事件
- [x] 将布局配置序列化并保存到 localStorage
- [x] 应用启动时读取并恢复布局
- [x] 提供"重置布局"功能
- [x] 处理布局配置版本迁移

## 验收标准

- [x] 调整布局后刷新页面，布局保持
- [x] 重启应用后布局保持
- [x] 可以重置为默认布局

## 产出

- `src/lib/layout/persistence.ts`
- `src/stores/layoutStore.ts`

## 技术细节

### 持久化实现

```typescript
// lib/layout/persistence.ts
const LAYOUT_STORAGE_KEY = 'writenow-layout';
const LAYOUT_VERSION = 1;

interface StoredLayout {
  version: number;
  layout: IJsonModel;
  timestamp: number;
}

export function saveLayout(model: Model): void {
  const stored: StoredLayout = {
    version: LAYOUT_VERSION,
    layout: model.toJson(),
    timestamp: Date.now(),
  };
  localStorage.setItem(LAYOUT_STORAGE_KEY, JSON.stringify(stored));
}

export function loadLayout(): IJsonModel {
  try {
    const raw = localStorage.getItem(LAYOUT_STORAGE_KEY);
    if (!raw) return defaultLayout;
    
    const stored: StoredLayout = JSON.parse(raw);
    
    // 版本检查
    if (stored.version !== LAYOUT_VERSION) {
      console.warn('Layout version mismatch, using default');
      return defaultLayout;
    }
    
    return stored.layout;
  } catch (error) {
    console.error('Failed to load layout:', error);
    return defaultLayout;
  }
}

export function resetLayout(): void {
  localStorage.removeItem(LAYOUT_STORAGE_KEY);
}
```

### 防抖保存

```typescript
// 使用防抖避免频繁写入
const debouncedSave = useMemo(
  () => debounce((model: Model) => saveLayout(model), 1000),
  []
);

// FlexLayout onChange 回调
const handleModelChange = (model: Model) => {
  debouncedSave(model);
};
```
