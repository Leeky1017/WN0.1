# 布局系统

## 布局结构

使用 FlexLayout 实现 IDE 级布局：

```
┌─────────────────────────────────────────────────────────┐
│  Title Bar（可选，使用系统标题栏或自定义）               │
├─────────────────────────────────────────────────────────┤
│  ┌──────┬──────────────────────────────┬──────────────┐ │
│  │      │                              │              │ │
│  │ 文件 │          编辑器区域           │   AI 面板   │ │
│  │ 树   │     （支持多标签、分屏）       │              │ │
│  │      │                              │              │ │
│  │      │                              │              │ │
│  │      ├──────────────────────────────┤              │ │
│  │      │    底部面板（可选展开）        │              │ │
│  │      │   （版本历史/终端/日志）       │              │ │
│  └──────┴──────────────────────────────┴──────────────┘ │
├─────────────────────────────────────────────────────────┤
│  Status Bar                                             │
└─────────────────────────────────────────────────────────┘
```

## 面板特性

- **可拖拽**：面板可拖拽到其他位置
- **可调整大小**：拖拽边缘调整面板宽度/高度
- **可最大化**：双击标题栏最大化面板
- **可最小化**：折叠到侧边
- **Tab 分组**：多个面板可合并为 Tab 组
- **持久化**：布局状态保存到本地存储

## 默认布局配置

```typescript
const defaultLayout = {
  global: {
    tabEnableFloat: true,
    tabSetMinWidth: 100,
    tabSetMinHeight: 100,
  },
  layout: {
    type: 'row',
    children: [
      // 左侧文件树
      {
        type: 'tabset',
        weight: 20,
        children: [{ type: 'tab', name: 'Files', component: 'FileTree' }],
      },
      // 中间编辑器
      {
        type: 'row',
        weight: 60,
        children: [
          {
            type: 'tabset',
            weight: 70,
            children: [{ type: 'tab', name: 'Untitled', component: 'Editor' }],
          },
          // 底部面板（可选）
          {
            type: 'tabset',
            weight: 30,
            children: [
              { type: 'tab', name: 'Version History', component: 'VersionHistory' },
            ],
          },
        ],
      },
      // 右侧 AI 面板
      {
        type: 'tabset',
        weight: 20,
        children: [{ type: 'tab', name: 'AI', component: 'AIPanel' }],
      },
    ],
  },
};
```

## 布局持久化

```typescript
// 保存布局
function saveLayout(model: Model) {
  const json = model.toJson();
  localStorage.setItem('writenow-layout', JSON.stringify(json));
}

// 恢复布局
function loadLayout(): IJsonModel {
  const saved = localStorage.getItem('writenow-layout');
  return saved ? JSON.parse(saved) : defaultLayout;
}
```
