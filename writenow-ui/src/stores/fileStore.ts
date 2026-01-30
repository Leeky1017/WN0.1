/**
 * File Store
 * 
 * Zustand store 管理文件树状态。
 * 对接 file:* IPC 通道 (list/create/delete/read/write)。
 * 
 * @see DESIGN_SPEC.md 8.1.6 文件管理流程
 */
import { create } from 'zustand';

/**
 * 文件节点类型
 */
export type FileNodeType = 'file' | 'folder';

/**
 * 文件/文件夹节点
 */
export interface FileNode {
  /** 唯一标识（文件路径） */
  id: string;
  /** 显示名称 */
  name: string;
  /** 节点类型 */
  type: FileNodeType;
  /** 文件路径 */
  path: string;
  /** 父节点 ID (null 表示根节点) */
  parentId: string | null;
  /** 子节点（仅文件夹） */
  children?: FileNode[];
  /** 创建时间 */
  createdAt?: number;
  /** 字数统计（仅文件） */
  wordCount?: number;
  /** 是否展开（仅文件夹） */
  isExpanded?: boolean;
  /** 是否正在重命名 */
  isRenaming?: boolean;
}

export interface FileState {
  // 状态
  nodes: FileNode[];
  selectedNodeId: string | null;
  expandedIds: Set<string>;
  isLoading: boolean;
  error: string | null;
  
  // Actions
  fetchFiles: (projectId?: string) => Promise<void>;
  createFile: (name: string, parentId?: string) => Promise<FileNode>;
  createFolder: (name: string, parentId?: string) => Promise<FileNode>;
  renameNode: (id: string, newName: string) => Promise<void>;
  deleteNode: (id: string) => Promise<void>;
  moveNode: (id: string, newParentId: string | null) => Promise<void>;
  
  // 选择与展开
  selectNode: (id: string | null) => void;
  toggleExpanded: (id: string) => void;
  expandNode: (id: string) => void;
  collapseNode: (id: string) => void;
  expandAll: () => void;
  collapseAll: () => void;
  
  // 重命名状态
  startRenaming: (id: string) => void;
  cancelRenaming: (id: string) => void;
  
  // 重置
  reset: () => void;
}

/**
 * Mock 文件树数据
 * 
 * 用于开发和演示，后续对接 file:list IPC 后移除
 */
const MOCK_FILE_TREE: FileNode[] = [
  {
    id: 'folder-chapters',
    name: 'Chapters',
    type: 'folder',
    path: '/Chapters',
    parentId: null,
    isExpanded: true,
    children: [
      {
        id: 'file-chapter-1',
        name: 'Chapter 1 - The Beginning',
        type: 'file',
        path: '/Chapters/Chapter 1 - The Beginning.md',
        parentId: 'folder-chapters',
        wordCount: 3500,
        createdAt: Date.now() - 86400000 * 7,
      },
      {
        id: 'file-chapter-2',
        name: 'Chapter 2 - Rising Action',
        type: 'file',
        path: '/Chapters/Chapter 2 - Rising Action.md',
        parentId: 'folder-chapters',
        wordCount: 4200,
        createdAt: Date.now() - 86400000 * 5,
      },
      {
        id: 'file-chapter-3',
        name: 'Chapter 3 - The Conflict',
        type: 'file',
        path: '/Chapters/Chapter 3 - The Conflict.md',
        parentId: 'folder-chapters',
        wordCount: 2800,
        createdAt: Date.now() - 86400000 * 3,
      },
    ],
  },
  {
    id: 'folder-notes',
    name: 'Notes',
    type: 'folder',
    path: '/Notes',
    parentId: null,
    isExpanded: false,
    children: [
      {
        id: 'file-outline',
        name: 'Story Outline',
        type: 'file',
        path: '/Notes/Story Outline.md',
        parentId: 'folder-notes',
        wordCount: 850,
        createdAt: Date.now() - 86400000 * 10,
      },
      {
        id: 'file-research',
        name: 'Research Notes',
        type: 'file',
        path: '/Notes/Research Notes.md',
        parentId: 'folder-notes',
        wordCount: 1200,
        createdAt: Date.now() - 86400000 * 8,
      },
    ],
  },
  {
    id: 'file-readme',
    name: 'README',
    type: 'file',
    path: '/README.md',
    parentId: null,
    wordCount: 320,
    createdAt: Date.now() - 86400000 * 14,
  },
];

/**
 * 辅助函数：从树中获取所有展开的节点 ID
 */
function getExpandedIds(nodes: FileNode[]): Set<string> {
  const ids = new Set<string>();
  const traverse = (nodeList: FileNode[]) => {
    for (const node of nodeList) {
      if (node.type === 'folder' && node.isExpanded) {
        ids.add(node.id);
      }
      if (node.children) {
        traverse(node.children);
      }
    }
  };
  traverse(nodes);
  return ids;
}

