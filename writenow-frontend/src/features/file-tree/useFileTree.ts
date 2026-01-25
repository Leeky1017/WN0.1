/**
 * useFileTree - 文件树数据管理 Hook
 */
import { useCallback, useEffect, useState } from 'react';

import { useRpcConnection } from '@/lib/hooks';
import { invoke } from '@/lib/rpc';
import type { DocumentFileListItem, FileListResponse, FileReadResponse } from '@/types/ipc-generated';

import type { FileNode } from './types';

const DOCUMENT_ORDER_STORAGE_KEY = 'writenow-documents-order-v1';

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

function loadDocumentOrder(): string[] {
  try {
    const raw = localStorage.getItem(DOCUMENT_ORDER_STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw) as unknown;
    if (!Array.isArray(parsed)) return [];
    return parsed.filter((value) => typeof value === 'string' && value.trim()).map((v) => v.trim());
  } catch (error) {
    console.warn('[FileTree] Failed to load document order:', error);
    return [];
  }
}

function persistDocumentOrder(paths: readonly string[]): void {
  try {
    localStorage.setItem(DOCUMENT_ORDER_STORAGE_KEY, JSON.stringify([...paths]));
  } catch (error) {
    console.warn('[FileTree] Failed to persist document order:', error);
  }
}

function sortByUserOrder(items: readonly DocumentFileListItem[]): DocumentFileListItem[] {
  const order = loadDocumentOrder();
  if (order.length === 0) return [...items];

  const rank = new Map(order.map((p, idx) => [p, idx]));
  return [...items].sort((a, b) => {
    const ra = rank.get(a.path);
    const rb = rank.get(b.path);
    if (typeof ra === 'number' && typeof rb === 'number') return ra - rb;
    if (typeof ra === 'number') return -1;
    if (typeof rb === 'number') return 1;
    return a.createdAt - b.createdAt;
  });
}

function coerceFileName(raw: string): string {
  const trimmed = raw.trim();
  if (!trimmed) return '';
  if (trimmed.toLowerCase().endsWith('.md')) return trimmed;
  return `${trimmed}.md`;
}

function getBasename(filePath: string): string {
  const normalized = filePath.trim();
  if (!normalized) return '';
  const parts = normalized.split('/');
  return parts[parts.length - 1] ?? normalized;
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
  moveFiles: (dragIds: readonly string[], index: number) => void;
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
      const sorted = sortByUserOrder(items);
      persistDocumentOrder(sorted.map((item) => item.path));
      setData(buildDocumentTree(sorted));
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
      if (newName === getBasename(oldPath)) return { path: oldPath };

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

  const moveFiles = useCallback((dragIds: readonly string[], index: number) => {
    if (dragIds.length === 0) return;

    setData((prev) => {
      const root = prev.find((node) => node.id === 'documents');
      if (!root || !root.children) return prev;

      const children = [...root.children];
      const dragged = new Set(dragIds);

      const moving: FileNode[] = [];
      const remaining: FileNode[] = [];
      for (const child of children) {
        if (dragged.has(child.id)) moving.push(child);
        else remaining.push(child);
      }

      const clampedIndex = Math.max(0, Math.min(index, remaining.length));
      const nextChildren = [...remaining.slice(0, clampedIndex), ...moving, ...remaining.slice(clampedIndex)];

      persistDocumentOrder(nextChildren.map((child) => child.path));

      return prev.map((node) => (node.id === 'documents' ? { ...node, children: nextChildren } : node));
    });
  }, []);

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
    moveFiles,
  };
}

export default useFileTree;
