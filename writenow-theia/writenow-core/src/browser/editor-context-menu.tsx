import * as React from '@theia/core/shared/react';
import { codicon } from '@theia/core/lib/browser/widgets';
import type { Editor } from '@tiptap/core';

/**
 * Context menu item definition.
 */
type ContextMenuItem = {
    id: string;
    label: string;
    icon?: string;
    shortcut?: string;
    separator?: boolean;
    disabled?: boolean;
    onClick: () => void;
};

type EditorContextMenuProps = Readonly<{
    editor: Editor | null;
    x: number;
    y: number;
    onClose: () => void;
    onOpenFindReplace: (withReplace: boolean) => void;
    onOpenAiPanel: () => void;
}>;

/**
 * Clipboard operations using modern Clipboard API with fallback.
 *
 * Why: document.execCommand is deprecated. Use navigator.clipboard when available.
 */
async function clipboardCut(editor: Editor | null): Promise<void> {
    if (!editor) return;
    
    const { from, to } = editor.state.selection;
    const text = editor.state.doc.textBetween(from, to, '\n');
    
    try {
        await navigator.clipboard.writeText(text);
        editor.commands.deleteSelection();
    } catch {
        // Fallback: trigger native cut via keyboard event simulation
        document.execCommand('cut');
    }
}

async function clipboardCopy(editor: Editor | null): Promise<void> {
    if (!editor) return;
    
    const { from, to } = editor.state.selection;
    const text = editor.state.doc.textBetween(from, to, '\n');
    
    try {
        await navigator.clipboard.writeText(text);
    } catch {
        // Fallback: trigger native copy
        document.execCommand('copy');
    }
}

async function clipboardPaste(editor: Editor | null): Promise<void> {
    if (!editor) return;
    
    try {
        const text = await navigator.clipboard.readText();
        if (text) {
            editor.commands.insertContent(text);
        }
    } catch {
        // Fallback: trigger native paste (requires user gesture)
        document.execCommand('paste');
    }
}

/**
 * EditorContextMenu component.
 *
 * Why: Provides a custom right-click menu for the TipTap editor with
 * editing operations, find/replace, and AI-powered actions.
 */
export function EditorContextMenu(props: EditorContextMenuProps): React.ReactElement | null {
    const { editor, x, y, onClose, onOpenFindReplace, onOpenAiPanel } = props;
    const menuRef = React.useRef<HTMLDivElement>(null);

    // Close menu when clicking outside
    React.useEffect(() => {
        const handleClickOutside = (event: MouseEvent): void => {
            if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
                onClose();
            }
        };

        const handleKeyDown = (event: KeyboardEvent): void => {
            if (event.key === 'Escape') {
                onClose();
            }
        };

        document.addEventListener('mousedown', handleClickOutside);
        document.addEventListener('keydown', handleKeyDown);
        return () => {
            document.removeEventListener('mousedown', handleClickOutside);
            document.removeEventListener('keydown', handleKeyDown);
        };
    }, [onClose]);

    // Adjust position to keep menu within viewport
    const [adjustedPosition, setAdjustedPosition] = React.useState({ x, y });
    React.useEffect(() => {
        if (menuRef.current) {
            const rect = menuRef.current.getBoundingClientRect();
            let newX = x;
            let newY = y;

            if (x + rect.width > window.innerWidth) {
                newX = window.innerWidth - rect.width - 8;
            }
            if (y + rect.height > window.innerHeight) {
                newY = window.innerHeight - rect.height - 8;
            }

            setAdjustedPosition({ x: newX, y: newY });
        }
    }, [x, y]);

    const hasSelection = editor?.state.selection.from !== editor?.state.selection.to;

    const menuItems: ContextMenuItem[] = [
        // Basic editing - using modern Clipboard API
        {
            id: 'cut',
            label: '剪切',
            icon: 'clippy',
            shortcut: '⌘X',
            disabled: !hasSelection,
            onClick: () => {
                void clipboardCut(editor);
                onClose();
            },
        },
        {
            id: 'copy',
            label: '复制',
            icon: 'copy',
            shortcut: '⌘C',
            disabled: !hasSelection,
            onClick: () => {
                void clipboardCopy(editor);
                onClose();
            },
        },
        {
            id: 'paste',
            label: '粘贴',
            icon: 'clippy',
            shortcut: '⌘V',
            onClick: () => {
                void clipboardPaste(editor);
                onClose();
            },
        },
        {
            id: 'sep1',
            label: '',
            separator: true,
            onClick: () => {},
        },
        // Find/Replace
        {
            id: 'find',
            label: '查找',
            icon: 'search',
            shortcut: '⌘F',
            onClick: () => {
                onOpenFindReplace(false);
                onClose();
            },
        },
        {
            id: 'replace',
            label: '替换',
            icon: 'replace',
            shortcut: '⌘H',
            onClick: () => {
                onOpenFindReplace(true);
                onClose();
            },
        },
        {
            id: 'sep2',
            label: '',
            separator: true,
            onClick: () => {},
        },
        // AI operations
        {
            id: 'ai-explain',
            label: 'AI 解释',
            icon: 'sparkle',
            disabled: !hasSelection,
            onClick: () => {
                onOpenAiPanel();
                onClose();
            },
        },
        {
            id: 'ai-rewrite',
            label: 'AI 改写',
            icon: 'edit',
            disabled: !hasSelection,
            onClick: () => {
                onOpenAiPanel();
                onClose();
            },
        },
        {
            id: 'ai-translate',
            label: 'AI 翻译',
            icon: 'globe',
            disabled: !hasSelection,
            onClick: () => {
                onOpenAiPanel();
                onClose();
            },
        },
    ];

    return (
        <div
            ref={menuRef}
            className="wn-context-menu"
            style={{
                position: 'fixed',
                left: adjustedPosition.x,
                top: adjustedPosition.y,
            }}
            data-testid="writenow-editor-context-menu"
        >
            {menuItems.map((item) => {
                if (item.separator) {
                    return <div key={item.id} className="wn-context-menu-separator" />;
                }

                return (
                    <button
                        key={item.id}
                        type="button"
                        className={`wn-context-menu-item ${item.disabled ? 'wn-context-menu-item--disabled' : ''}`}
                        disabled={item.disabled}
                        onClick={item.onClick}
                    >
                        {item.icon && (
                            <span className={`wn-context-menu-icon ${codicon(item.icon)}`} />
                        )}
                        <span className="wn-context-menu-label">{item.label}</span>
                        {item.shortcut && (
                            <span className="wn-context-menu-shortcut">{item.shortcut}</span>
                        )}
                    </button>
                );
            })}
        </div>
    );
}
