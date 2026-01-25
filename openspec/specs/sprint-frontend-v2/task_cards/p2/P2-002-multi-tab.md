# P2-002: 实现多标签编辑

## 元信息

| 字段 | 值 |
|------|-----|
| ID | P2-002 |
| Phase | 2 - 编辑器 |
| 优先级 | P0 |
| 状态 | Pending |
| 依赖 | P2-001 |

## 必读前置（执行前必须阅读）

- [ ] `design/03-layout-system.md` — 布局系统设计
- [ ] `design/02-tech-stack.md` — **技术选型（禁止替换）**

## 目标

实现多标签编辑功能，支持同时打开多个文件。

## 任务清单

- [ ] 创建 Tab 栏组件
- [ ] 实现 Tab 切换逻辑
- [ ] 实现 Tab 关闭（单个/其他/全部）
- [ ] 实现 Tab 拖拽重排
- [ ] 显示 dirty 状态（未保存标记）
- [ ] 实现关闭未保存文件时的确认对话框
- [ ] 实现快捷键切换 Tab（Ctrl+Tab）

## 验收标准

- [ ] 打开文件时添加新 Tab
- [ ] 点击 Tab 切换文件
- [ ] 未保存文件 Tab 显示圆点标记
- [ ] 关闭未保存文件时提示保存

## 产出

- `src/components/editor/EditorTabs.tsx`
- `src/stores/editorTabsStore.ts`

## 技术细节

### Tab Store

```typescript
// stores/editorTabsStore.ts
interface EditorTab {
  id: string;
  path: string;
  name: string;
  isDirty: boolean;
  content: string;
}

interface EditorTabsState {
  tabs: EditorTab[];
  activeTabId: string | null;
  openTab: (path: string) => void;
  closeTab: (id: string) => void;
  setActiveTab: (id: string) => void;
  markDirty: (id: string, isDirty: boolean) => void;
}

export const useEditorTabsStore = create<EditorTabsState>((set, get) => ({
  tabs: [],
  activeTabId: null,
  
  openTab: async (path) => {
    const existing = get().tabs.find(t => t.path === path);
    if (existing) {
      set({ activeTabId: existing.id });
      return;
    }
    
    const content = await invoke('file:read', { path });
    const newTab: EditorTab = {
      id: nanoid(),
      path,
      name: path.split('/').pop() || 'Untitled',
      isDirty: false,
      content: content.data,
    };
    
    set(state => ({
      tabs: [...state.tabs, newTab],
      activeTabId: newTab.id,
    }));
  },
  
  // ... 其他方法
}));
```

### Tab 组件

```tsx
function EditorTabs() {
  const { tabs, activeTabId, setActiveTab, closeTab } = useEditorTabsStore();
  
  return (
    <div className="flex border-b border-[var(--border-subtle)]">
      {tabs.map(tab => (
        <Tab
          key={tab.id}
          isActive={tab.id === activeTabId}
          isDirty={tab.isDirty}
          onClick={() => setActiveTab(tab.id)}
          onClose={() => closeTab(tab.id)}
        >
          {tab.name}
        </Tab>
      ))}
    </div>
  );
}
```