/**
 * 辅助函数：更新树中的节点
 */
function updateNodeInTree(
  nodes: FileNode[],
  id: string,
  updater: (node: FileNode) => FileNode
): FileNode[] {
  return nodes.map((node) => {
    if (node.id === id) {
      return updater(node);
    }
    if (node.children) {
      return {
        ...node,
        children: updateNodeInTree(node.children, id, updater),
      };
    }
    return node;
  });
}

/**
 * 辅助函数：删除树中的节点
 */
function removeNodeFromTree(nodes: FileNode[], id: string): FileNode[] {
  return nodes
    .filter((node) => node.id !== id)
    .map((node) => {
      if (node.children) {
        return {
          ...node,
          children: removeNodeFromTree(node.children, id),
        };
      }
      return node;
    });
}

/**
 * 辅助函数：添加节点到树
 */
function addNodeToTree(
  nodes: FileNode[],
  parentId: string | null,
  newNode: FileNode
): FileNode[] {
  if (parentId === null) {
    return [...nodes, newNode];
  }
  
  return nodes.map((node) => {
    if (node.id === parentId && node.type === 'folder') {
      return {
        ...node,
        children: [...(node.children || []), newNode],
        isExpanded: true,
      };
    }
    if (node.children) {
      return {
        ...node,
        children: addNodeToTree(node.children, parentId, newNode),
      };
    }
    return node;
  });
}

/**
 * 辅助函数：获取所有文件夹 ID
 */
function getAllFolderIds(nodes: FileNode[]): string[] {
  const ids: string[] = [];
  const traverse = (nodeList: FileNode[]) => {
    for (const node of nodeList) {
      if (node.type === 'folder') {
        ids.push(node.id);
      }
      if (node.children) {
        traverse(node.children);
      }
    }
  };
  traverse(nodes);
  return ids;
}

const initialState = {
  nodes: MOCK_FILE_TREE,
  selectedNodeId: null,
  expandedIds: getExpandedIds(MOCK_FILE_TREE),
  isLoading: false,
  error: null,
};

