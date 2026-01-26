/**
 * EditorToolbar
 * Why: Provide Word/Notion-like formatting controls so non-Markdown users can write comfortably.
 * Figma 样式改造：添加 Markdown/Word 模式切换 + Edit/Preview/Split 视图切换
 */

import { useEffect, useState } from 'react';
import type { Editor } from '@tiptap/core';
import {
  AlignCenter,
  AlignLeft,
  AlignRight,
  Bold,
  Code,
  Heading1,
  Heading2,
  Heading3,
  Heading4,
  Heading5,
  Heading6,
  Image as ImageIcon,
  Italic,
  Link2,
  List,
  ListOrdered,
  Minus,
  Quote,
  Redo,
  Strikethrough,
  Table as TableIcon,
  Underline,
  Undo,
  Download,
  CheckSquare,
  Edit3,
  Eye,
  Columns,
} from 'lucide-react';

import { Button, Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle, Input, Select, SelectContent, SelectItem, SelectTrigger, SelectValue, Separator } from '@/components/ui';
import type { EditorMode } from '@/stores';
import { ToolbarButton } from './ToolbarButton';

export type ViewMode = 'edit' | 'preview' | 'split';

type HeadingValue = 'paragraph' | 'h1' | 'h2' | 'h3' | 'h4' | 'h5' | 'h6';

function getCurrentHeading(editor: Editor | null): HeadingValue {
  if (!editor) return 'paragraph';
  if (editor.isActive('heading', { level: 1 })) return 'h1';
  if (editor.isActive('heading', { level: 2 })) return 'h2';
  if (editor.isActive('heading', { level: 3 })) return 'h3';
  if (editor.isActive('heading', { level: 4 })) return 'h4';
  if (editor.isActive('heading', { level: 5 })) return 'h5';
  if (editor.isActive('heading', { level: 6 })) return 'h6';
  return 'paragraph';
}

function setHeading(editor: Editor, value: HeadingValue): void {
  if (value === 'paragraph') {
    editor.chain().focus().setParagraph().run();
    return;
  }
  const level =
    value === 'h1'
      ? 1
      : value === 'h2'
        ? 2
        : value === 'h3'
          ? 3
          : value === 'h4'
            ? 4
            : value === 'h5'
              ? 5
              : 6;
  editor.chain().focus().toggleHeading({ level }).run();
}

function getSelectedText(editor: Editor): string {
  const selection = editor.state.selection;
  return editor.state.doc.textBetween(selection.from, selection.to, ' ');
}

function readFileAsDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onerror = () => reject(new Error('Failed to read file'));
    reader.onload = () => {
      const result = reader.result;
      if (typeof result !== 'string') {
        reject(new Error('FileReader returned a non-string result'));
        return;
      }
      resolve(result);
    };
    reader.readAsDataURL(file);
  });
}

export interface EditorToolbarProps {
  editor: Editor | null;
  mode: EditorMode;
  onModeChange: (mode: EditorMode) => void;
  viewMode?: ViewMode;
  onViewModeChange?: (mode: ViewMode) => void;
  onRequestExport: () => void;
}

