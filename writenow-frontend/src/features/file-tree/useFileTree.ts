/**
 * useFileTree - 文件树数据管理 Hook
 */
import { useCallback, useEffect, useState } from 'react';

import { useRpcConnection } from '@/lib/hooks';
import { invoke } from '@/lib/rpc';
import type { DocumentFileListItem, FileListResponse, FileReadResponse } from '@/types/ipc-generated';

import type { FileNode } from './types';

function getExtension(filename: string): string {
  const lastDot = filename.lastIndexOf('.');
  if (lastDot <= 0) return '';
  return filename.slice(lastDot);
}

function buildDocumentTree(items: readonly DocumentFileListItem[]): FileNode[] {
  const children: FileNode[] = items.map((file) => ({
    id: file.path,
    name: file.name,
    isFolder: false,
    path: file.path,
    extension: getExtension(file.name),
    modifiedAt: file.createdAt,
  }));

  return [
    {
      id: 'documents',
      name: '文档',
      isFolder: true,
      path: '/',
      children,
    },
  ];
}

function coerceFileName(raw: string): string {
  const trimmed = raw.trim();
  if (!trimmed) return '';
  if (trimmed.toLowerCase().endsWith('.md')) return trimmed;
  return `${trimmed}.md`;
}

export interface UseFileTreeResult {
  data: FileNode[];
  isLoading: boolean;
  error: string | null;
  isConnected: boolean;
  refresh: () => Promise<void>;
  createFile: (name: string) => Promise<{ path: string }>;
  renameFile: (oldPath: string, newName: string) => Promise<{ path: string }>;
  deleteFile: (path: string) => Promise<void>;
}

/**
 * 文件树数据管理 Hook
 */
export function useFileTree(): UseFileTreeResult {
  const { isConnected } = useRpcConnection({ autoConnect: false });

  const [data, setData] = useState<FileNode[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    if (!isConnected) {
      setError('未连接到后端');
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      const response = await invoke('file:list', {});
      const items: FileListResponse['items'] = Array.isArray(response.items) ? response.items : [];
      setData(buildDocumentTree(items));
    } catch (err) {
      setError(err instanceof Error ? err.message : '加载文件列表失败');
      console.error('[FileTree] Failed to load files:', err);
    } finally {
      setIsLoading(false);
    }
  }, [isConnected]);

  const createFile = useCallback(
    async (rawName: string) => {
      if (!isConnected) throw new Error('未连接到后端');

      const name = coerceFileName(rawName);
      if (!name) throw new Error('文件名不能为空');

      const created = await invoke('file:create', { name });
      await refresh();
      return { path: created.path };
    },
    [isConnected, refresh],
  );

  const renameFile = useCallback(
    async (oldPath: string, rawNewName: string) => {
      if (!isConnected) throw new Error('未连接到后端');

      const newName = coerceFileName(rawNewName);
      if (!newName) throw new Error('文件名不能为空');
      if (newName === oldPath) return { path: oldPath };

      const original = await invoke('file:read', { path: oldPath });
      const originalContent: FileReadResponse['content'] = original.content;

      const created = await invoke('file:create', { name: newName, template: 'blank' });
      await invoke('file:write', { path: created.path, content: originalContent });
      await invoke('file:delete', { path: oldPath });

      await refresh();
      return { path: created.path };
    },
    [isConnected, refresh],
  );

  const deleteFile = useCallback(
    async (path: string) => {
      if (!isConnected) throw new Error('未连接到后端');
      await invoke('file:delete', { path });
      await refresh();
    },
    [isConnected, refresh],
  );

  // 连接后自动加载
  useEffect(() => {
    if (isConnected) {
      void refresh();
    }
  }, [isConnected, refresh]);

  return {
    data,
    isLoading,
    error,
    isConnected,
    refresh,
    createFile,
    renameFile,
    deleteFile,
  };
}

export default useFileTree;
