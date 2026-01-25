# P2-003: 实现文件保存

## 元信息

| 字段 | 值 |
|------|-----|
| ID | P2-003 |
| Phase | 2 - 编辑器 |
| 优先级 | P0 |
| 状态 | Done |
| Issue | #223 |
| PR | TBD |
| RUN_LOG | openspec/_ops/task_runs/ISSUE-223.md |
| 依赖 | P2-001 |

## 必读前置（执行前必须阅读）

- [x] `design/04-rpc-client.md` — RPC 客户端设计
- [x] `design/02-tech-stack.md` — **技术选型（禁止替换）**

## 目标

实现自动保存和手动保存功能。

## 任务清单

- [x] 实现自动保存（2 秒防抖）
- [x] 实现手动保存（Ctrl+S）
- [x] 更新状态栏保存状态
- [x] 处理保存失败情况
- [x] 实现保存失败重试
- [x] 实现崩溃恢复机制

## 验收标准

- [x] 编辑后 2 秒自动保存
- [x] Ctrl+S 立即保存
- [x] 状态栏显示保存状态
- [x] 保存失败有明确提示

## 产出

- `src/lib/editor/autoSave.ts`
- `src/stores/saveStatusStore.ts`

## 技术细节

### 自动保存实现

```typescript
// lib/editor/autoSave.ts
const DEBOUNCE_MS = 2000;
const SNAPSHOT_INTERVAL_MS = 5 * 60 * 1000; // 5 分钟

export function useAutoSave(editor: Editor, filePath: string) {
  const { setSaveStatus } = useSaveStatusStore();
  
  // 防抖保存
  const debouncedSave = useMemo(
    () => debounce(async (content: string) => {
      setSaveStatus('saving');
      try {
        await invoke('file:write', { path: filePath, content });
        setSaveStatus('saved');
      } catch (error) {
        setSaveStatus('error');
        // 显示错误通知
        toast.error('保存失败', { description: error.message });
      }
    }, DEBOUNCE_MS),
    [filePath]
  );
  
  // 监听编辑器变化
  useEffect(() => {
    const handleUpdate = () => {
      setSaveStatus('unsaved');
      debouncedSave(editor.storage.markdown.getMarkdown());
    };
    
    editor.on('update', handleUpdate);
    return () => editor.off('update', handleUpdate);
  }, [editor, debouncedSave]);
  
  // 手动保存
  const saveNow = useCallback(async () => {
    debouncedSave.cancel();
    setSaveStatus('saving');
    try {
      await invoke('file:write', { 
        path: filePath, 
        content: editor.storage.markdown.getMarkdown() 
      });
      setSaveStatus('saved');
    } catch (error) {
      setSaveStatus('error');
      throw error;
    }
  }, [editor, filePath]);
  
  return { saveNow };
}
```

### 快捷键绑定

```typescript
// 在应用层绑定 Ctrl+S
useHotkeys('mod+s', (e) => {
  e.preventDefault();
  saveNow();
});
```

### 保存状态类型

```typescript
type SaveStatus = 'saved' | 'saving' | 'unsaved' | 'error';
```