export function EditorToolbar(props: EditorToolbarProps) {
  const { editor, mode, onModeChange, viewMode = 'edit', onViewModeChange, onRequestExport } = props;

  const [linkOpen, setLinkOpen] = useState(false);
  const [linkUrl, setLinkUrl] = useState('');
  const [linkText, setLinkText] = useState('');

  const [imageOpen, setImageOpen] = useState(false);
  const [imageUrl, setImageUrl] = useState('');
  const [imageAlt, setImageAlt] = useState('');

  // Force re-render when editor state changes so active button state is up-to-date.
  const [, forceUpdate] = useState(0);
  useEffect(() => {
    if (!editor) return;
    const update = () => forceUpdate((x) => x + 1);
    editor.on('selectionUpdate', update);
    editor.on('update', update);
    return () => {
      editor.off('selectionUpdate', update);
      editor.off('update', update);
    };
  }, [editor]);

  const disabled = !editor;

  const heading = getCurrentHeading(editor);

  return (
    <div className="flex flex-col border-b border-[var(--border-default)] bg-[var(--bg-primary)]" data-testid="editor-toolbar">
      {/* Figma 样式 - 模式切换栏 */}
      <div className="h-10 flex items-center justify-between px-3 border-b border-[var(--border-default)]">
        <div className="flex items-center gap-2">
          <button
            data-testid="toolbar-mode-markdown"
            onClick={() => onModeChange('markdown')}
            className={`h-6 px-2.5 rounded text-[11px] transition-colors ${
              mode === 'markdown'
                ? 'bg-[var(--bg-active)] text-[var(--text-primary)]'
                : 'text-[var(--text-secondary)] hover:bg-[var(--bg-hover)]'
            }`}
          >
            Markdown
          </button>
          <button
            data-testid="toolbar-mode-richtext"
            onClick={() => onModeChange('richtext')}
            className={`h-6 px-2.5 rounded text-[11px] transition-colors ${
              mode === 'richtext'
                ? 'bg-[var(--bg-active)] text-[var(--text-primary)]'
                : 'text-[var(--text-secondary)] hover:bg-[var(--bg-hover)]'
            }`}
          >
            Word
          </button>

          {mode === 'richtext' && (
            <>
              <div className="w-px h-4 bg-[var(--border-default)] mx-1" />
              <span className="text-[11px] text-[var(--text-tertiary)]">
                选中文字显示格式工具
              </span>
            </>
          )}
        </div>

        <div className="flex items-center gap-2">
          <button
            data-testid="toolbar-view-edit"
            onClick={() => onViewModeChange?.('edit')}
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
            data-testid="toolbar-view-preview"
            onClick={() => onViewModeChange?.('preview')}
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
            data-testid="toolbar-view-split"
            onClick={() => onViewModeChange?.('split')}
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

      {/* 格式化工具栏 */}
      <div className="flex items-center gap-1 px-2 py-1.5 bg-[var(--bg-secondary)]">
        <ToolbarButton
          icon={<Undo className="w-4 h-4" />}
          tooltip="撤销 (Ctrl/Cmd+Z)"
          disabled={disabled || !editor?.can().undo()}
          onClick={() => editor?.chain().focus().undo().run()}
        />
        <ToolbarButton
          icon={<Redo className="w-4 h-4" />}
          tooltip="重做 (Ctrl/Cmd+Shift+Z)"
          disabled={disabled || !editor?.can().redo()}
          onClick={() => editor?.chain().focus().redo().run()}
        />

      <Separator orientation="vertical" className="mx-1 h-5 bg-[var(--border-subtle)]" />

      <ToolbarButton
        icon={<Bold className="w-4 h-4" />}
        tooltip="加粗 (Ctrl/Cmd+B)"
        disabled={disabled}
        isActive={Boolean(editor?.isActive('bold'))}
        onClick={() => editor?.chain().focus().toggleBold().run()}
      />
      <ToolbarButton
        icon={<Italic className="w-4 h-4" />}
        tooltip="斜体 (Ctrl/Cmd+I)"
        disabled={disabled}
        isActive={Boolean(editor?.isActive('italic'))}
        onClick={() => editor?.chain().focus().toggleItalic().run()}
      />
      <ToolbarButton
        icon={<Underline className="w-4 h-4" />}
        tooltip="下划线 (Ctrl/Cmd+U)"
        disabled={disabled}
        isActive={Boolean(editor?.isActive('underline'))}
        onClick={() => editor?.chain().focus().toggleUnderline().run()}
      />
      <ToolbarButton
        icon={<Strikethrough className="w-4 h-4" />}
        tooltip="删除线"
        disabled={disabled}
        isActive={Boolean(editor?.isActive('strike'))}
        onClick={() => editor?.chain().focus().toggleStrike().run()}
      />
      <ToolbarButton
        icon={<Code className="w-4 h-4" />}
        tooltip="行内代码"
        disabled={disabled}
        isActive={Boolean(editor?.isActive('code'))}
        onClick={() => editor?.chain().focus().toggleCode().run()}
      />

      <Separator orientation="vertical" className="mx-1 h-5 bg-[var(--border-subtle)]" />

      <div className="flex items-center gap-1">
        <div className="hidden md:block">
          <Select
            value={heading}
            onValueChange={(value) => {
              if (!editor) return;
              setHeading(editor, value as HeadingValue);
            }}
          >
            <SelectTrigger className="h-8 w-28 bg-[var(--bg-input)] border-[var(--border-default)] text-xs">
              <SelectValue placeholder="标题" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="paragraph">正文</SelectItem>
              <SelectItem value="h1">
                <span className="inline-flex items-center gap-2">
                  <Heading1 className="w-3.5 h-3.5" /> 标题 1
                </span>
              </SelectItem>
              <SelectItem value="h2">
                <span className="inline-flex items-center gap-2">
                  <Heading2 className="w-3.5 h-3.5" /> 标题 2
                </span>
              </SelectItem>
              <SelectItem value="h3">
                <span className="inline-flex items-center gap-2">
                  <Heading3 className="w-3.5 h-3.5" /> 标题 3
                </span>
              </SelectItem>
              <SelectItem value="h4">
                <span className="inline-flex items-center gap-2">
                  <Heading4 className="w-3.5 h-3.5" /> 标题 4
                </span>
              </SelectItem>
              <SelectItem value="h5">
                <span className="inline-flex items-center gap-2">
                  <Heading5 className="w-3.5 h-3.5" /> 标题 5
                </span>
              </SelectItem>
              <SelectItem value="h6">
                <span className="inline-flex items-center gap-2">
                  <Heading6 className="w-3.5 h-3.5" /> 标题 6
                </span>
              </SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      <Separator orientation="vertical" className="mx-1 h-5 bg-[var(--border-subtle)]" />

      <ToolbarButton
        icon={<List className="w-4 h-4" />}
        tooltip="无序列表"
        disabled={disabled}
        isActive={Boolean(editor?.isActive('bulletList'))}
        onClick={() => editor?.chain().focus().toggleBulletList().run()}
      />
      <ToolbarButton
        icon={<ListOrdered className="w-4 h-4" />}
        tooltip="有序列表"
        disabled={disabled}
        isActive={Boolean(editor?.isActive('orderedList'))}
        onClick={() => editor?.chain().focus().toggleOrderedList().run()}
      />
      <ToolbarButton
        icon={<CheckSquare className="w-4 h-4" />}
        tooltip="任务列表"
        disabled={disabled}
        isActive={Boolean(editor?.isActive('taskList'))}
        onClick={() => {
          if (!editor) return;
          (editor.chain().focus() as unknown as { toggleTaskList: () => { run: () => void } }).toggleTaskList().run();
        }}
      />

      <Separator orientation="vertical" className="mx-1 h-5 bg-[var(--border-subtle)]" />

      <ToolbarButton
        icon={<Quote className="w-4 h-4" />}
        tooltip="引用"
        disabled={disabled}
        isActive={Boolean(editor?.isActive('blockquote'))}
        onClick={() => editor?.chain().focus().toggleBlockquote().run()}
      />
      <ToolbarButton
        icon={<Code className="w-4 h-4" />}
        tooltip="代码块"
        disabled={disabled}
        isActive={Boolean(editor?.isActive('codeBlock'))}
        onClick={() => editor?.chain().focus().toggleCodeBlock().run()}
      />
      <ToolbarButton
        icon={<Minus className="w-4 h-4" />}
        tooltip="分隔线"
        disabled={disabled}
        onClick={() => editor?.chain().focus().setHorizontalRule().run()}
      />

      <Separator orientation="vertical" className="mx-1 h-5 bg-[var(--border-subtle)]" />

      <ToolbarButton
        icon={<Link2 className="w-4 h-4" />}
        tooltip="插入链接"
        disabled={disabled}
        onClick={() => {
          if (!editor) return;
          setLinkText(getSelectedText(editor));
          setLinkUrl('');
          setLinkOpen(true);
        }}
      />
      <ToolbarButton
        icon={<ImageIcon className="w-4 h-4" />}
        tooltip="插入图片"
        disabled={disabled}
        onClick={() => {
          setImageAlt('');
          setImageUrl('');
          setImageOpen(true);
        }}
      />
      <ToolbarButton
        icon={<TableIcon className="w-4 h-4" />}
        tooltip="插入表格"
        disabled={disabled}
        onClick={() => {
          if (!editor) return;
          (editor.chain().focus() as unknown as { insertTable: (opts: { rows: number; cols: number; withHeaderRow: boolean }) => { run: () => void } })
            .insertTable({ rows: 3, cols: 3, withHeaderRow: true })
            .run();
        }}
      />

      <Separator orientation="vertical" className="mx-1 h-5 bg-[var(--border-subtle)]" />

      <ToolbarButton
        icon={<AlignLeft className="w-4 h-4" />}
        tooltip="左对齐"
        disabled={disabled}
        isActive={Boolean(editor?.isActive({ textAlign: 'left' }))}
        onClick={() => editor?.chain().focus().setTextAlign('left').run()}
      />
      <ToolbarButton
        icon={<AlignCenter className="w-4 h-4" />}
        tooltip="居中"
        disabled={disabled}
        isActive={Boolean(editor?.isActive({ textAlign: 'center' }))}
        onClick={() => editor?.chain().focus().setTextAlign('center').run()}
      />
      <ToolbarButton
        icon={<AlignRight className="w-4 h-4" />}
        tooltip="右对齐"
        disabled={disabled}
        isActive={Boolean(editor?.isActive({ textAlign: 'right' }))}
        onClick={() => editor?.chain().focus().setTextAlign('right').run()}
      />

      <div className="flex-1" />

      <Separator orientation="vertical" className="mx-1 h-5 bg-[var(--border-subtle)]" />

      <Button
        type="button"
        size="sm"
        variant="outline"
        className="h-8"
        onClick={onRequestExport}
        data-testid="toolbar-export"
      >
        <Download className="w-4 h-4 mr-2" />
        导出
      </Button>
      </div>

      {/* Link dialog */}
      <Dialog open={linkOpen} onOpenChange={setLinkOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>插入链接</DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <div className="space-y-1">
              <div className="text-xs text-[var(--text-muted)]">文本（可选）</div>
              <Input value={linkText} onChange={(e) => setLinkText(e.target.value)} placeholder="显示文本" />
            </div>
            <div className="space-y-1">
              <div className="text-xs text-[var(--text-muted)]">URL</div>
              <Input value={linkUrl} onChange={(e) => setLinkUrl(e.target.value)} placeholder="https://..." />
            </div>
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => setLinkOpen(false)}>
              取消
            </Button>
            <Button
              type="button"
              onClick={() => {
                if (!editor) return;
                const url = linkUrl.trim();
                if (!url) return;

                const selected = getSelectedText(editor);
                const textToInsert = linkText.trim() || selected || url;

                if (selected) {
                  editor.chain().focus().extendMarkRange('link').setLink({ href: url }).run();
                } else {
                  editor
                    .chain()
                    .focus()
                    .insertContent(textToInsert)
                    .setTextSelection({ from: editor.state.selection.from - textToInsert.length, to: editor.state.selection.from })
                    .setLink({ href: url })
                    .run();
                }

                setLinkOpen(false);
              }}
              disabled={!linkUrl.trim()}
            >
              插入
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Image dialog */}
      <Dialog open={imageOpen} onOpenChange={setImageOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>插入图片</DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <div className="space-y-1">
              <div className="text-xs text-[var(--text-muted)]">图片 URL</div>
              <Input value={imageUrl} onChange={(e) => setImageUrl(e.target.value)} placeholder="https://..." />
            </div>
            <div className="space-y-1">
              <div className="text-xs text-[var(--text-muted)]">本地上传</div>
              <Input
                type="file"
                accept="image/*"
                onChange={(event) => {
                  const file = event.currentTarget.files?.[0] ?? null;
                  event.currentTarget.value = '';
                  if (!file || !editor) return;

                  const alt = imageAlt.trim() || file.name;
                  void readFileAsDataUrl(file)
                    .then((src) => {
                      (editor.chain().focus() as unknown as { setImage: (opts: { src: string; alt?: string }) => { run: () => void } })
                        .setImage({ src, ...(alt ? { alt } : {}) })
                        .run();
                      setImageOpen(false);
                    })
                    .catch((error) => {
                      console.warn('[EditorToolbar] Failed to insert image from file:', error);
                    });
                }}
              />
            </div>
            <div className="space-y-1">
              <div className="text-xs text-[var(--text-muted)]">描述（可选）</div>
              <Input value={imageAlt} onChange={(e) => setImageAlt(e.target.value)} placeholder="alt text" />
            </div>
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => setImageOpen(false)}>
              取消
            </Button>
            <Button
              type="button"
              onClick={() => {
                if (!editor) return;
                const url = imageUrl.trim();
                if (!url) return;
                (editor.chain().focus() as unknown as { setImage: (opts: { src: string; alt?: string }) => { run: () => void } })
                  .setImage({ src: url, ...(imageAlt.trim() ? { alt: imageAlt.trim() } : {}) })
                  .run();
                setImageOpen(false);
              }}
              disabled={!imageUrl.trim()}
            >
              插入
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

export default EditorToolbar;
