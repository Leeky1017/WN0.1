import React, { useState } from 'react';
import { Columns, Edit3, Eye, Focus, MoreHorizontal, X } from 'lucide-react';
import type { Editor as TipTapEditor } from '@tiptap/react';

import type { ViewMode } from '../../App';
import { IpcError } from '../../lib/ipc';
import { toUserMessage } from '../../lib/errors';
import { useEditorStore, type EditorTabId } from '../../stores/editorStore';
import { usePreferencesStore } from '../../stores/preferencesStore';
import { DropdownMenu, DropdownMenuItem, DropdownMenuSeparator } from '../ui/dropdown-menu';
import {
  ContextMenu,
  ContextMenuContent,
  ContextMenuItem,
  ContextMenuSeparator,
  ContextMenuTrigger,
} from '../ui/context-menu';
import { WnButton, WnDialog } from '../wn';
import { Toolbar } from './Toolbar';

type PendingClose = {
  tabIds: EditorTabId[];
  title: string;
  description: string;
};

type TabToolbarProps = {
  viewMode: ViewMode;
  onViewModeChange: (mode: ViewMode) => void;
  editorMode: 'markdown' | 'richtext';
  onEditorModeChange: (mode: 'markdown' | 'richtext') => void;
  richtextEditor: TipTapEditor | null;
};

function getShortcutKeyLabel() {
  return window.writenow?.platform === 'darwin' ? '⌘' : 'Ctrl';
}

function getTabLabel(path: string) {
  const base = path.split(/[/\\\\]/).pop();
  return base || path;
}

function toErrorMessage(error: unknown) {
  if (error instanceof IpcError) return toUserMessage(error.code, error.message);
  if (error instanceof Error) return error.message;
  return String(error);
}

/**
 * Why: Merge TabBar + Toolbar into a single row to reclaim vertical space,
 * while keeping multi-tab actions (switch/close/reorder/overflow) discoverable.
 */
