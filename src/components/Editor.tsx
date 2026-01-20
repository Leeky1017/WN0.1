import React, { useState, useEffect, useRef } from 'react';
import { X, MoreHorizontal, Eye, Edit3, Columns, Bold, Italic, Underline, List, ListOrdered, Type, Heading1, Heading2, Heading3 } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import type { EditorMode, ViewMode } from '../App';

import { useEditorStore } from '../stores/editorStore';

interface EditorProps {
  editorMode: EditorMode;
  viewMode: ViewMode;
  onEditorModeChange: (mode: EditorMode) => void;
  onViewModeChange: (mode: ViewMode) => void;
  focusMode: boolean;
  onFocusModeToggle: () => void;
}

interface FloatingToolbarPosition {
  top: number;
  left: number;
}

export function Editor({ editorMode, viewMode, onEditorModeChange, onViewModeChange, focusMode, onFocusModeToggle }: EditorProps) {
  const { i18n, t } = useTranslation();
  const selectedFile = useEditorStore((s) => s.currentPath);
  const content = useEditorStore((s) => s.content);
  const isDirty = useEditorStore((s) => s.isDirty);
  const isLoading = useEditorStore((s) => s.isLoading);
  const loadError = useEditorStore((s) => s.loadError);
  const saveStatus = useEditorStore((s) => s.saveStatus);
  const lastSavedAt = useEditorStore((s) => s.lastSavedAt);
  const setContent = useEditorStore((s) => s.setContent);
  const save = useEditorStore((s) => s.save);
  const closeFile = useEditorStore((s) => s.closeFile);

  const [lineCount, setLineCount] = useState(1);
  const [showFloatingToolbar, setShowFloatingToolbar] = useState(false);
  const [toolbarPosition, setToolbarPosition] = useState<FloatingToolbarPosition>({ top: 0, left: 0 });
  const [fontSize, setFontSize] = useState(16);
  const [showFontSizeMenu, setShowFontSizeMenu] = useState(false);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const contentEditableRef = useRef<HTMLDivElement>(null);
  const toolbarRef = useRef<HTMLDivElement>(null);
  const autosaveTimerRef = useRef<number | null>(null);
  const isSaved = saveStatus === 'saved' && !isDirty;

  useEffect(() => {
    if (selectedFile) {
      if (selectedFile.endsWith('.md')) {
        onEditorModeChange('markdown');
      }
    }
  }, [selectedFile, onEditorModeChange]);

  useEffect(() => {
    setLineCount(content.split('\n').length);
  }, [content]);

  useEffect(() => {
    if (!selectedFile) return;
    if (!isDirty) return;

    if (autosaveTimerRef.current) {
      window.clearTimeout(autosaveTimerRef.current);
    }

    autosaveTimerRef.current = window.setTimeout(() => {
      save().catch(() => undefined);
    }, 2000);

    return () => {
      if (autosaveTimerRef.current) window.clearTimeout(autosaveTimerRef.current);
      autosaveTimerRef.current = null;
    };
  }, [content, isDirty, save, selectedFile]);

  const handleTextSelection = () => {
    if (editorMode !== 'word') return;
    
    const selection = window.getSelection();
    const selectedText = selection?.toString();
    
    if (selectedText && selectedText.trim().length > 0) {
      const range = selection?.getRangeAt(0);
      const rect = range?.getBoundingClientRect();
      
      if (rect) {
        setToolbarPosition({
          top: rect.top + window.scrollY - 50,
          left: rect.left + window.scrollX + rect.width / 2,
        });
        setShowFloatingToolbar(true);
      }
    } else {
      setShowFloatingToolbar(false);
    }
  };

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (toolbarRef.current && !toolbarRef.current.contains(e.target as Node)) {
        if (!window.getSelection()?.toString()) {
          setShowFloatingToolbar(false);
        }
      }
    };
    
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  if (!selectedFile) {
    return (
      <div className="flex-1 flex items-center justify-center bg-[var(--bg-primary)]">
        <div className="text-center">
          <div className="text-[13px] text-[var(--text-tertiary)] mb-1">{t('editor.noFileSelected.title')}</div>
          <div className="text-[11px] text-[var(--text-tertiary)]">{t('editor.noFileSelected.hint')}</div>
        </div>
      </div>
    );
  }

  const renderPreview = () => (
    <div className="p-8 max-w-3xl mx-auto">
      <div className="whitespace-pre-wrap text-[15px] text-[var(--text-secondary)] leading-[1.6]">
        {content}
      </div>
    </div>
  );

  const applyFormat = (format: string) => {
    document.execCommand(format, false);
    setShowFontSizeMenu(false);
  };

  const applyHeading = (level: number) => {
    document.execCommand('formatBlock', false, `h${level}`);
  };

  const handleContentEditableInput = () => {
    if (contentEditableRef.current) {
      const text = contentEditableRef.current.innerText;
      setContent(text);
    }
  };

  const renderEditor = () => {
    if (editorMode === 'markdown') {
      return (
        <div className="flex-1 flex overflow-hidden">
          <div className="bg-[var(--bg-secondary)] wn-text-quaternary text-right pr-3 pl-3 py-3 text-[13px] leading-[1.6] font-mono select-none border-r border-[var(--border-subtle)] min-w-[50px]">
            {Array.from({ length: lineCount }, (_, i) => (
              <div key={i + 1}>{i + 1}</div>
            ))}
          </div>
          <div className="flex-1 overflow-auto">
            <textarea
              ref={textareaRef}
              value={content}
              onChange={(e) => {
                setContent(e.target.value);
              }}
              className="w-full h-full bg-transparent text-[var(--text-primary)] outline-none resize-none px-4 py-3 leading-[1.6] font-mono text-[13px]"
              placeholder={t('editor.placeholderMarkdown')}
              spellCheck={false}
            />
          </div>
        </div>
      );
    } else {
      return (
        <div className="flex-1 overflow-auto">
          <div className="max-w-4xl mx-auto px-4 py-8">
            <div
              ref={contentEditableRef}
              contentEditable
              onInput={handleContentEditableInput}
              onMouseUp={handleTextSelection}
              onKeyUp={handleTextSelection}
              className="outline-none text-[var(--text-primary)] leading-[1.8] min-h-[500px] font-sans"
              style={{ fontSize: `${fontSize}px` }}
              dangerouslySetInnerHTML={{ __html: content.replace(/\n/g, '<br>') }}
              spellCheck={false}
            />
          </div>
        </div>
      );
    }
  };

  return (
    <div className="flex-1 flex flex-col bg-[var(--bg-primary)]">
      {/* Tab Bar */}
      {!focusMode && (
        <div className="h-9 bg-[var(--bg-secondary)] border-b border-[var(--border-subtle)] flex items-center">
          <div className="flex items-center gap-2 px-3 h-full bg-[var(--bg-tertiary)] border-r border-[var(--border-subtle)]">
            <span className="text-[13px] text-[var(--text-secondary)]">{selectedFile}</span>
            <button
              onClick={() => closeFile()}
              className="w-5 h-5 flex items-center justify-center rounded-md hover:bg-[var(--bg-hover)] text-[var(--text-tertiary)] transition-colors"
              title={t('common.close')}
            >
              <X className="w-3 h-3" />
            </button>
          </div>
          <div className="flex-1" />
          <div className="text-[11px] text-[var(--text-tertiary)] mr-3">
            {isSaved ? t('editor.save.saved') : t('editor.save.saving')}
            {isSaved && lastSavedAt
              ? ` · ${new Date(lastSavedAt).toLocaleTimeString(i18n.language, { hour: '2-digit', minute: '2-digit' })}`
              : ''}
          </div>
          <button 
            onClick={onFocusModeToggle}
            className="h-7 px-2 mr-1 rounded-md hover:bg-[var(--bg-hover)] text-xs text-[var(--text-tertiary)] transition-colors"
          >
            {t('app.focus.enter')}
          </button>
          <button className="w-7 h-7 flex items-center justify-center rounded-md hover:bg-[var(--bg-hover)] text-[var(--text-tertiary)] transition-colors mr-1">
            <MoreHorizontal className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* Toolbar */}
      {!focusMode && (
        <div className="h-10 bg-[var(--bg-secondary)] border-b border-[var(--border-subtle)] flex items-center justify-between px-3">
          <div className="flex items-center gap-2">
            <button
              onClick={() => onEditorModeChange('markdown')}
              className={`h-6 px-2.5 rounded-md text-xs transition-colors ${
                editorMode === 'markdown'
                  ? 'bg-[var(--bg-active)] text-[var(--text-primary)]'
                  : 'text-[var(--text-secondary)] hover:bg-[var(--bg-hover)]'
              }`}
            >
              Markdown
            </button>
            <button
              onClick={() => onEditorModeChange('word')}
              className={`h-6 px-2.5 rounded-md text-xs transition-colors ${
                editorMode === 'word'
                  ? 'bg-[var(--bg-active)] text-[var(--text-primary)]'
                  : 'text-[var(--text-secondary)] hover:bg-[var(--bg-hover)]'
              }`}
            >
              Word
            </button>

            {editorMode === 'word' && (
              <>
                <div className="w-px h-4 bg-[var(--border-default)] mx-1" />
              </>
            )}
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => onViewModeChange('edit')}
              className={`h-6 px-2 rounded-md text-xs flex items-center gap-1 transition-colors ${
                viewMode === 'edit'
                  ? 'bg-[var(--bg-active)] text-[var(--text-primary)]'
                  : 'text-[var(--text-secondary)] hover:bg-[var(--bg-hover)]'
              }`}
            >
              <Edit3 className="w-3 h-3" />
              Edit
            </button>
            <button
              onClick={() => onViewModeChange('preview')}
              className={`h-6 px-2 rounded-md text-xs flex items-center gap-1 transition-colors ${
                viewMode === 'preview'
                  ? 'bg-[var(--bg-active)] text-[var(--text-primary)]'
                  : 'text-[var(--text-secondary)] hover:bg-[var(--bg-hover)]'
              }`}
            >
              <Eye className="w-3 h-3" />
              Preview
            </button>
            <button
              onClick={() => onViewModeChange('split')}
              className={`h-6 px-2 rounded-md text-xs flex items-center gap-1 transition-colors ${
                viewMode === 'split'
                  ? 'bg-[var(--bg-active)] text-[var(--text-primary)]'
                  : 'text-[var(--text-secondary)] hover:bg-[var(--bg-hover)]'
              }`}
            >
              <Columns className="w-3 h-3" />
              Split
            </button>
          </div>
        </div>
      )}

      {/* Floating Toolbar for Word Mode */}
      {showFloatingToolbar && editorMode === 'word' && (
        <div
          ref={toolbarRef}
          className="fixed wn-elevated rounded-md py-1.5 px-2 flex items-center gap-1 z-50"
          style={{
            top: `${toolbarPosition.top}px`,
            left: `${toolbarPosition.left}px`,
            transform: 'translateX(-50%)',
          }}
          onMouseDown={(e) => e.preventDefault()}
        >
          {/* Font Size */}
          <div className="relative">
            <button
              onClick={() => setShowFontSizeMenu(!showFontSizeMenu)}
              className="w-7 h-7 flex items-center justify-center rounded hover:bg-[var(--bg-hover)] transition-colors"
              title="字号"
            >
              <Type className="w-4 h-4 text-[var(--text-secondary)]" />
            </button>
            {showFontSizeMenu && (
              <div className="absolute bottom-full left-0 mb-1 bg-[var(--bg-secondary)] border border-[var(--border-default)] rounded shadow-lg py-1 w-20">
                {[12, 14, 16, 18, 20, 24, 28].map((size) => (
                  <button
                    key={size}
                    onClick={() => {
                      setFontSize(size);
                      setShowFontSizeMenu(false);
                    }}
                    className={`w-full px-3 py-1.5 text-[11px] hover:bg-[var(--bg-hover)] text-left transition-colors ${
                      fontSize === size ? 'text-[var(--accent-primary)]' : 'text-[var(--text-secondary)]'
                    }`}
                  >
                    {size}px
                  </button>
                ))}
              </div>
            )}
          </div>

          <div className="w-px h-4 bg-[var(--border-default)]" />

          {/* Bold */}
          <button
            onClick={() => applyFormat('bold')}
            className="w-7 h-7 flex items-center justify-center rounded hover:bg-[var(--bg-hover)] transition-colors"
            title="加粗"
          >
            <Bold className="w-4 h-4 text-[var(--text-secondary)]" />
          </button>

          {/* Italic */}
          <button
            onClick={() => applyFormat('italic')}
            className="w-7 h-7 flex items-center justify-center rounded hover:bg-[var(--bg-hover)] transition-colors"
            title="斜体"
          >
            <Italic className="w-4 h-4 text-[var(--text-secondary)]" />
          </button>

          {/* Underline */}
          <button
            onClick={() => applyFormat('underline')}
            className="w-7 h-7 flex items-center justify-center rounded hover:bg-[var(--bg-hover)] transition-colors"
            title="下划线"
          >
            <Underline className="w-4 h-4 text-[var(--text-secondary)]" />
          </button>

          <div className="w-px h-4 bg-[var(--border-default)]" />

          {/* Headings */}
          <button
            onClick={() => applyHeading(1)}
            className="w-7 h-7 flex items-center justify-center rounded hover:bg-[var(--bg-hover)] transition-colors"
            title="标题1"
          >
            <Heading1 className="w-4 h-4 text-[var(--text-secondary)]" />
          </button>
          <button
            onClick={() => applyHeading(2)}
            className="w-7 h-7 flex items-center justify-center rounded hover:bg-[var(--bg-hover)] transition-colors"
            title="标题2"
          >
            <Heading2 className="w-4 h-4 text-[var(--text-secondary)]" />
          </button>
          <button
            onClick={() => applyHeading(3)}
            className="w-7 h-7 flex items-center justify-center rounded hover:bg-[var(--bg-hover)] transition-colors"
            title="标题3"
          >
            <Heading3 className="w-4 h-4 text-[var(--text-secondary)]" />
          </button>

          <div className="w-px h-4 bg-[var(--border-default)]" />

          {/* Lists */}
          <button
            onClick={() => applyFormat('insertUnorderedList')}
            className="w-7 h-7 flex items-center justify-center rounded hover:bg-[var(--bg-hover)] transition-colors"
            title="无序列表"
          >
            <List className="w-4 h-4 text-[var(--text-secondary)]" />
          </button>
          <button
            onClick={() => applyFormat('insertOrderedList')}
            className="w-7 h-7 flex items-center justify-center rounded hover:bg-[var(--bg-hover)] transition-colors"
            title="有序列表"
          >
            <ListOrdered className="w-4 h-4 text-[var(--text-secondary)]" />
          </button>
        </div>
      )}

      {/* Editor Area */}
      <div className="flex-1 flex overflow-hidden">
        {viewMode === 'edit' && (
          <>
            {isLoading && (
              <div className="flex-1 flex items-center justify-center text-[13px] text-[var(--text-tertiary)]">
                正在加载...
              </div>
            )}
            {!isLoading && loadError && (
              <div className="flex-1 flex items-center justify-center p-6">
                <div className="text-center">
                  <div className="text-[13px] text-[var(--text-tertiary)] mb-2">加载失败</div>
                  <div className="text-[11px] text-[var(--text-tertiary)] mb-3">{loadError}</div>
                  <button
                    onClick={() => closeFile()}
                    className="h-7 px-2 rounded-md bg-[var(--bg-tertiary)] hover:bg-[var(--bg-hover)] text-[12px] text-[var(--text-secondary)] transition-colors"
                  >
                    关闭
                  </button>
                </div>
              </div>
            )}
            {!isLoading && !loadError && renderEditor()}
          </>
        )}

        {viewMode === 'preview' && (
          <div className="flex-1 overflow-auto">
            {renderPreview()}
          </div>
        )}

        {viewMode === 'split' && (
          <>
            <div className="flex-1 border-r border-[var(--border-subtle)] overflow-hidden">
              {renderEditor()}
            </div>
            <div className="flex-1 overflow-auto">
              {renderPreview()}
            </div>
          </>
        )}
      </div>

      {/* Status Bar */}
      <div className="h-6 bg-[var(--bg-secondary)] border-t border-[var(--border-subtle)] flex items-center justify-between px-3 text-[11px] text-[var(--text-tertiary)]">
        <div className="flex gap-3">
          <span>{editorMode === 'markdown' ? 'Markdown - 等宽字体, 显示行号' : 'Word - 富文本编辑'}</span>
          <span>UTF-8</span>
          {editorMode === 'word' && <span>{fontSize}px</span>}
        </div>
        <div className="flex gap-3">
          <span>{isSaved ? '已保存' : '保存中...'}</span>
          <span>Ln {lineCount}</span>
          <span>{content.length} chars</span>
        </div>
      </div>
    </div>
  );
}
