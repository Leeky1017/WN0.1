import * as React from '@theia/core/shared/react';

import { codicon, ReactWidget } from '@theia/core/lib/browser/widgets';
import { injectable } from '@theia/core/shared/inversify';

import { WRITENOW_SHORTCUTS_DIALOG_ID } from '../writenow-layout-ids';

/**
 * Shortcut category definition.
 */
type ShortcutCategory = {
    id: string;
    label: string;
    shortcuts: ShortcutItem[];
};

/**
 * Individual shortcut item.
 */
type ShortcutItem = {
    key: string;
    description: string;
};

/**
 * All keyboard shortcuts organized by category.
 */
const SHORTCUT_CATEGORIES: ShortcutCategory[] = [
    {
        id: 'general',
        label: '通用',
        shortcuts: [
            { key: '⌘,', description: '打开设置' },
            { key: '⌘?', description: '快捷键速查' },
            { key: '⌘K', description: '打开 AI 面板' },
            { key: '⌘N', description: '新建文件' },
            { key: '⌘O', description: '打开文件' },
            { key: '⌘S', description: '保存' },
            { key: '⌘⇧S', description: '另存为' },
            { key: '⌘W', description: '关闭标签' },
        ],
    },
    {
        id: 'editing',
        label: '编辑',
        shortcuts: [
            { key: '⌘Z', description: '撤销' },
            { key: '⌘⇧Z', description: '重做' },
            { key: '⌘X', description: '剪切' },
            { key: '⌘C', description: '复制' },
            { key: '⌘V', description: '粘贴' },
            { key: '⌘A', description: '全选' },
            { key: '⌘F', description: '查找' },
            { key: '⌘H', description: '替换' },
        ],
    },
    {
        id: 'formatting',
        label: '格式',
        shortcuts: [
            { key: '⌘B', description: '加粗' },
            { key: '⌘I', description: '斜体' },
            { key: '⌘U', description: '下划线' },
            { key: '⌘⇧X', description: '删除线' },
            { key: '⌘`', description: '行内代码' },
            { key: '⌘⇧`', description: '代码块' },
        ],
    },
    {
        id: 'view',
        label: '视图',
        shortcuts: [
            { key: '⌘⇧F', description: '专注模式' },
            { key: '⌘\\', description: '切换侧边栏' },
            { key: '⌘=', description: '放大' },
            { key: '⌘-', description: '缩小' },
            { key: '⌘0', description: '重置缩放' },
        ],
    },
];

type ShortcutsViewProps = Readonly<{
    onClose: () => void;
}>;

/**
 * Shortcuts dialog view component.
 */
function ShortcutsView(props: ShortcutsViewProps): React.ReactElement {
    const { onClose } = props;
    const [searchQuery, setSearchQuery] = React.useState('');

    // Filter shortcuts by search query
    const filteredCategories = SHORTCUT_CATEGORIES.map((category) => ({
        ...category,
        shortcuts: category.shortcuts.filter(
            (s) =>
                s.description.toLowerCase().includes(searchQuery.toLowerCase()) ||
                s.key.toLowerCase().includes(searchQuery.toLowerCase())
        ),
    })).filter((category) => category.shortcuts.length > 0);

    // Handle ESC key
    React.useEffect(() => {
        const handleKeyDown = (event: KeyboardEvent): void => {
            if (event.key === 'Escape') {
                onClose();
            }
        };
        document.addEventListener('keydown', handleKeyDown);
        return () => document.removeEventListener('keydown', handleKeyDown);
    }, [onClose]);

    return (
        <div className="wn-shortcuts-container" data-testid="writenow-shortcuts-dialog">
            <header className="wn-shortcuts-header">
                <h2 className="wn-shortcuts-title">
                    <span className={codicon('keyboard')} />
                    快捷键速查
                </h2>
                <button
                    type="button"
                    className="wn-shortcuts-close"
                    onClick={onClose}
                    title="关闭 (Esc)"
                >
                    <span className={codicon('close')} />
                </button>
            </header>

            <div className="wn-shortcuts-search">
                <span className={codicon('search')} />
                <input
                    type="text"
                    placeholder="搜索快捷键..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    autoFocus
                />
            </div>

            <div className="wn-shortcuts-content">
                {filteredCategories.length === 0 ? (
                    <div className="wn-shortcuts-empty">
                        <span className={codicon('search')} />
                        <p>未找到匹配的快捷键</p>
                    </div>
                ) : (
                    filteredCategories.map((category) => (
                        <div key={category.id} className="wn-shortcuts-category">
                            <h3 className="wn-shortcuts-category-title">{category.label}</h3>
                            <div className="wn-shortcuts-list">
                                {category.shortcuts.map((shortcut, idx) => (
                                    <div key={idx} className="wn-shortcuts-item">
                                        <span className="wn-shortcuts-key">{shortcut.key}</span>
                                        <span className="wn-shortcuts-desc">{shortcut.description}</span>
                                    </div>
                                ))}
                            </div>
                        </div>
                    ))
                )}
            </div>

            <footer className="wn-shortcuts-footer">
                <p>提示：部分快捷键可能因系统设置而有所不同</p>
            </footer>
        </div>
    );
}

/**
 * ShortcutsDialog - Keyboard shortcuts cheatsheet.
 *
 * Why: Provides a searchable list of all keyboard shortcuts.
 * Accessible via Cmd+? or Help menu.
 */
@injectable()
export class ShortcutsDialog extends ReactWidget {
    static readonly ID = WRITENOW_SHORTCUTS_DIALOG_ID;

    constructor() {
        super();
        this.id = ShortcutsDialog.ID;
        this.title.label = '快捷键';
        this.title.caption = '快捷键速查';
        this.title.iconClass = codicon('keyboard');
        this.title.closable = true;
        this.addClass('writenow-shortcuts-dialog');

        this.update();
    }

    protected override render(): React.ReactNode {
        return <ShortcutsView onClose={() => this.close()} />;
    }
}
