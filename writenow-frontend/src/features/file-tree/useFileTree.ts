/**
 * useFileTree - 文件树数据管理 Hook
 */
import { useState, useCallback, useEffect } from 'react';
import { invoke } from '@/lib/rpc';
import { useRpcConnection } from '@/lib/hooks';
import type { FileNode } from './types';
import type { FileListResponse } from '@/types/ipc-generated';

/**
 * 将后端返回的文件列表转换为树形结构
 */
function buildFileTree(files: FileListResponse['files'] | undefined): FileNode[] {
  if (!files || files.length === 0) {
    return [];
  }

  // 简单实现：将扁平列表转为树
  // 后端已经返回层级结构，直接转换
  return files.map((file): FileNode => ({
    id: file.path || file.name,
    name: file.name,
    isFolder: file.isDirectory,
    path: file.path || file.name,
    extension: file.isDirectory ? undefined : getExtension(file.name),
    children: file.isDirectory ? [] : undefined, // 文件夹初始为空，展开时加载
  }));
}

/**
 * 获取文件扩展名
 */
function getExtension(filename: string): string {
  const lastDot = filename.lastIndexOf('.');
  if (lastDot === -1 || lastDot === 0) return '';
  return filename.slice(lastDot);
}

/**
 * 文件树数据管理 Hook
 */
export function useFileTree() {
  const { isConnected } = useRpcConnection({ autoConnect: false });
  const [data, setData] = useState<FileNode[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  /**
   * 刷新文件列表
   */
  const refresh = useCallback(async () => {
    if (!isConnected) {
      setError('未连接到后端');
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      const response = await invoke('file:list', {});
      const tree = buildFileTree(response.files);
      setData(tree);
    } catch (err) {
      setError(err instanceof Error ? err.message : '加载文件列表失败');
      console.error('[FileTree] Failed to load files:', err);
    } finally {
      setIsLoading(false);
    }
  }, [isConnected]);

  /**
   * 加载子目录
   */
  const loadChildren = useCallback(async (path: string): Promise<FileNode[]> => {
    if (!isConnected) {
      throw new Error('未连接到后端');
    }

    try {
      const response = await invoke('file:list', { path });
      return buildFileTree(response.files);
    } catch (err) {
      console.error('[FileTree] Failed to load children:', err);
      throw err;
    }
  }, [isConnected]);

  /**
   * 创建文件
   */
  const createFile = useCallback(async (parentPath: string, name: string): Promise<void> => {
    if (!isConnected) throw new Error('未连接到后端');
    
    const filePath = parentPath ? `${parentPath}/${name}` : name;
    await invoke('file:write', { path: filePath, content: '' });
    await refresh();
  }, [isConnected, refresh]);

  /**
   * 创建文件夹
   */
  const createFolder = useCallback(async (parentPath: string, name: string): Promise<void> => {
    if (!isConnected) throw new Error('未连接到后端');
    
    // TODO: 需要后端支持 mkdir 接口
    console.log('[FileTree] Create folder:', parentPath, name);
    await refresh();
  }, [isConnected, refresh]);

  /**
   * 重命名
   */
  const rename = useCallback(async (oldPath: string, newName: string): Promise<void> => {
    if (!isConnected) throw new Error('未连接到后端');
    
    // TODO: 需要后端支持 rename 接口
    console.log('[FileTree] Rename:', oldPath, '->', newName);
    await refresh();
  }, [isConnected, refresh]);

  /**
   * 删除
   */
  const deleteItem = useCallback(async (path: string): Promise<void> => {
    if (!isConnected) throw new Error('未连接到后端');
    
    await invoke('file:delete', { path });
    await refresh();
  }, [isConnected, refresh]);

  // 连接后自动加载
  useEffect(() => {
    if (isConnected) {
      refresh();
    }
  }, [isConnected, refresh]);

  return {
    data,
    isLoading,
    error,
    isConnected,
    refresh,
    loadChildren,
    createFile,
    createFolder,
    rename,
    deleteItem,
  };
}

export default useFileTree;
