# P1-002: 实现文件树

## 元信息

| 字段 | 值 |
|------|-----|
| ID | P1-002 |
| Phase | 1 - 核心布局 |
| 优先级 | P0 |
| 状态 | Done |
| Issue | #223 |
| PR | https://github.com/Leeky1017/WN0.1/pull/224 |
| RUN_LOG | openspec/_ops/task_runs/ISSUE-223.md |
| 依赖 | P1-001 |

## 必读前置（执行前必须阅读）

- [x] `design/02-tech-stack.md` — **技术选型（禁止替换 react-arborist）**
- [x] `design/01-design-tokens.md` — Design Tokens 规范

## 目标

使用 react-arborist 实现高性能文件树组件。

## 任务清单

- [x] 安装 react-arborist 依赖
- [x] 创建 `features/file-tree/FileTree.tsx`
- [x] 实现虚拟化渲染（支持万级文件）
- [x] 实现文件/文件夹图标系统（使用 Lucide）
- [x] 实现右键菜单（新建/重命名/删除）
- [x] 实现内联重命名（双击或 F2）
- [x] 实现拖拽排序
- [x] 调用后端 `file:list` 获取文件列表

## 验收标准

- [x] 文件树正确展示项目结构
- [x] 大量文件时滚动流畅
- [x] 右键菜单操作生效
- [x] 内联重命名可用

## 产出

- `src/features/file-tree/FileTree.tsx`
- `src/features/file-tree/FileNode.tsx`
- `src/features/file-tree/FileContextMenu.tsx`
- `src/features/file-tree/useFileTree.ts`

## 技术细节

### 基础实现

```tsx
import { Tree, TreeApi } from 'react-arborist';

interface FileNode {
  id: string;
  name: string;
  isFolder: boolean;
  children?: FileNode[];
}

function FileTree() {
  const { data, isLoading } = useInvoke('file:list', { path: '/' });
  
  const handleSelect = (nodes: FileNode[]) => {
    if (nodes[0] && !nodes[0].isFolder) {
      // 打开文件
      openFile(nodes[0].path);
    }
  };
  
  return (
    <Tree
      data={data}
      onSelect={handleSelect}
      rowHeight={24}
      indent={16}
      className="file-tree"
    >
      {FileNode}
    </Tree>
  );
}
```

### 文件图标映射

```typescript
const fileIcons: Record<string, LucideIcon> = {
  '.md': FileText,
  '.json': FileJson,
  '.ts': FileCode,
  '.tsx': FileCode,
  folder: Folder,
  default: File,
};
```
