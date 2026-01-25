# P5-003: 实现快捷键系统

## 元信息

| 字段 | 值 |
|------|-----|
| ID | P5-003 |
| Phase | 5 - 辅助功能 |
| 优先级 | P1 |
| 状态 | Pending |
| 依赖 | P4-001 |

## 必读前置（执行前必须阅读）

- [ ] `design/02-tech-stack.md` — **技术选型（禁止替换）**
- [ ] `spec.md` 命令面板 Requirement — 快捷键需求

## 目标

实现全局快捷键系统，支持常用操作。

## 任务清单

- [ ] 安装 react-hotkeys-hook 依赖
- [ ] 定义快捷键映射表
- [ ] 实现快捷键提示（在命令面板中显示）
- [ ] 处理 Windows/Mac 按键差异
- [ ] 避免与编辑器快捷键冲突
- [ ] 实现快捷键自定义（可选）

## 验收标准

- [ ] 所有定义的快捷键生效
- [ ] Windows/Mac 按键正确
- [ ] 不与编辑器冲突

## 产出

- `src/lib/hotkeys/index.ts`
- `src/lib/hotkeys/keymap.ts`
- `src/hooks/useGlobalHotkeys.ts`

## 技术细节

### 快捷键映射

```typescript
// lib/hotkeys/keymap.ts
interface Hotkey {
  id: string;
  key: string; // react-hotkeys-hook 格式
  description: string;
  macKey?: string; // Mac 显示格式
  winKey?: string; // Windows 显示格式
}

export const HOTKEYS: Hotkey[] = [
  {
    id: 'save',
    key: 'mod+s',
    description: '保存文件',
    macKey: '⌘S',
    winKey: 'Ctrl+S',
  },
  {
    id: 'command-palette',
    key: 'mod+k',
    description: '打开命令面板',
    macKey: '⌘K',
    winKey: 'Ctrl+K',
  },
  {
    id: 'settings',
    key: 'mod+,',
    description: '打开设置',
    macKey: '⌘,',
    winKey: 'Ctrl+,',
  },
  {
    id: 'ai-polish',
    key: 'mod+/',
    description: '快速润色',
    macKey: '⌘/',
    winKey: 'Ctrl+/',
  },
  {
    id: 'close-tab',
    key: 'mod+w',
    description: '关闭当前标签',
    macKey: '⌘W',
    winKey: 'Ctrl+W',
  },
  {
    id: 'next-tab',
    key: 'mod+tab',
    description: '下一个标签',
    macKey: '⌘Tab',
    winKey: 'Ctrl+Tab',
  },
  {
    id: 'zen-mode',
    key: 'mod+\\',
    description: '专注模式',
    macKey: '⌘\\',
    winKey: 'Ctrl+\\',
  },
];
```

### 全局快捷键 Hook

```typescript
// hooks/useGlobalHotkeys.ts
import { useHotkeys } from 'react-hotkeys-hook';

export function useGlobalHotkeys() {
  const { saveNow } = useAutoSave();
  const { openCommandPalette } = useCommandPaletteStore();
  const { openSettings } = useSettingsStore();
  const { closeCurrentTab } = useEditorTabsStore();
  
  // 保存
  useHotkeys('mod+s', (e) => {
    e.preventDefault();
    saveNow();
  });
  
  // 命令面板
  useHotkeys('mod+k', (e) => {
    e.preventDefault();
    openCommandPalette();
  });
  
  // 设置
  useHotkeys('mod+,', (e) => {
    e.preventDefault();
    openSettings();
  });
  
  // 关闭标签
  useHotkeys('mod+w', (e) => {
    e.preventDefault();
    closeCurrentTab();
  });
}
```

### 显示快捷键

```typescript
// 根据平台显示正确的快捷键
function getDisplayKey(hotkey: Hotkey): string {
  const isMac = navigator.platform.toUpperCase().includes('MAC');
  return isMac ? hotkey.macKey : hotkey.winKey;
}
```
