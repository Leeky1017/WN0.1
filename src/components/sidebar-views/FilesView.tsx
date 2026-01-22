import React, { useEffect, useMemo, useRef, useState } from 'react';
import { ChevronRight, ChevronDown, FileText, Plus, MoreHorizontal, Trash2 } from 'lucide-react';
import { useTranslation } from 'react-i18next';

import { useFilesStore } from '../../stores/filesStore';
import { useEditorStore } from '../../stores/editorStore';

interface FilesViewProps {
  selectedFile: string | null;
  onSelectFile: (file: string) => void | Promise<void>;
}

type FileNode =
  | {
      type: 'folder';
      name: string;
      children: FileNode[];
    }
  | {
      type: 'file';
      name: string;
      path: string;
      createdAt: number;
      wordCount: number;
    };

export function FilesView({ selectedFile, onSelectFile }: FilesViewProps) {
  const { t } = useTranslation();
  const [expandedFolders, setExpandedFolders] = useState<Set<string>>(new Set(['创作项目']));
  const [createOpen, setCreateOpen] = useState(false);
  const [createName, setCreateName] = useState('未命名');
  const [createError, setCreateError] = useState<string | null>(null);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [deleteTargetPath, setDeleteTargetPath] = useState<string | null>(null);
  const [deleteError, setDeleteError] = useState<string | null>(null);
  const createInputRef = useRef<HTMLInputElement>(null);
  const files = useFilesStore((s) => s.files);
  const isLoading = useFilesStore((s) => s.isLoading);
  const error = useFilesStore((s) => s.error);
  const refresh = useFilesStore((s) => s.refresh);
  const createFile = useFilesStore((s) => s.createFile);
  const deleteFile = useFilesStore((s) => s.deleteFile);

  useEffect(() => {
    refresh().catch(() => undefined);
  }, [refresh]);

  const fileTree: FileNode[] = useMemo(() => {
    return [
      {
        name: '创作项目',
        type: 'folder',
        children: files.map((f) => ({
          type: 'file',
          name: f.name,
          path: f.path,
          createdAt: f.createdAt,
          wordCount: f.wordCount,
        })),
      },
    ];
  }, [files]);

  const toggleFolder = (folderName: string) => {
    const newExpanded = new Set(expandedFolders);
    if (newExpanded.has(folderName)) {
      newExpanded.delete(folderName);
    } else {
      newExpanded.add(folderName);
    }
    setExpandedFolders(newExpanded);
  };

  const renderNode = (node: FileNode, depth = 0) => {
    const isExpanded = expandedFolders.has(node.name);
    const isSelected = node.type === 'file' ? selectedFile === node.path : false;
    const paddingLeft = depth * 12 + 8;

    if (node.type === 'folder') {
      return (
        <div key={node.name}>
          <button
            onClick={() => toggleFolder(node.name)}
            className="w-full flex items-center gap-1 py-1 hover:bg-[var(--bg-hover)] transition-colors text-[13px] text-[var(--text-secondary)]"
            style={{ paddingLeft: `${paddingLeft}px` }}
          >
            {isExpanded ? (
              <ChevronDown className="w-4 h-4 flex-shrink-0" />
            ) : (
              <ChevronRight className="w-4 h-4 flex-shrink-0" />
            )}
            <span className="truncate">{node.name}</span>
          </button>
          {isExpanded && node.children && (
            <div>
              {node.children.map((child) => renderNode(child, depth + 1))}
            </div>
          )}
        </div>
      );
    } else {
      return (
        <button
          key={node.path}
          onClick={() => onSelectFile(node.path)}
          className={`w-full flex items-center gap-2 py-1 hover:bg-[var(--bg-hover)] transition-colors text-[13px] ${
            isSelected ? 'bg-[var(--bg-active)] text-[var(--text-primary)]' : 'text-[var(--text-secondary)]'
          }`}
          style={{ paddingLeft: `${paddingLeft + 4}px` }}
        >
          <FileText className="w-4 h-4 flex-shrink-0" />
          <span className="truncate flex-1 min-w-0">{node.name}</span>
          <span className="text-[11px] text-[var(--text-tertiary)] tabular-nums">
            {node.wordCount}
            {t('files.wordCountSuffix')}
          </span>
        </button>
      );
    }
  };

  const openCreate = () => {
    setCreateError(null);
    setCreateName(t('files.untitled'));
    setCreateOpen(true);

    window.setTimeout(() => {
      createInputRef.current?.focus();
      createInputRef.current?.select();
    }, 0);
  };

  const submitCreate = async () => {
    setCreateError(null);
    const name = createName.trim() || t('files.untitled');
    const created = await createFile(name);
    if (!created) {
      setCreateError(useFilesStore.getState().error ?? t('files.createFailed'));
      return;
    }
    setCreateOpen(false);
    await onSelectFile(created.path);
  };

  const openDelete = () => {
    if (!selectedFile) return;
    setDeleteError(null);
    setDeleteTargetPath(selectedFile);
    setDeleteOpen(true);
  };

  const closeDelete = () => {
    setDeleteOpen(false);
    setDeleteTargetPath(null);
    setDeleteError(null);
  };

  const submitDelete = async () => {
    if (!deleteTargetPath) return;
    setDeleteError(null);
    await deleteFile(deleteTargetPath);
    const nextError = useFilesStore.getState().error;
    if (nextError) {
      setDeleteError(nextError);
      return;
    }

    const editorState = useEditorStore.getState();
    const tab = editorState.openTabs.find((t) => t.path === deleteTargetPath);
    if (tab) editorState.closeTab(tab.id);

    closeDelete();
  };

  return (
    <>
      <div className="h-11 flex items-center justify-between px-3 border-b border-[var(--border-subtle)]">
        <span className="text-[11px] uppercase text-[var(--text-tertiary)] font-medium tracking-wide">{t('nav.files')}</span>
        <div className="flex items-center gap-1">
          <button
            onClick={openDelete}
            className="w-6 h-6 flex items-center justify-center rounded hover:bg-[var(--bg-hover)] transition-colors disabled:opacity-50"
            title={t('files.deleteFileTitle')}
            disabled={!selectedFile || isLoading}
          >
            <Trash2 className="w-4 h-4 text-[var(--text-tertiary)]" />
          </button>
          <button
            onClick={openCreate}
            className="w-6 h-6 flex items-center justify-center rounded hover:bg-[var(--bg-hover)] transition-colors"
            title={t('files.newFile')}
          >
            <Plus className="w-4 h-4 text-[var(--text-tertiary)]" />
          </button>
          <button
            onClick={() => refresh().catch(() => undefined)}
            className="w-6 h-6 flex items-center justify-center rounded hover:bg-[var(--bg-hover)] transition-colors"
            title={t('common.refresh')}
          >
            <MoreHorizontal className="w-4 h-4 text-[var(--text-tertiary)]" />
          </button>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto py-1">
        {error && (
          <div className="px-3 py-3 text-[12px] text-[var(--text-tertiary)]">
            <div className="mb-2">{t('files.loadFailed', { error })}</div>
            <button
              onClick={() => refresh().catch(() => undefined)}
              className="h-7 px-2 rounded-md bg-[var(--bg-tertiary)] hover:bg-[var(--bg-hover)] text-[12px] text-[var(--text-secondary)] transition-colors"
            >
              {t('common.retry')}
            </button>
          </div>
        )}

        {!error && isLoading && files.length === 0 && (
          <div className="px-3 py-3 text-[12px] text-[var(--text-tertiary)]">{t('common.loading')}</div>
        )}

        {!error && !isLoading && files.length === 0 && (
          <div className="px-3 py-6 text-center">
            <div className="text-[13px] text-[var(--text-tertiary)] mb-1">{t('files.empty.title')}</div>
            <div className="text-[11px] text-[var(--text-tertiary)]">{t('files.empty.hint')}</div>
          </div>
        )}

        {!error && files.length > 0 && fileTree.map((node) => renderNode(node))}
      </div>

      {createOpen && (
        <div
          className="fixed inset-0 bg-black/50 flex items-center justify-center z-50"
          onMouseDown={() => setCreateOpen(false)}
        >
          <div className="wn-elevated p-5 w-[380px]" onMouseDown={(e) => e.stopPropagation()}>
            <div className="text-[15px] text-[var(--text-primary)] mb-3">{t('files.newArticle')}</div>
            <div className="text-[12px] text-[var(--text-tertiary)] mb-2">{t('files.supportsMarkdown')}</div>
            <input
              ref={createInputRef}
              value={createName}
              onChange={(e) => setCreateName(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') submitCreate().catch(() => undefined);
                if (e.key === 'Escape') setCreateOpen(false);
              }}
              className="w-full h-8 px-3 bg-[var(--bg-tertiary)] border border-[var(--border-default)] rounded text-[13px] text-[var(--text-primary)] outline-none focus:border-[var(--accent-primary)]"
              placeholder={t('files.untitled')}
              spellCheck={false}
            />
            {createError && <div className="mt-2 text-[12px] text-red-400">{createError}</div>}
            <div className="flex gap-2 mt-4">
              <button
                onClick={() => submitCreate().catch(() => undefined)}
                className="flex-1 h-8 px-3 bg-[var(--accent-primary)] hover:bg-[var(--accent-hover)] rounded-md text-[13px] text-white transition-colors disabled:opacity-60"
                disabled={isLoading}
              >
                {t('common.create')}
              </button>
              <button
                onClick={() => setCreateOpen(false)}
                className="flex-1 h-8 px-3 bg-[var(--bg-tertiary)] hover:bg-[var(--bg-hover)] rounded-md text-[13px] text-[var(--text-secondary)] transition-colors"
              >
                {t('common.cancel')}
              </button>
            </div>
          </div>
        </div>
      )}

      {deleteOpen && deleteTargetPath && (
        <div
          className="fixed inset-0 bg-black/50 flex items-center justify-center z-50"
          onMouseDown={closeDelete}
        >
          <div className="wn-elevated p-5 w-[420px]" onMouseDown={(e) => e.stopPropagation()}>
            <div className="text-[15px] text-[var(--text-primary)] mb-3">{t('files.deleteDialog.title')}</div>
            <div className="text-[12px] text-[var(--text-tertiary)] mb-3 leading-relaxed">
              {t('files.deleteDialog.permanentDeletePrefix')}
              <span className="text-[var(--text-secondary)]">{deleteTargetPath}</span>
            </div>
            {deleteError && <div className="mt-2 text-[12px] text-red-400">{deleteError}</div>}
            <div className="flex gap-2 mt-4">
              <button
                onClick={() => submitDelete().catch(() => undefined)}
                className="flex-1 h-8 px-3 bg-red-600 hover:bg-red-500 rounded-md text-[13px] text-white transition-colors disabled:opacity-60"
                disabled={isLoading}
              >
                {t('common.delete')}
              </button>
              <button
                onClick={closeDelete}
                className="flex-1 h-8 px-3 bg-[var(--bg-tertiary)] hover:bg-[var(--bg-hover)] rounded-md text-[13px] text-[var(--text-secondary)] transition-colors"
                disabled={isLoading}
              >
                {t('common.cancel')}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
