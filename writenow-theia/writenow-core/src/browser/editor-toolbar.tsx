import * as React from '@theia/core/shared/react';
import { codicon } from '@theia/core/lib/browser/widgets';
import type { Editor } from '@tiptap/core';

type EditorFormat = 'markdown' | 'richtext';
type ViewMode = 'edit' | 'preview' | 'split';

type EditorToolbarProps = Readonly<{
    editor: Editor | null;
    format?: EditorFormat;
    viewMode?: ViewMode;
    onFormatChange?: (format: EditorFormat) => void;
    onViewModeChange?: (mode: ViewMode) => void;
}>;

type ToolbarButtonProps = Readonly<{
    icon: string;
    title: string;
    isActive?: boolean;
    disabled?: boolean;
    onClick: () => void;
}>;

/**
 * Individual toolbar button component.
 */
function ToolbarButton(props: ToolbarButtonProps): React.ReactElement {
    const { icon, title, isActive, disabled, onClick } = props;
    
    return (
        <button
            type="button"
            className={`wn-toolbar-button ${isActive ? 'wn-toolbar-button--active' : ''}`}
            title={title}
            disabled={disabled}
            onClick={onClick}
        >
            <span className={codicon(icon)} />
        </button>
    );
}

/**
 * Toolbar separator component.
 */
function ToolbarSeparator(): React.ReactElement {
    return <div className="wn-toolbar-separator" />;
}

/**
 * Heading dropdown component.
 */
