import * as React from '@theia/core/shared/react';

import { codicon, ReactWidget } from '@theia/core/lib/browser/widgets';
import { inject, injectable } from '@theia/core/shared/inversify';

import { ActiveEditorService } from '../active-editor-service';
import { WRITENOW_OUTLINE_WIDGET_ID } from '../writenow-layout-ids';

/**
 * Heading item parsed from document.
 */
type HeadingItem = {
    id: string;
    level: number;
    text: string;
    position: number;
};

/**
 * Parse headings from markdown content.
 *
 * Why: We need to extract H1-H6 headings for the outline tree.
 */
function parseHeadings(markdown: string): HeadingItem[] {
    const headings: HeadingItem[] = [];
    const lines = markdown.split('\n');
    let position = 0;

    for (const line of lines) {
        const match = line.match(/^(#{1,6})\s+(.+)$/);
        if (match) {
            const level = match[1].length;
            const text = match[2].trim();
            headings.push({
                id: `heading-${headings.length}`,
                level,
                text,
                position,
            });
        }
        position += line.length + 1; // +1 for newline
    }

    return headings;
}

type OutlineViewProps = Readonly<{
    activeEditor: ActiveEditorService;
}>;

/**
 * Outline view component.
 */
function OutlineView(props: OutlineViewProps): React.ReactElement {
    const { activeEditor } = props;
    const [headings, setHeadings] = React.useState<HeadingItem[]>([]);
    const [selectedId, setSelectedId] = React.useState<string | null>(null);

    // Update headings when editor content changes
    React.useEffect(() => {
        const updateHeadings = (): void => {
            const editor = activeEditor.getActive();
            if (!editor) {
                setHeadings([]);
                return;
            }

            const markdown = editor.getMarkdown();
            const parsed = parseHeadings(markdown);
            setHeadings(parsed);
        };

        // Initial update
        updateHeadings();

        // Listen to editor changes
        const disposable = activeEditor.onDidChange(() => {
            updateHeadings();
        });

        // Listen to content changes
        const setupContentListener = (): void => {
            const editor = activeEditor.getActive();
            if (editor) {
                editor.onContentChanged(() => {
                    updateHeadings();
                });
            }
        };

        setupContentListener();
        const editorDisposable = activeEditor.onDidChange(() => {
            setupContentListener();
        });

        return () => {
            disposable.dispose();
            editorDisposable.dispose();
        };
    }, [activeEditor]);

    const handleClick = (heading: HeadingItem): void => {
        setSelectedId(heading.id);

        // Scroll to heading in editor using public API
        const editor = activeEditor.getActive();
        if (editor) {
            // Why: Use the public scrollToPosition API instead of accessing
            // private TipTap editor instance with unsafe type assertions.
            editor.scrollToPosition(heading.position);
        }
    };

    if (headings.length === 0) {
        return (
            <div className="wn-outline-empty" data-testid="writenow-outline-empty">
                <span className={codicon('list-tree')} />
                <p>暂无大纲</p>
                <p className="wn-outline-hint">添加标题 (# 标题) 以显示大纲</p>
            </div>
        );
    }

    return (
        <div className="wn-outline-container" data-testid="writenow-outline">
            <div className="wn-outline-header">
                <span className={codicon('list-tree')} />
                <span>文档大纲</span>
            </div>
            <div className="wn-outline-list">
                {headings.map((heading) => (
                    <button
                        key={heading.id}
                        type="button"
                        className={`wn-outline-item wn-outline-item--level-${heading.level} ${selectedId === heading.id ? 'wn-outline-item--selected' : ''}`}
                        style={{ paddingLeft: `${(heading.level - 1) * 12 + 8}px` }}
                        onClick={() => handleClick(heading)}
                    >
                        <span className="wn-outline-text">{heading.text}</span>
                    </button>
                ))}
            </div>
        </div>
    );
}

/**
 * OutlineWidget - Document outline navigation panel.
 *
 * Why: Provides H1-H6 heading tree for document navigation.
 * Click on a heading to jump to that location in the editor.
 */
@injectable()
export class OutlineWidget extends ReactWidget {
    static readonly ID = WRITENOW_OUTLINE_WIDGET_ID;

    constructor(
        @inject(ActiveEditorService) private readonly activeEditor: ActiveEditorService,
    ) {
        super();
        this.id = OutlineWidget.ID;
        this.title.label = '大纲';
        this.title.caption = '文档大纲';
        this.title.iconClass = codicon('list-tree');
        this.title.closable = true;
        this.addClass('writenow-outline');

        this.update();
    }

    protected override render(): React.ReactNode {
        return <OutlineView activeEditor={this.activeEditor} />;
    }
}