export const useFileStore = create<FileState>()((set, get) => ({
  ...initialState,

  /**
   * 获取文件列表
   * 
   * 后续对接 window.api.invoke('file:list', { projectId })
   */
  fetchFiles: async (_projectId?: string) => {
    set({ isLoading: true, error: null });
    
    try {
      // TODO: 对接 window.api.invoke('file:list', { projectId })
      await new Promise((resolve) => setTimeout(resolve, 300));
      
      // 目前使用 mock 数据
      set({
        nodes: MOCK_FILE_TREE,
        expandedIds: getExpandedIds(MOCK_FILE_TREE),
        isLoading: false,
      });
    } catch {
      set({ error: 'Failed to fetch files', isLoading: false });
    }
  },

  /**
   * 创建文件
   * 
   * 后续对接 window.api.invoke('file:create', { name, parentId })
   */
  createFile: async (name: string, parentId?: string) => {
    const state = get();
    
    try {
      // TODO: 对接 window.api.invoke('file:create', { name })
      await new Promise((resolve) => setTimeout(resolve, 200));
      
      const newNode: FileNode = {
        id: `file-${Date.now()}`,
        name,
        type: 'file',
        path: parentId ? `/${name}` : `/${name}`,
        parentId: parentId || null,
        wordCount: 0,
        createdAt: Date.now(),
      };
      
      set({
        nodes: addNodeToTree(state.nodes, parentId || null, newNode),
        selectedNodeId: newNode.id,
      });
      
      return newNode;
    } catch {
      set({ error: 'Failed to create file' });
      throw new Error('Failed to create file');
    }
  },

  /**
   * 创建文件夹
   */
  createFolder: async (name: string, parentId?: string) => {
    const state = get();
    
    try {
      await new Promise((resolve) => setTimeout(resolve, 200));
      
      const newNode: FileNode = {
        id: `folder-${Date.now()}`,
        name,
        type: 'folder',
        path: parentId ? `/${name}` : `/${name}`,
        parentId: parentId || null,
        children: [],
        isExpanded: true,
        createdAt: Date.now(),
      };
      
      const newExpandedIds = new Set(state.expandedIds);
      newExpandedIds.add(newNode.id);
      
      set({
        nodes: addNodeToTree(state.nodes, parentId || null, newNode),
        expandedIds: newExpandedIds,
        selectedNodeId: newNode.id,
      });
      
      return newNode;
    } catch {
      set({ error: 'Failed to create folder' });
      throw new Error('Failed to create folder');
    }
  },

  /**
   * 重命名节点
   */
  renameNode: async (id: string, newName: string) => {
    const state = get();
    
    try {
      // TODO: 对接 file:write 或专门的重命名 IPC
      await new Promise((resolve) => setTimeout(resolve, 200));
      
      set({
        nodes: updateNodeInTree(state.nodes, id, (node) => ({
          ...node,
          name: newName,
          isRenaming: false,
        })),
      });
    } catch {
      set({ error: 'Failed to rename' });
    }
  },

  /**
   * 删除节点
   * 
   * 后续对接 window.api.invoke('file:delete', { path })
   */
  deleteNode: async (id: string) => {
    const state = get();
    
    try {
      // TODO: 对接 window.api.invoke('file:delete', { path })
      await new Promise((resolve) => setTimeout(resolve, 200));
      
      const newExpandedIds = new Set(state.expandedIds);
      newExpandedIds.delete(id);
      
      set({
        nodes: removeNodeFromTree(state.nodes, id),
        expandedIds: newExpandedIds,
        selectedNodeId: state.selectedNodeId === id ? null : state.selectedNodeId,
      });
    } catch {
      set({ error: 'Failed to delete' });
    }
  },

  /**
   * 移动节点（拖拽排序预留）
   */
  moveNode: async (id: string, newParentId: string | null) => {
    const state = get();
    
    try {
      // 找到节点
      let targetNode: FileNode | null = null;
      const findNode = (nodes: FileNode[]): void => {
        for (const node of nodes) {
          if (node.id === id) {
            targetNode = node;
            return;
          }
          if (node.children) {
            findNode(node.children);
          }
        }
      };
      findNode(state.nodes);
      
      if (!targetNode) return;
      
      // 从原位置删除
      let newNodes = removeNodeFromTree(state.nodes, id);
      
      // 添加到新位置
      const movedNode: FileNode = {
        ...targetNode,
        parentId: newParentId,
      };
      newNodes = addNodeToTree(newNodes, newParentId, movedNode);
      
      set({ nodes: newNodes });
    } catch {
      set({ error: 'Failed to move' });
    }
  },

  selectNode: (id: string | null) => set({ selectedNodeId: id }),

  toggleExpanded: (id: string) => {
    const state = get();
    const newExpandedIds = new Set(state.expandedIds);
    
    if (newExpandedIds.has(id)) {
      newExpandedIds.delete(id);
    } else {
      newExpandedIds.add(id);
    }
    
    set({
      expandedIds: newExpandedIds,
      nodes: updateNodeInTree(state.nodes, id, (node) => ({
        ...node,
        isExpanded: !node.isExpanded,
      })),
    });
  },

  expandNode: (id: string) => {
    const state = get();
    const newExpandedIds = new Set(state.expandedIds);
    newExpandedIds.add(id);
    
    set({
      expandedIds: newExpandedIds,
      nodes: updateNodeInTree(state.nodes, id, (node) => ({
        ...node,
        isExpanded: true,
      })),
    });
  },

  collapseNode: (id: string) => {
    const state = get();
    const newExpandedIds = new Set(state.expandedIds);
    newExpandedIds.delete(id);
    
    set({
      expandedIds: newExpandedIds,
      nodes: updateNodeInTree(state.nodes, id, (node) => ({
        ...node,
        isExpanded: false,
      })),
    });
  },

  expandAll: () => {
    const state = get();
    const allFolderIds = getAllFolderIds(state.nodes);
    
    const updateAllFolders = (nodes: FileNode[]): FileNode[] =>
      nodes.map((node) => {
        if (node.type === 'folder') {
          return {
            ...node,
            isExpanded: true,
            children: node.children ? updateAllFolders(node.children) : [],
          };
        }
        return node;
      });
    
    set({
      expandedIds: new Set(allFolderIds),
      nodes: updateAllFolders(state.nodes),
    });
  },

  collapseAll: () => {
    const state = get();
    
    const collapseAllFolders = (nodes: FileNode[]): FileNode[] =>
      nodes.map((node) => {
        if (node.type === 'folder') {
          return {
            ...node,
            isExpanded: false,
            children: node.children ? collapseAllFolders(node.children) : [],
          };
        }
        return node;
      });
    
    set({
      expandedIds: new Set<string>(),
      nodes: collapseAllFolders(state.nodes),
    });
  },

  startRenaming: (id: string) => {
    const state = get();
    set({
      nodes: updateNodeInTree(state.nodes, id, (node) => ({
        ...node,
        isRenaming: true,
      })),
    });
  },

  cancelRenaming: (id: string) => {
    const state = get();
    set({
      nodes: updateNodeInTree(state.nodes, id, (node) => ({
        ...node,
        isRenaming: false,
      })),
    });
  },

  reset: () => set(initialState),
}));

/**
 * 获取选中的节点
 */
export function useSelectedNode(): FileNode | null {
  const { nodes, selectedNodeId } = useFileStore();
  
  if (!selectedNodeId) return null;
  
  const findNode = (nodeList: FileNode[]): FileNode | null => {
    for (const node of nodeList) {
      if (node.id === selectedNodeId) return node;
      if (node.children) {
        const found = findNode(node.children);
        if (found) return found;
      }
    }
    return null;
  };
  
  return findNode(nodes);
}
