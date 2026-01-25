# P4-002: 实现设置面板

## 元信息

| 字段 | 值 |
|------|-----|
| ID | P4-002 |
| Phase | 4 - 命令面板与设置 |
| 优先级 | P0 |
| 状态 | Done |
| Issue | #223 |
| PR | TBD |
| RUN_LOG | openspec/_ops/task_runs/ISSUE-223.md |
| 依赖 | P4-001 |

## 必读前置（执行前必须阅读）

- [x] `design/01-design-tokens.md` — Design Tokens 规范
- [x] `design/02-tech-stack.md` — **技术选型（禁止替换）**

## 目标

实现设置面板，支持分类设置项和配置持久化。

## 任务清单

- [x] 创建设置面板组件
- [x] 实现分类导航（通用/编辑器/AI/外观）
- [x] 实现搜索过滤
- [x] 创建各类设置项组件（开关/选择器/输入框）
- [x] 实现配置读取和保存（调用后端）
- [x] 实现 API Key 加密存储
- [x] 添加设置快捷键（Cmd+,）

## 验收标准

- [x] 设置面板可打开
- [x] 分类正确展示
- [x] 修改后自动保存
- [x] 重启后配置保持

## 产出

- `src/features/settings/SettingsPanel.tsx`
- `src/features/settings/components/SettingItem.tsx`
- `src/features/settings/useSettings.ts`

## 技术细节

### 设置面板布局

```tsx
function SettingsPanel() {
  const [category, setCategory] = useState('general');
  const [search, setSearch] = useState('');
  const { settings, updateSetting } = useSettings();
  
  return (
    <div className="flex h-full">
      {/* 侧边导航 */}
      <div className="w-48 border-r border-[var(--border-subtle)] p-2">
        <Input
          placeholder="搜索设置..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="mb-4"
        />
        {CATEGORIES.map(cat => (
          <button
            key={cat.id}
            onClick={() => setCategory(cat.id)}
            className={cn(
              'w-full text-left px-3 py-2 rounded-[var(--radius-sm)]',
              category === cat.id && 'bg-[var(--bg-active)]'
            )}
          >
            <cat.icon size={16} className="inline-block mr-2" />
            {cat.name}
          </button>
        ))}
      </div>
      
      {/* 设置项列表 */}
      <div className="flex-1 p-6 overflow-y-auto">
        <h2 className="text-lg font-semibold mb-4">{getCategoryName(category)}</h2>
        {getSettingsForCategory(category).map(item => (
          <SettingItem
            key={item.key}
            setting={item}
            value={settings[item.key]}
            onChange={(value) => updateSetting(item.key, value)}
          />
        ))}
      </div>
    </div>
  );
}
```

### 设置项类型

```typescript
interface SettingDefinition {
  key: string;
  label: string;
  description?: string;
  type: 'switch' | 'select' | 'input' | 'password';
  category: 'general' | 'editor' | 'ai' | 'appearance';
  options?: { value: string; label: string }[]; // for select
  defaultValue: unknown;
}

const SETTINGS: SettingDefinition[] = [
  {
    key: 'theme',
    label: '主题',
    type: 'select',
    category: 'appearance',
    options: [
      { value: 'midnight', label: 'Midnight' },
      { value: 'dark', label: 'Dark' },
      { value: 'light', label: 'Light' },
    ],
    defaultValue: 'midnight',
  },
  {
    key: 'ai.apiKey',
    label: 'API Key',
    description: '用于访问 AI 服务',
    type: 'password',
    category: 'ai',
    defaultValue: '',
  },
  // ... 更多设置
];
```
