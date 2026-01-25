/**
 * EditorToolbar
 * Why: Provide Word/Notion-like formatting controls so non-Markdown users can write comfortably.
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
} from 'lucide-react';

import { cn } from '@/lib/utils';
import { Button, Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle, Input, Select, SelectContent, SelectItem, SelectTrigger, SelectValue, Separator } from '@/components/ui';
import type { EditorMode } from '@/stores';
import { ModeSwitch } from './ModeSwitch';
import { ToolbarButton } from './ToolbarButton';

type HeadingValue = 'paragraph' | 'h1' | 'h2' | 'h3';

function getCurrentHeading(editor: Editor | null): HeadingValue {
  if (!editor) return 'paragraph';
  if (editor.isActive('heading', { level: 1 })) return 'h1';
  if (editor.isActive('heading', { level: 2 })) return 'h2';
  if (editor.isActive('heading', { level: 3 })) return 'h3';
  return 'paragraph';
}

function setHeading(editor: Editor, value: HeadingValue): void {
  if (value === 'paragraph') {
    editor.chain().focus().setParagraph().run();
    return;
  }
  const level = value === 'h1' ? 1 : value === 'h2' ? 2 : 3;
  editor.chain().focus().toggleHeading({ level }).run();
}

function getSelectedText(editor: Editor): string {
  const selection = editor.state.selection;
  return editor.state.doc.textBetween(selection.from, selection.to, ' ');
}

export interface EditorToolbarProps {
  editor: Editor | null;
  mode: EditorMode;
  onModeChange: (mode: EditorMode) => void;
  onRequestExport: () => void;
}

export function EditorToolbar(props: EditorToolbarProps) {
  const { editor, mode, onModeChange, onRequestExport } = props;

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
    <div className="flex items-center gap-1 px-2 py-1.5 border-b border-[var(--border-subtle)] bg-[var(--bg-sidebar)]">
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

      <div className={cn('hidden sm:flex items-center gap-2', mode === 'markdown' && 'opacity-90')}>
        <ModeSwitch mode={mode} onChange={onModeChange} />
      </div>

      <Separator orientation="vertical" className="mx-1 h-5 bg-[var(--border-subtle)]" />

      <Button
        type="button"
        size="sm"
        variant="outline"
        className="h-8"
        onClick={onRequestExport}
      >
        <Download className="w-4 h-4 mr-2" />
        导出
      </Button>

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
