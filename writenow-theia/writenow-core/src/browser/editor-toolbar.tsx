import * as React from '@theia/core/shared/react';
import { codicon } from '@theia/core/lib/browser/widgets';
import type { Editor } from '@tiptap/core';

type EditorToolbarProps = Readonly<{
    editor: Editor | null;
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
 * Editor toolbar component.
 *
 * Why: Provides visual formatting controls for users who prefer clicking over keyboard shortcuts.
 * Reflects current selection state via TipTap's isActive() API.
 */
export function EditorToolbar(props: EditorToolbarProps): React.ReactElement {
    const { editor } = props;

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
        </div>
    );
}
