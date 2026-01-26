import React, { useState, useEffect, useRef } from 'react';
import { X, MoreHorizontal, Eye, Edit3, Columns, Bold, Italic, Underline, List, ListOrdered, Type, Heading1, Heading2, Heading3 } from 'lucide-react';
import type { EditorMode, ViewMode } from '../App';

interface EditorProps {
  selectedFile: string | null;
  editorMode: EditorMode;
  viewMode: ViewMode;
  onEditorModeChange: (mode: EditorMode) => void;
  onViewModeChange: (mode: ViewMode) => void;
  focusMode: boolean;
  onFocusModeToggle: () => void;
  onContentChange: (content: string) => void;
}

interface FloatingToolbarPosition {
  top: number;
  left: number;
}

const fileContents: Record<string, string> = {
  '欢迎使用.md': `# 欢迎使用 WriteNow

WriteNow 是一款专为文字创作者和自媒体创作者设计的智能创作IDE。

## 核心功能

### 📝 多格式支持
- **Markdown编辑**: 适合技术写作、博客创作
- **Word模式**: 富文本编辑，适合正式文档
- **实时预览**: 编辑、预览、分屏模式自由切换

### 🤖 AI 工作流
- 智能AI助手系统
- 多种创作辅助功能
- 支持个性化配置

### 🧩 扩展系统
- 类似VS Code的扩展模组
- 按需安装功能扩展
- 轻量化的核心体验

## 开始使用

1. 选择编辑模式（Markdown/Word）
2. 切换视图模式（编辑/预览/分屏）
3. 使用AI助手快速完成创作任务

祝您创作愉快！`,
  '今日想法.md': `# 今日想法\n\n> 日期：${new Date().toLocaleDateString('zh-CN')}\n\n## 灵感记录\n\n在这里记录您今天的想法和灵感...\n`,
  '文章草稿.md': `# 文章标题\n\n## 引言\n\n在这里开始您的文章创作...\n\n## 正文\n\n### 第一部分\n\n内容...\n`,
  '产品文档.docx': `产品介绍\n\n这是一个Word格式的文档示例。\n\n主要特点：\n• 富文本格式\n• 段落样式\n• 列表和表格支持`,
  '产品介绍.md': `# 产品介绍\n\n## 产品概述\n\n请在这里描述您的产品...\n`,
  '用户手册.docx': `用户手册\n\n快速开始\n\n欢迎使用本产品...`,
  '技术规范.md': `# 技术规范\n\n## 系统架构\n\n描述系统架构...`,
  '技术分享.md': `# 技术分享\n\n## 背景\n\n今天想和大家分享...`,
  '生活随笔.md': `# 生活随笔\n\n记录生活中的点滴...`,
};