function HeadingDropdown(props: { editor: Editor | null }): React.ReactElement {
    const { editor } = props;
    const [isOpen, setIsOpen] = React.useState(false);
    const dropdownRef = React.useRef<HTMLDivElement>(null);

    // Close dropdown when clicking outside
    React.useEffect(() => {
        const handleClickOutside = (event: MouseEvent): void => {
            if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
                setIsOpen(false);
            }
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    const getCurrentHeadingLevel = (): number => {
        if (!editor) return 0;
        for (let i = 1; i <= 6; i++) {
            if (editor.isActive('heading', { level: i })) return i;
        }
        return 0;
    };

    const currentLevel = getCurrentHeadingLevel();
    const displayText = currentLevel > 0 ? `H${currentLevel}` : '段落';

    const setHeading = (level: number): void => {
        if (!editor) return;
        if (level === 0) {
            editor.chain().focus().setParagraph().run();
        } else {
            editor.chain().focus().toggleHeading({ level: level as 1 | 2 | 3 | 4 | 5 | 6 }).run();
        }
        setIsOpen(false);
    };

    return (
        <div ref={dropdownRef} className="wn-toolbar-dropdown">
            <button
                type="button"
                className="wn-toolbar-dropdown-trigger"
                onClick={() => setIsOpen(!isOpen)}
                disabled={!editor}
            >
                {displayText}
                <span className={codicon('chevron-down')} />
            </button>
            {isOpen && (
                <div className="wn-toolbar-dropdown-menu">
                    <button
                        type="button"
                        className={`wn-toolbar-dropdown-item ${currentLevel === 0 ? 'wn-toolbar-dropdown-item--active' : ''}`}
                        onClick={() => setHeading(0)}
                    >
                        段落
                    </button>
                    {[1, 2, 3, 4, 5, 6].map((level) => (
                        <button
                            key={level}
                            type="button"
                            className={`wn-toolbar-dropdown-item ${currentLevel === level ? 'wn-toolbar-dropdown-item--active' : ''}`}
                            onClick={() => setHeading(level)}
                        >
                            标题 {level}
                        </button>
                    ))}
                </div>
            )}
        </div>
    );
}

/**
 * Link insertion dialog component.
 *
 * Why: Uses TipTap's Link extension when available for proper link handling,
 * with Markdown fallback for compatibility.
 */
function LinkDialog(props: { editor: Editor | null; onClose: () => void }): React.ReactElement {
    const { editor, onClose } = props;
    const [url, setUrl] = React.useState('');
    const [text, setText] = React.useState('');
    const hasSelection = React.useRef(false);

    React.useEffect(() => {
        // Get selected text as default link text
        if (editor) {
            const selection = editor.state.selection;
            const selectedText = editor.state.doc.textBetween(selection.from, selection.to, '');
            setText(selectedText);
            hasSelection.current = selectedText.length > 0;
        }
    }, [editor]);

    const handleInsert = (): void => {
        if (!editor || !url) return;
        
        // Try to use TipTap's Link extension if available
        const canSetLink = editor.can().setLink?.({ href: url });
        
        if (canSetLink && hasSelection.current) {
            // Use TipTap's native link extension for selected text
            editor.chain().focus().setLink({ href: url }).run();
        } else if (canSetLink && text) {
            // Insert text then wrap with link
            editor.chain().focus()
                .insertContent(text)
                .setTextSelection({ from: editor.state.selection.from - text.length, to: editor.state.selection.from })
                .setLink({ href: url })
                .run();
        } else {
            // Fallback to Markdown format for editors without Link extension
            const linkText = text || url;
            editor.chain().focus().insertContent(`[${linkText}](${url})`).run();
        }
        onClose();
    };

    return (
        <div className="wn-toolbar-dialog" data-testid="writenow-link-dialog">
            <div className="wn-toolbar-dialog-header">
                <span>插入链接</span>
                <button type="button" onClick={onClose} className="wn-toolbar-dialog-close">
                    <span className={codicon('close')} />
                </button>
            </div>
            <div className="wn-toolbar-dialog-body">
                <input
                    type="text"
                    placeholder="链接文本"
                    value={text}
                    onChange={(e) => setText(e.target.value)}
                    className="wn-toolbar-dialog-input"
                />
                <input
                    type="url"
                    placeholder="链接地址 (https://...)"
                    value={url}
                    onChange={(e) => setUrl(e.target.value)}
                    className="wn-toolbar-dialog-input"
                    autoFocus
                />
            </div>
            <div className="wn-toolbar-dialog-footer">
                <button type="button" onClick={onClose} className="wn-toolbar-dialog-btn">
                    取消
                </button>
                <button type="button" onClick={handleInsert} className="wn-toolbar-dialog-btn wn-toolbar-dialog-btn--primary" disabled={!url}>
                    插入
                </button>
            </div>
        </div>
    );
}

/**
 * Image insertion dialog component.
 *
 * Why: Uses TipTap's Image extension when available for proper image handling,
 * with Markdown fallback for compatibility.
 */
function ImageDialog(props: { editor: Editor | null; onClose: () => void }): React.ReactElement {
    const { editor, onClose } = props;
    const [url, setUrl] = React.useState('');
    const [alt, setAlt] = React.useState('');

    const handleInsert = (): void => {
        if (!editor || !url) return;
        
        // Check if TipTap's Image extension is available
        // We use a type-safe approach by checking the commands registry
        const commands = editor.commands as Record<string, unknown>;
        const hasImageExtension = typeof commands.setImage === 'function';
        
        if (hasImageExtension) {
            // Use TipTap's native image extension
            (editor.chain().focus() as unknown as { setImage: (opts: { src: string; alt?: string }) => { run: () => void } })
                .setImage({ src: url, alt: alt || undefined }).run();
        } else {
            // Fallback to Markdown format for editors without Image extension
            editor.chain().focus().insertContent(`![${alt || '图片'}](${url})`).run();
        }
        onClose();
    };

    return (
        <div className="wn-toolbar-dialog" data-testid="writenow-image-dialog">
            <div className="wn-toolbar-dialog-header">
                <span>插入图片</span>
                <button type="button" onClick={onClose} className="wn-toolbar-dialog-close">
                    <span className={codicon('close')} />
                </button>
            </div>
            <div className="wn-toolbar-dialog-body">
                <input
                    type="url"
                    placeholder="图片地址 (https://...)"
                    value={url}
                    onChange={(e) => setUrl(e.target.value)}
                    className="wn-toolbar-dialog-input"
                    autoFocus
                />
                <input
                    type="text"
                    placeholder="图片描述 (可选)"
                    value={alt}
                    onChange={(e) => setAlt(e.target.value)}
                    className="wn-toolbar-dialog-input"
                />
            </div>
            <div className="wn-toolbar-dialog-footer">
                <button type="button" onClick={onClose} className="wn-toolbar-dialog-btn">
                    取消
                </button>
                <button type="button" onClick={handleInsert} className="wn-toolbar-dialog-btn wn-toolbar-dialog-btn--primary" disabled={!url}>
                    插入
                </button>
            </div>
        </div>
    );
}

/**
 * Table insertion dialog component.
 *
 * Why: Uses TipTap's Table extension when available for proper table editing,
 * with Markdown fallback for compatibility.
 */
function TableDialog(props: { editor: Editor | null; onClose: () => void }): React.ReactElement {
    const { editor, onClose } = props;
    const [rows, setRows] = React.useState(3);
    const [cols, setCols] = React.useState(3);

    const handleInsert = (): void => {
        if (!editor) return;
        
        // Check if TipTap's Table extension is available
        const commands = editor.commands as Record<string, unknown>;
        const hasTableExtension = typeof commands.insertTable === 'function';
        
        if (hasTableExtension) {
            // Use TipTap's native table extension
            (editor.chain().focus() as unknown as { insertTable: (opts: { rows: number; cols: number; withHeaderRow: boolean }) => { run: () => void } })
                .insertTable({ rows, cols, withHeaderRow: true }).run();
        } else {
            // Fallback to Markdown format for editors without Table extension
            const header = '| ' + Array(cols).fill('标题').join(' | ') + ' |';
            const separator = '| ' + Array(cols).fill('---').join(' | ') + ' |';
            const dataRows = Array(rows - 1).fill(null).map(() => 
                '| ' + Array(cols).fill('内容').join(' | ') + ' |'
            );
            
            const tableMarkdown = [header, separator, ...dataRows].join('\n');
            editor.chain().focus().insertContent('\n' + tableMarkdown + '\n').run();
        }
        onClose();
    };

    return (
        <div className="wn-toolbar-dialog" data-testid="writenow-table-dialog">
            <div className="wn-toolbar-dialog-header">
                <span>插入表格</span>
                <button type="button" onClick={onClose} className="wn-toolbar-dialog-close">
                    <span className={codicon('close')} />
                </button>
            </div>
            <div className="wn-toolbar-dialog-body">
                <div className="wn-toolbar-dialog-row">
                    <label>行数:</label>
                    <input
                        type="number"
                        min={2}
                        max={20}
                        value={rows}
                        onChange={(e) => setRows(Math.max(2, Math.min(20, parseInt(e.target.value) || 2)))}
                        className="wn-toolbar-dialog-input wn-toolbar-dialog-input--small"
                    />
                </div>
                <div className="wn-toolbar-dialog-row">
                    <label>列数:</label>
                    <input
                        type="number"
                        min={1}
                        max={10}
                        value={cols}
                        onChange={(e) => setCols(Math.max(1, Math.min(10, parseInt(e.target.value) || 1)))}
                        className="wn-toolbar-dialog-input wn-toolbar-dialog-input--small"
                    />
                </div>
            </div>
            <div className="wn-toolbar-dialog-footer">
                <button type="button" onClick={onClose} className="wn-toolbar-dialog-btn">
                    取消
                </button>
                <button type="button" onClick={handleInsert} className="wn-toolbar-dialog-btn wn-toolbar-dialog-btn--primary">
                    插入
                </button>
            </div>
        </div>
    );
}

type InsertDialogType = 'link' | 'image' | 'table' | null;

/**
 * Word count and reading time display component.
 */
function WordCountDisplay(props: { editor: Editor | null }): React.ReactElement {
    const { editor } = props;
    const [stats, setStats] = React.useState({ chars: 0, words: 0, readingTime: 0 });

    React.useEffect(() => {
        if (!editor) {
            setStats({ chars: 0, words: 0, readingTime: 0 });
            return;
        }

        const updateStats = (): void => {
            const text = editor.state.doc.textContent;
            const chars = text.length;
            // Chinese word count: treat each CJK character as one word
            const cjkChars = (text.match(/[\u4e00-\u9fff\u3400-\u4dbf]/g) ?? []).length;
            const nonCjkWords = text
                .replace(/[\u4e00-\u9fff\u3400-\u4dbf]/g, ' ')
                .split(/\s+/)
                .filter(w => w.length > 0).length;
            const words = cjkChars + nonCjkWords;
            // Reading time: ~300 words/min for Chinese, ~200 words/min for English
            const readingTime = Math.ceil(words / 250);
            setStats({ chars, words, readingTime });
        };

        updateStats();
        editor.on('update', updateStats);
        return () => { editor.off('update', updateStats); };
    }, [editor]);

    return (
        <div className="wn-toolbar-stats" data-testid="writenow-word-count">
            <span className="wn-toolbar-stat" title="字数">
                <span className={codicon('symbol-text')} />
                <span>{stats.words}</span>
            </span>
            <span className="wn-toolbar-stat" title="阅读时长">
                <span className={codicon('clock')} />
                <span>{stats.readingTime} min</span>
            </span>
        </div>
    );
}

/**
 * Format mode toggle (Markdown / Rich Text).
 */
function FormatModeToggle(props: {
    format: EditorFormat;
    onChange: (format: EditorFormat) => void;
}): React.ReactElement {
    const { format, onChange } = props;

    return (
        <div className="wn-toolbar-toggle" data-testid="writenow-format-toggle">
            <button
                type="button"
                className={`wn-toolbar-toggle-btn ${format === 'markdown' ? 'wn-toolbar-toggle-btn--active' : ''}`}
                onClick={() => onChange('markdown')}
                title="Markdown 模式"
            >
                <span className={codicon('markdown')} />
                <span>MD</span>
            </button>
            <button
                type="button"
                className={`wn-toolbar-toggle-btn ${format === 'richtext' ? 'wn-toolbar-toggle-btn--active' : ''}`}
                onClick={() => onChange('richtext')}
                title="富文本模式"
            >
                <span className={codicon('file-text')} />
                <span>Word</span>
            </button>
        </div>
    );
}

/**
 * View mode toggle (Edit / Preview / Split).
 */
function ViewModeToggle(props: {
    mode: ViewMode;
    onChange: (mode: ViewMode) => void;
}): React.ReactElement {
    const { mode, onChange } = props;

    return (
        <div className="wn-toolbar-toggle" data-testid="writenow-view-toggle">
            <button
                type="button"
                className={`wn-toolbar-toggle-btn ${mode === 'edit' ? 'wn-toolbar-toggle-btn--active' : ''}`}
                onClick={() => onChange('edit')}
                title="编辑模式"
            >
                <span className={codicon('edit')} />
            </button>
            <button
                type="button"
                className={`wn-toolbar-toggle-btn ${mode === 'preview' ? 'wn-toolbar-toggle-btn--active' : ''}`}
                onClick={() => onChange('preview')}
                title="预览模式"
            >
                <span className={codicon('open-preview')} />
            </button>
            <button
                type="button"
                className={`wn-toolbar-toggle-btn ${mode === 'split' ? 'wn-toolbar-toggle-btn--active' : ''}`}
                onClick={() => onChange('split')}
                title="分屏模式"
            >
                <span className={codicon('split-horizontal')} />
            </button>
        </div>
    );
}

/**
 * Editor toolbar component.
 *
 * Why: Provides visual formatting controls for users who prefer clicking over keyboard shortcuts.
 * Reflects current selection state via TipTap's isActive() API.
 */
export function EditorToolbar(props: EditorToolbarProps): React.ReactElement {
    const {
        editor,
        format = 'markdown',
        viewMode = 'edit',
        onFormatChange,
        onViewModeChange,
    } = props;
    const [activeDialog, setActiveDialog] = React.useState<InsertDialogType>(null);

    // Force re-render when editor state changes
    const [, forceUpdate] = React.useReducer((x: number) => x + 1, 0);

    React.useEffect(() => {
        if (!editor) return;
        
        // Listen to selection and content changes to update button states
        const updateHandler = (): void => forceUpdate();
        editor.on('selectionUpdate', updateHandler);
        editor.on('update', updateHandler);
        
        return () => {
            editor.off('selectionUpdate', updateHandler);
            editor.off('update', updateHandler);
        };
    }, [editor]);

    const isDisabled = !editor;

    const closeDialog = (): void => setActiveDialog(null);

    return (
        <div className="wn-editor-toolbar" data-testid="writenow-editor-toolbar">
            {/* Undo/Redo */}
            <ToolbarButton
                icon="discard"
                title="撤销 (⌘Z)"
                disabled={isDisabled || !editor?.can().undo()}
                onClick={() => editor?.chain().focus().undo().run()}
            />
            <ToolbarButton
                icon="redo"
                title="重做 (⌘⇧Z)"
                disabled={isDisabled || !editor?.can().redo()}
                onClick={() => editor?.chain().focus().redo().run()}
            />

            <ToolbarSeparator />

            {/* Text formatting */}
            <ToolbarButton
                icon="bold"
                title="加粗 (⌘B)"
                isActive={editor?.isActive('bold')}
                disabled={isDisabled}
                onClick={() => editor?.chain().focus().toggleBold().run()}
            />
            <ToolbarButton
                icon="italic"
                title="斜体 (⌘I)"
                isActive={editor?.isActive('italic')}
                disabled={isDisabled}
                onClick={() => editor?.chain().focus().toggleItalic().run()}
            />
            <ToolbarButton
                icon="text-size"
                title="删除线"
                isActive={editor?.isActive('strike')}
                disabled={isDisabled}
                onClick={() => editor?.chain().focus().toggleStrike().run()}
            />
            <ToolbarButton
                icon="code"
                title="行内代码"
                isActive={editor?.isActive('code')}
                disabled={isDisabled}
                onClick={() => editor?.chain().focus().toggleCode().run()}
            />

            <ToolbarSeparator />

            {/* Heading dropdown */}
            <HeadingDropdown editor={editor} />

            <ToolbarSeparator />

            {/* Lists */}
            <ToolbarButton
                icon="list-unordered"
                title="无序列表"
                isActive={editor?.isActive('bulletList')}
                disabled={isDisabled}
                onClick={() => editor?.chain().focus().toggleBulletList().run()}
            />
            <ToolbarButton
                icon="list-ordered"
                title="有序列表"
                isActive={editor?.isActive('orderedList')}
                disabled={isDisabled}
                onClick={() => editor?.chain().focus().toggleOrderedList().run()}
            />

            <ToolbarSeparator />

            {/* Block elements */}
            <ToolbarButton
                icon="quote"
                title="引用"
                isActive={editor?.isActive('blockquote')}
                disabled={isDisabled}
                onClick={() => editor?.chain().focus().toggleBlockquote().run()}
            />
            <ToolbarButton
                icon="code"
                title="代码块"
                isActive={editor?.isActive('codeBlock')}
                disabled={isDisabled}
                onClick={() => editor?.chain().focus().toggleCodeBlock().run()}
            />
            <ToolbarButton
                icon="horizontal-rule"
                title="分隔线"
                disabled={isDisabled}
                onClick={() => editor?.chain().focus().setHorizontalRule().run()}
            />

            <ToolbarSeparator />

            {/* P1-009: Insert elements */}
            <ToolbarButton
                icon="link"
                title="插入链接"
                disabled={isDisabled}
                onClick={() => setActiveDialog('link')}
            />
            <ToolbarButton
                icon="file-media"
                title="插入图片"
                disabled={isDisabled}
                onClick={() => setActiveDialog('image')}
            />
            <ToolbarButton
                icon="table"
                title="插入表格"
                disabled={isDisabled}
                onClick={() => setActiveDialog('table')}
            />

            {/* Insert dialogs */}
            {activeDialog === 'link' && <LinkDialog editor={editor} onClose={closeDialog} />}
            {activeDialog === 'image' && <ImageDialog editor={editor} onClose={closeDialog} />}
            {activeDialog === 'table' && <TableDialog editor={editor} onClose={closeDialog} />}

            {/* Spacer */}
            <div className="wn-toolbar-spacer" />

            {/* Format mode toggle */}
            {onFormatChange && (
                <FormatModeToggle format={format} onChange={onFormatChange} />
            )}

            <ToolbarSeparator />

            {/* View mode toggle */}
            {onViewModeChange && (
                <ViewModeToggle mode={viewMode} onChange={onViewModeChange} />
            )}

            <ToolbarSeparator />

            {/* Word count and reading time */}
            <WordCountDisplay editor={editor} />
        </div>
    );
}
