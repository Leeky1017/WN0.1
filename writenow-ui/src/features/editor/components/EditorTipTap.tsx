/**
 * EditorTipTap Component
 * 
 * TipTap 富文本编辑器，应用 Design Tokens 样式。
 * 
 * @see DESIGN_SPEC.md 7.3 Editor 页面
 * 
 * 像素规范:
 * | 元素 | 属性 | 值 |
 * |------|------|-----|
 * | 标题 | 字号 | 48px |
 * | | 字重 | 500 |
 * | | 字体 | Inter |
 * | 正文 | 字号 | 17px |
 * | | 行高 | 1.8 |
 * | | 字体 | Lora |
 * | | 颜色 | #b0b0b0 |
 * | | 最大宽度 | 760px |
 * | H2 | 字号 | 24px |
 * | | 颜色 | #ffffff |
 * | Blockquote | 左边框 | 1px solid #222222 |
 * | | 左内边距 | 24px |
 * | | 颜色 | #666666 |
 * | | 风格 | italic |
 */
import { useCallback, useEffect } from 'react';
import { useEditor, EditorContent } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import Placeholder from '@tiptap/extension-placeholder';
import Typography from '@tiptap/extension-typography';
import { clsx } from 'clsx';
import { useEditorStore } from '../../../stores/editorStore';

export interface EditorTipTapProps {
  /** 初始内容 (HTML) */
  initialContent?: string;
  /** 是否只读 */
  readonly?: boolean;
  /** 占位符文本 */
  placeholder?: string;
  /** 自定义类名 */
  className?: string;
}

/**
 * TipTap 编辑器样式
 * 
 * 使用 CSS 变量和 Tailwind 类名实现设计规范
 */
const editorStyles = `
  .ProseMirror {
    outline: none;
    min-height: 100%;
  }

  .ProseMirror p {
    font-family: var(--font-family-body);
    font-size: 17px;
    line-height: 1.8;
    color: #b0b0b0;
    margin-bottom: 1.5em;
  }

  .ProseMirror h1 {
    font-family: var(--font-family-ui);
    font-size: 48px;
    font-weight: 500;
    color: var(--color-text-primary);
    margin-bottom: 0.5em;
    line-height: 1.2;
  }

  .ProseMirror h2 {
    font-family: var(--font-family-ui);
    font-size: 24px;
    font-weight: 500;
    color: var(--color-text-primary);
    margin-top: 2em;
    margin-bottom: 0.75em;
    line-height: 1.3;
  }

  .ProseMirror h3 {
    font-family: var(--font-family-ui);
    font-size: 18px;
    font-weight: 500;
    color: var(--color-text-primary);
    margin-top: 1.5em;
    margin-bottom: 0.5em;
    line-height: 1.4;
  }

  .ProseMirror blockquote {
    border-left: 1px solid var(--color-border-default);
    padding-left: 24px;
    margin-left: 0;
    margin-right: 0;
    font-style: italic;
    color: #666666;
  }

  .ProseMirror ul,
  .ProseMirror ol {
    padding-left: 24px;
    margin-bottom: 1.5em;
  }

  .ProseMirror li {
    margin-bottom: 0.5em;
  }

  .ProseMirror code {
    font-family: var(--font-family-mono);
    font-size: 14px;
    background: var(--color-bg-hover);
    padding: 2px 6px;
    border-radius: 4px;
  }

  .ProseMirror pre {
    font-family: var(--font-family-mono);
    font-size: 14px;
    background: var(--color-bg-hover);
    padding: 16px;
    border-radius: 8px;
    border: 1px solid var(--color-border-default);
    overflow-x: auto;
    margin-bottom: 1.5em;
  }

  .ProseMirror pre code {
    background: none;
    padding: 0;
    border-radius: 0;
  }

  .ProseMirror hr {
    border: none;
    border-top: 1px solid var(--color-border-default);
    margin: 2em 0;
  }

  .ProseMirror a {
    color: var(--color-text-primary);
    text-decoration: underline;
    text-underline-offset: 3px;
  }

  .ProseMirror a:hover {
    color: var(--color-text-secondary);
  }

  .ProseMirror strong {
    font-weight: 600;
    color: var(--color-text-primary);
  }

  .ProseMirror em {
    font-style: italic;
  }

  /* Placeholder */
  .ProseMirror p.is-editor-empty:first-child::before {
    content: attr(data-placeholder);
    float: left;
    color: var(--color-text-tertiary);
    pointer-events: none;
    height: 0;
  }

  /* Focus styles */
  .ProseMirror:focus {
    outline: none;
  }
`;

export function EditorTipTap({
  initialContent = '',
  readonly = false,
  placeholder = 'Start writing...',
  className,
}: EditorTipTapProps) {
  const { updateContent } = useEditorStore();

  const editor = useEditor({
    extensions: [
      StarterKit.configure({
        heading: {
          levels: [1, 2, 3],
        },
      }),
      Placeholder.configure({
        placeholder,
        emptyEditorClass: 'is-editor-empty',
      }),
      Typography,
    ],
    content: initialContent,
    editable: !readonly,
    editorProps: {
      attributes: {
        class: 'focus:outline-none',
      },
    },
    onUpdate: ({ editor }) => {
      const html = editor.getHTML();
      updateContent(html);
    },
  });

  // 当 initialContent 变化时更新编辑器内容
  useEffect(() => {
    if (editor && initialContent !== editor.getHTML()) {
      editor.commands.setContent(initialContent);
    }
  }, [editor, initialContent]);

  // 处理键盘快捷键
  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      // Cmd+S 保存
      if ((e.metaKey || e.ctrlKey) && e.key === 's') {
        e.preventDefault();
        useEditorStore.getState().save();
      }
    },
    []
  );

  return (
    <div
      className={clsx(
        'w-full max-w-[760px] mx-auto',
        'py-8 px-4',
        className
      )}
      onKeyDown={handleKeyDown}
    >
      {/* Inject editor styles */}
      <style>{editorStyles}</style>
      
      {/* TipTap Editor */}
      <EditorContent
        editor={editor}
        className="min-h-[calc(100vh-200px)]"
      />
    </div>
  );
}

EditorTipTap.displayName = 'EditorTipTap';