export function TabToolbar({ viewMode, onViewModeChange, editorMode, onEditorModeChange, richtextEditor }: TabToolbarProps) {
  const openTabs = useEditorStore((s) => s.openTabs);
  const activeTabId = useEditorStore((s) => s.activeTabId);
  const dirtyMap = useEditorStore((s) => s.dirtyMap);

  const activateTab = useEditorStore((s) => s.activateTab);
  const reorderTabs = useEditorStore((s) => s.reorderTabs);
  const closeTab = useEditorStore((s) => s.closeTab);
  const closeSavedTabs = useEditorStore((s) => s.closeSavedTabs);
  const save = useEditorStore((s) => s.save);

  const typewriterEnabled = usePreferencesStore((s) => s.flow.typewriterEnabled);
  const typewriterTolerancePx = usePreferencesStore((s) => s.flow.typewriterTolerancePx);
  const paragraphFocusEnabled = usePreferencesStore((s) => s.flow.paragraphFocusEnabled);
  const paragraphFocusDimOpacity = usePreferencesStore((s) => s.flow.paragraphFocusDimOpacity);
  const zenEnabled = usePreferencesStore((s) => s.flow.zenEnabled);

  const toggleTypewriter = usePreferencesStore((s) => s.toggleTypewriter);
  const setTypewriterTolerancePx = usePreferencesStore((s) => s.setTypewriterTolerancePx);
  const toggleParagraphFocus = usePreferencesStore((s) => s.toggleParagraphFocus);
  const setParagraphFocusDimOpacity = usePreferencesStore((s) => s.setParagraphFocusDimOpacity);
  const toggleZen = usePreferencesStore((s) => s.toggleZen);

  const [pendingClose, setPendingClose] = useState<PendingClose | null>(null);
  const [closeBusy, setCloseBusy] = useState(false);
  const [closeError, setCloseError] = useState<string | null>(null);

  const requestCloseTabs = (tabIds: EditorTabId[], title: string, description: string) => {
    if (tabIds.length === 0) return;
    setCloseError(null);
    setPendingClose({ tabIds, title, description });
  };

  const requestCloseTab = (tabId: EditorTabId) => {
    if (!dirtyMap[tabId]) {
      closeTab(tabId);
      return;
    }

    const tab = openTabs.find((t) => t.id === tabId);
    const label = tab ? getTabLabel(tab.path) : tabId;
    requestCloseTabs([tabId], '关闭未保存的文档？', `“${label}” 有未保存的更改。`);
  };

  const closeOtherTabs = (anchorId: EditorTabId) => {
    const others = openTabs.filter((t) => t.id !== anchorId).map((t) => t.id);
    if (others.length === 0) return;

    const dirtyOthers = others.filter((id) => dirtyMap[id]);
    const savedOthers = others.filter((id) => !dirtyMap[id]);

    for (const id of savedOthers) closeTab(id);

    if (dirtyOthers.length === 0) return;
    requestCloseTabs(dirtyOthers, '关闭其他未保存的标签？', `还有 ${dirtyOthers.length} 个标签未保存。选择“保存并关闭”或“直接关闭”。`);
  };

  const handleSaveAndClose = async () => {
    const pending = pendingClose;
    if (!pending) return;

    setCloseBusy(true);
    setCloseError(null);
    try {
      for (const tabId of pending.tabIds) {
        await save(tabId);
      }
      for (const tabId of pending.tabIds) {
        closeTab(tabId);
      }
      setPendingClose(null);
    } catch (error) {
      setCloseError(toErrorMessage(error));
    } finally {
      setCloseBusy(false);
    }
  };

  const handleDiscardAndClose = () => {
    const pending = pendingClose;
    if (!pending) return;
    for (const tabId of pending.tabIds) {
      closeTab(tabId);
    }
    setPendingClose(null);
  };

  return (
    <>
      <div
        className="h-10 bg-[var(--bg-secondary)] border-b border-[var(--border-subtle)] flex items-center gap-2 px-2"
        data-zen-chrome
      >
        <div className="flex items-center min-w-0 flex-1 gap-1" data-testid="editor-tabbar">
          <div className="flex items-center gap-1 overflow-x-auto min-w-0 flex-1 pr-1">
            {openTabs.map((tab) => {
              const label = getTabLabel(tab.path);
              const active = tab.id === activeTabId;
              const dirty = Boolean(dirtyMap[tab.id]);

              return (
                <ContextMenu key={tab.id}>
                  <ContextMenuTrigger asChild>
                    <div
                      role="button"
                      tabIndex={0}
                      draggable
                      onDragStart={(e) => {
                        e.dataTransfer.effectAllowed = 'move';
                        e.dataTransfer.setData('text/plain', tab.id);
                      }}
                      onDragOver={(e) => {
                        e.preventDefault();
                        e.dataTransfer.dropEffect = 'move';
                      }}
                      onDrop={(e) => {
                        e.preventDefault();
                        const fromId = e.dataTransfer.getData('text/plain');
                        reorderTabs(fromId, tab.id);
                      }}
                      onClick={() => activateTab(tab.id)}
                      onKeyDown={(e) => {
                        if (e.key !== 'Enter' && e.key !== ' ') return;
                        e.preventDefault();
                        activateTab(tab.id);
                      }}
                      className={[
                        'h-7 px-2 rounded-md flex items-center gap-2 flex-none max-w-[220px] min-w-[96px] transition-colors cursor-pointer',
                        active
                          ? 'bg-[var(--bg-tertiary)] text-[var(--text-primary)]'
                          : 'text-[var(--text-secondary)] hover:bg-[var(--bg-hover)]',
                      ].join(' ')}
                      title={tab.path}
                      aria-label={label}
                      data-testid={`editor-tab-${tab.id}`}
                    >
                      <span className="truncate text-[12px] flex-1 min-w-0">{label}</span>
                      {dirty && (
                        <span
                          className="inline-block shrink-0 rounded-full bg-[var(--accent-primary)]"
                          style={{ width: 6, height: 6 }}
                          title="未保存"
                          aria-label="Unsaved changes"
                        />
                      )}
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          requestCloseTab(tab.id);
                        }}
                        className="w-5 h-5 flex items-center justify-center rounded-md hover:bg-[var(--bg-hover)] text-[var(--text-tertiary)] transition-colors flex-none"
                        title="关闭"
                        aria-label={`Close ${label}`}
                      >
                        <X className="w-3 h-3" />
                      </button>
                    </div>
                  </ContextMenuTrigger>

                  <ContextMenuContent className="min-w-[200px]">
                    <ContextMenuItem onSelect={() => requestCloseTab(tab.id)}>关闭</ContextMenuItem>
                    <ContextMenuItem onSelect={() => closeOtherTabs(tab.id)}>关闭其他</ContextMenuItem>
                    <ContextMenuItem onSelect={() => closeSavedTabs()}>关闭已保存</ContextMenuItem>
                    <ContextMenuSeparator />
                    <ContextMenuItem
                      onSelect={() => save(tab.id).catch(() => undefined)}
                      disabled={!dirty}
                    >
                      保存
                    </ContextMenuItem>
                  </ContextMenuContent>
                </ContextMenu>
              );
            })}
          </div>

          <DropdownMenu
            side="bottom"
            align="end"
            trigger={
              <button
                type="button"
                className="w-7 h-7 flex items-center justify-center rounded-md hover:bg-[var(--bg-hover)] text-[var(--text-tertiary)] transition-colors flex-none"
                title="标签菜单"
                aria-label="Tabs menu"
              >
                <MoreHorizontal className="w-4 h-4" />
              </button>
            }
          >
            {openTabs.length === 0 ? (
              <DropdownMenuItem disabled>无打开标签</DropdownMenuItem>
            ) : (
              <>
                {openTabs.map((tab) => {
                  const label = getTabLabel(tab.path);
                  const active = tab.id === activeTabId;
                  return (
                    <DropdownMenuItem
                      key={tab.id}
                      onClick={() => activateTab(tab.id)}
                      className={active ? 'text-[var(--text-primary)]' : ''}
                    >
                      <span className="truncate">{label}</span>
                      {active ? <span className="ml-auto text-[10px] text-[var(--text-tertiary)]">当前</span> : null}
                    </DropdownMenuItem>
                  );
                })}
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={() => closeSavedTabs()}>关闭已保存</DropdownMenuItem>
              </>
            )}
          </DropdownMenu>
        </div>

        <div className="flex items-center gap-1 flex-none">
          <button
            onClick={() => onEditorModeChange('markdown')}
            className={[
              'h-7 px-2.5 rounded-md text-[11px] transition-colors',
              editorMode === 'markdown'
                ? 'bg-[var(--bg-tertiary)] text-[var(--text-primary)]'
                : 'text-[var(--text-secondary)] hover:bg-[var(--bg-hover)]',
            ].join(' ')}
            title={`Markdown（${getShortcutKeyLabel()}+S 保存）`}
          >
            Markdown
          </button>
          <button
            onClick={() => onEditorModeChange('richtext')}
            className={[
              'h-7 px-2.5 rounded-md text-[11px] transition-colors',
              editorMode === 'richtext'
                ? 'bg-[var(--bg-tertiary)] text-[var(--text-primary)]'
                : 'text-[var(--text-secondary)] hover:bg-[var(--bg-hover)]',
            ].join(' ')}
          >
            Rich Text
          </button>

          {editorMode === 'richtext' && (
            <>
              <div className="w-px h-5 bg-[var(--border-subtle)] mx-1" />
              <Toolbar editor={richtextEditor} />
            </>
          )}

          <div className="w-px h-5 bg-[var(--border-subtle)] mx-1" />

          <button
            onClick={() => onViewModeChange('edit')}
            className={[
              'h-7 px-2 rounded-md text-[11px] flex items-center gap-1 transition-colors',
              viewMode === 'edit'
                ? 'bg-[var(--bg-tertiary)] text-[var(--text-primary)]'
                : 'text-[var(--text-secondary)] hover:bg-[var(--bg-hover)]',
            ].join(' ')}
          >
            <Edit3 className="w-3 h-3" />
            Edit
          </button>
          <button
            onClick={() => onViewModeChange('preview')}
            className={[
              'h-7 px-2 rounded-md text-[11px] flex items-center gap-1 transition-colors',
              viewMode === 'preview'
                ? 'bg-[var(--bg-tertiary)] text-[var(--text-primary)]'
                : 'text-[var(--text-secondary)] hover:bg-[var(--bg-hover)]',
            ].join(' ')}
          >
            <Eye className="w-3 h-3" />
            Preview
          </button>
          <button
            onClick={() => onViewModeChange('split')}
            className={[
              'h-7 px-2 rounded-md text-[11px] flex items-center gap-1 transition-colors',
              viewMode === 'split'
                ? 'bg-[var(--bg-tertiary)] text-[var(--text-primary)]'
                : 'text-[var(--text-secondary)] hover:bg-[var(--bg-hover)]',
            ].join(' ')}
          >
            <Columns className="w-3 h-3" />
            Split
          </button>

          <DropdownMenu
            side="bottom"
            align="end"
            trigger={
              <button
                type="button"
                className="w-7 h-7 flex items-center justify-center rounded-md hover:bg-[var(--bg-hover)] text-[var(--text-tertiary)] transition-colors"
                title="心流模式"
                aria-label="Flow modes"
                data-testid="flow-menu"
              >
                <Focus className="w-4 h-4" />
              </button>
            }
          >
            <DropdownMenuItem
              onClick={() => toggleTypewriter()}
              data-testid="toggle-typewriter"
            >
              <span className="w-4 inline-block">{typewriterEnabled ? '✓' : ''}</span>
              Typewriter
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => setTypewriterTolerancePx(48)} disabled={!typewriterEnabled}>
              <span className="w-4 inline-block">{typewriterTolerancePx === 48 ? '•' : ''}</span>
              Typewriter：紧
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => setTypewriterTolerancePx(72)} disabled={!typewriterEnabled}>
              <span className="w-4 inline-block">{typewriterTolerancePx === 72 ? '•' : ''}</span>
              Typewriter：中
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => setTypewriterTolerancePx(96)} disabled={!typewriterEnabled}>
              <span className="w-4 inline-block">{typewriterTolerancePx === 96 ? '•' : ''}</span>
              Typewriter：宽
            </DropdownMenuItem>

            <DropdownMenuSeparator />

            <DropdownMenuItem onClick={() => toggleParagraphFocus()} data-testid="toggle-paragraph-focus">
              <span className="w-4 inline-block">{paragraphFocusEnabled ? '✓' : ''}</span>
              Paragraph Focus
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => setParagraphFocusDimOpacity(0.6)} disabled={!paragraphFocusEnabled}>
              <span className="w-4 inline-block">{paragraphFocusDimOpacity === 0.6 ? '•' : ''}</span>
              Focus：浅
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => setParagraphFocusDimOpacity(0.35)} disabled={!paragraphFocusEnabled}>
              <span className="w-4 inline-block">{paragraphFocusDimOpacity === 0.35 ? '•' : ''}</span>
              Focus：中
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => setParagraphFocusDimOpacity(0.2)} disabled={!paragraphFocusEnabled}>
              <span className="w-4 inline-block">{paragraphFocusDimOpacity === 0.2 ? '•' : ''}</span>
              Focus：强
            </DropdownMenuItem>

            <DropdownMenuSeparator />

            <DropdownMenuItem onClick={() => toggleZen()} data-testid="toggle-zen">
              <span className="w-4 inline-block">{zenEnabled ? '✓' : ''}</span>
              Zen
            </DropdownMenuItem>
          </DropdownMenu>
        </div>
      </div>

      <WnDialog
        isOpen={pendingClose !== null}
        onOpenChange={(open) => {
          if (open) return;
          setPendingClose(null);
        }}
        title={pendingClose?.title}
        description={pendingClose?.description}
        footer={
          <div className="flex items-center justify-end gap-2">
            <WnButton variant="ghost" onClick={() => setPendingClose(null)} isDisabled={closeBusy}>
              取消
            </WnButton>
            <WnButton variant="ghost" onClick={handleDiscardAndClose} isDisabled={closeBusy}>
              直接关闭
            </WnButton>
            <WnButton onClick={() => handleSaveAndClose().catch(() => undefined)} isDisabled={closeBusy}>
              保存并关闭
            </WnButton>
          </div>
        }
      >
        {closeError && <div className="text-[12px] text-red-400">{closeError}</div>}
        {!closeError && pendingClose && pendingClose.tabIds.length > 1 && (
          <div className="text-[12px] text-[var(--text-tertiary)]">将操作 {pendingClose.tabIds.length} 个未保存标签。</div>
        )}
        {!closeError && pendingClose && pendingClose.tabIds.length === 1 && (
          <div className="text-[12px] text-[var(--text-tertiary)]">未保存更改可能会丢失。</div>
        )}
      </WnDialog>
    </>
  );
}