export function Editor({ selectedFile, editorMode, viewMode, onEditorModeChange, onViewModeChange, focusMode, onFocusModeToggle, onContentChange }: EditorProps) {
  const [content, setContent] = useState('');
  const [lineCount, setLineCount] = useState(1);
  const [showFloatingToolbar, setShowFloatingToolbar] = useState(false);
  const [toolbarPosition, setToolbarPosition] = useState<FloatingToolbarPosition>({ top: 0, left: 0 });
  const [fontSize, setFontSize] = useState(16);
  const [showFontSizeMenu, setShowFontSizeMenu] = useState(false);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const contentEditableRef = useRef<HTMLDivElement>(null);
  const toolbarRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (selectedFile) {
      const newContent = fileContents[selectedFile] || '';
      setContent(newContent);
      onContentChange(newContent);
      
      if (selectedFile.endsWith('.md')) {
        onEditorModeChange('markdown');
      } else if (selectedFile.endsWith('.docx') || selectedFile.endsWith('.doc')) {
        onEditorModeChange('word');
      }
    }
  }, [selectedFile, onEditorModeChange, onContentChange]);

  useEffect(() => {
    setLineCount(content.split('\n').length);
    onContentChange(content);
  }, [content, onContentChange]);

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
          <div className="text-[13px] text-[var(--text-tertiary)] mb-1">No file selected</div>
          <div className="text-[11px] text-[var(--text-tertiary)]">Select a file from the workflow</div>
        </div>
      </div>
    );
  }

  const renderPreview = () => (
    <div className="p-8 max-w-3xl mx-auto">
      <div className="whitespace-pre-wrap text-[15px] text-[var(--text-secondary)] leading-[1.8]">
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
      onContentChange(text);
    }
  };

  const renderEditor = () => {
    if (editorMode === 'markdown') {
      return (
        <div className="flex-1 flex overflow-hidden">
          <div className="bg-[var(--bg-primary)] text-[var(--text-tertiary)] text-right pr-3 pl-3 py-3 text-[13px] leading-[1.6] font-mono select-none border-r border-[var(--border-subtle)] min-w-[50px]">
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
                onContentChange(e.target.value);
              }}
              className="w-full h-full bg-transparent text-[var(--text-primary)] outline-none resize-none px-4 py-3 leading-[1.6] font-mono text-[13px]"
              placeholder="Start typing in Markdown..."
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
        <div className="h-9 bg-[var(--bg-secondary)] border-b border-[var(--border-default)] flex items-center">
          <div className="flex items-center gap-2 px-3 h-full bg-[var(--bg-primary)] border-r border-[var(--border-default)]">
            <span className="text-[13px] text-[var(--text-secondary)]">{selectedFile}</span>
            <button className="w-5 h-5 flex items-center justify-center rounded hover:bg-[var(--bg-hover)] text-[var(--text-tertiary)] transition-colors">
              <X className="w-3 h-3" />
            </button>
          </div>
          <div className="flex-1" />
          <button 
            onClick={onFocusModeToggle}
            className="h-7 px-2 mr-1 rounded hover:bg-[var(--bg-hover)] text-[11px] text-[var(--text-tertiary)] transition-colors"
          >
            专注模式
          </button>
          <button className="w-7 h-7 flex items-center justify-center rounded hover:bg-[var(--bg-hover)] text-[var(--text-tertiary)] transition-colors mr-1">
            <MoreHorizontal className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* Toolbar */}
      {!focusMode && (
        <div className="h-10 bg-[var(--bg-primary)] border-b border-[var(--border-default)] flex items-center justify-between px-3">
          <div className="flex items-center gap-2">
            <button
              onClick={() => onEditorModeChange('markdown')}
              className={`h-6 px-2.5 rounded text-[11px] transition-colors ${
                editorMode === 'markdown'
                  ? 'bg-[var(--bg-active)] text-[var(--text-primary)]'
                  : 'text-[var(--text-secondary)] hover:bg-[var(--bg-hover)]'
              }`}
            >
              Markdown
            </button>
            <button
              onClick={() => onEditorModeChange('word')}
              className={`h-6 px-2.5 rounded text-[11px] transition-colors ${
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
                <span className="text-[11px] text-[var(--text-tertiary)]">选中文字显示格式工具</span>
              </>
            )}
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => onViewModeChange('edit')}
              className={`h-6 px-2 rounded text-[11px] flex items-center gap-1 transition-colors ${
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
              className={`h-6 px-2 rounded text-[11px] flex items-center gap-1 transition-colors ${
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
              className={`h-6 px-2 rounded text-[11px] flex items-center gap-1 transition-colors ${
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
          className="fixed bg-[var(--bg-tertiary)] border border-[var(--border-default)] rounded-lg shadow-2xl py-1.5 px-2 flex items-center gap-1 z-50"
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
        {viewMode === 'edit' && renderEditor()}

        {viewMode === 'preview' && (
          <div className="flex-1 overflow-auto">
            {renderPreview()}
          </div>
        )}

        {viewMode === 'split' && (
          <>
            <div className="flex-1 border-r border-[var(--border-default)] overflow-hidden">
              {renderEditor()}
            </div>
            <div className="flex-1 overflow-auto">
              {renderPreview()}
            </div>
          </>
        )}
      </div>

      {/* Status Bar */}
      <div className="h-6 bg-[var(--bg-secondary)] border-t border-[var(--border-default)] flex items-center justify-between px-3 text-[11px] text-[var(--text-tertiary)]">
        <div className="flex gap-3">
          <span>{editorMode === 'markdown' ? 'Markdown - 等宽字体, 显示行号' : 'Word - 富文本编辑'}</span>
          <span>UTF-8</span>
          {editorMode === 'word' && <span>{fontSize}px</span>}
        </div>
        <div className="flex gap-3">
          <span>Ln {lineCount}</span>
          <span>{content.length} chars</span>
        </div>
      </div>
    </div>
  );
}