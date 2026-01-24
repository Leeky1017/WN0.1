import * as React from '@theia/core/shared/react';

import URI from '@theia/core/lib/common/uri';
import { BinaryBuffer } from '@theia/core/lib/common/buffer';
import { Emitter, Event } from '@theia/core/lib/common/event';
import type { CommandService } from '@theia/core/lib/common/command';
import { ReactWidget } from '@theia/core/lib/browser/widgets/react-widget';
import { Saveable, setDirty } from '@theia/core/lib/browser/saveable';
import type { ContextKey, ContextKeyService } from '@theia/core/lib/browser/context-key-service';
import type { MessageService } from '@theia/core/lib/common/message-service';
import { Navigatable } from '@theia/core/lib/browser';

import type { FileService } from '@theia/filesystem/lib/browser/file-service';

import type { Editor } from '@tiptap/core';
import { Extension } from '@tiptap/core';
import { EditorContent, useEditor } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import { Markdown } from '@tiptap/markdown';

import { ActiveEditorService } from './active-editor-service';

export const TIPTAP_MARKDOWN_EDITOR_WIDGET_FACTORY_ID = 'writenow-tiptap-markdown-editor';

type FocusChangedHandler = (focused: boolean) => void;
type MarkdownChangedHandler = (markdown: string) => void;

type TipTapMarkdownEditorProps = Readonly<{
    markdown: string;
    onMarkdownChanged: MarkdownChangedHandler;
    onFocusChanged: FocusChangedHandler;
    onEditorReady: (editor: Editor | null) => void;
}>;

const TabIndentExtension = Extension.create({
    name: 'writenowTabIndent',
    addKeyboardShortcuts() {
        return {
            Tab: () => {
                // Why: In TipTap/ProseMirror, Tab is not guaranteed to do anything by default
                // (and the browser may move focus). WriteNow expects Tab to be usable in-editor.
                return this.editor.commands.insertContent('  ');
            },
        };
    },
});

function TipTapMarkdownEditor(props: TipTapMarkdownEditorProps): React.ReactElement {
    const { markdown, onMarkdownChanged, onFocusChanged, onEditorReady } = props;
    const isProgrammaticUpdateRef = React.useRef(false);

    const editor = useEditor({
        extensions: [
            StarterKit,
            Markdown.configure({
                indentation: { style: 'space', size: 2 },
            }),
            TabIndentExtension,
        ],
        content: markdown,
        contentType: 'markdown',
        editorProps: {
            attributes: {
                // Why: CSS styling moved to editor.css for consistent theming
                class: 'writenow-tiptap-editor',
            },
            handleDOMEvents: {
                focus: () => {
                    onFocusChanged(true);
                    return false;
                },
                blur: () => {
                    onFocusChanged(false);
                    return false;
                },
            },
        },
        onUpdate: ({ editor: nextEditor }: { editor: Editor }) => {
            if (isProgrammaticUpdateRef.current) return;
            // `getMarkdown` is provided by `@tiptap/markdown`.
            const next = nextEditor.getMarkdown();
            onMarkdownChanged(next);
        },
    });

    React.useEffect(() => {
        onEditorReady(editor ?? null);
        return () => onEditorReady(null);
        // Why: The callback is owned by the widget and is stable for the widget lifetime.
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [editor]);

    React.useEffect(() => {
        if (!editor) return;
        const current = editor.getMarkdown();
        if (current === markdown) return;

        isProgrammaticUpdateRef.current = true;
        editor.commands.setContent(markdown, { emitUpdate: false, contentType: 'markdown' });
        isProgrammaticUpdateRef.current = false;
    }, [editor, markdown]);

    return (
        <div className="wn-editor-container" data-testid="writenow-tiptap-markdown-editor">
            <EditorContent editor={editor} />
        </div>
    );
}

/**
 * A `.md` editor widget using TipTap.
 *
 * Why: TipTap/ProseMirror owns rich-text editing semantics, while Theia owns global IDE commands
 * (e.g. Save). We integrate via Saveable/dirty and a layered keydown routing policy:
 * - editor semantic keys (Tab/Bold/Undo/Redo) stay within the editor
 * - global keys (Save) remain owned by Theia
 */
export class TipTapMarkdownEditorWidget extends ReactWidget implements Saveable, Navigatable {
    private readonly onDirtyChangedEmitter = new Emitter<void>();
    readonly onDirtyChanged: Event<void> = this.onDirtyChangedEmitter.event;

    private readonly onContentChangedEmitter = new Emitter<void>();
    readonly onContentChanged: Event<void> = this.onContentChangedEmitter.event;

    private readonly editorFocusKey: ContextKey<boolean>;

    private resourceUri: URI | undefined;
    private isLoaded = false;
    private loadError: string | undefined;

    private currentMarkdown = '';
    private lastSavedMarkdown = '';
    private isDirty = false;

    private tiptapEditor: Editor | undefined;
    private isEditorFocused = false;

    constructor(
        private readonly fileService: FileService,
        private readonly commandService: CommandService,
        private readonly messageService: MessageService,
        private readonly contextKeyService: ContextKeyService,
        private readonly activeEditorService: ActiveEditorService,
    ) {
        super();
        this.addClass('writenow-tiptap-editor-host');
        this.editorFocusKey = this.contextKeyService.createKey<boolean>('writenow.editorFocus', false);
    }

    get dirty(): boolean {
        return this.isDirty;
    }

    getResourceUri(): URI | undefined {
        return this.resourceUri;
    }

    /**
     * Get the logical WriteNow article id for the current editor.
     *
     * Why: Theia uses absolute file URIs, but WriteNow's SQLite layer keys articles by a stable string id. For the
     * current migration, the canonical id is the markdown file name (basename) so version history and AI snapshotting
     * can operate without leaking absolute paths into the DB.
     */
    getArticleId(): string | null {
        const uri = this.resourceUri;
        if (!uri) return null;
        const base = typeof uri.path.base === 'string' ? uri.path.base : '';
        return base ? base : null;
    }

    /**
     * Get the current markdown content.
     *
     * Why: Version history (manual snapshots, diff, rollback) and the AI Panel need access to the full document
     * text even when the editor widget is not currently focused.
     */
    getMarkdown(): string {
        return this.currentMarkdown;
    }

    createMoveToUri(resourceUri: URI): URI | undefined {
        return resourceUri;
    }

    /**
     * Why: `Tab` / `Ctrl/Cmd+B` / `Ctrl/Cmd+Z` should be owned by the editor when focused.
     * Theia's keybinding registry listens on `document` capture phase; to prevent it from
     * stealing editor-specific keys, we preemptively `preventDefault()` on `window` capture.
     *
     * Note: ProseMirror's key handling ignores events that are already `defaultPrevented`,
     * so we also invoke the corresponding TipTap commands directly.
     */
    protected override onAfterAttach(msg: import('@lumino/messaging').Message): void {
        super.onAfterAttach(msg);

        const onKeyDownCapture = (event: KeyboardEvent) => {
            if (!this.isEditorFocused) return;

            const target = event.target;
            if (!(target instanceof Node)) return;
            if (!this.node.contains(target)) return;

            const isMod = event.ctrlKey || event.metaKey;
            const key = event.key.toLowerCase();

            // IME safety: do not interfere with composition except for explicit reserved keys.
            // (Reserved keys are handled by Theia's global layer.)
            if (event.isComposing) return;

            if (key === 'tab') {
                event.preventDefault();
                this.tiptapEditor?.commands.focus();
                this.tiptapEditor?.commands.insertContent('  ');
                return;
            }

            // WriteNow decision (Phase 1): claim Ctrl/Cmd+K while focused to avoid chord conflicts.
            // For now we delegate to a Theia command so the behavior is observable and configurable.
            if (isMod && key === 'k') {
                event.preventDefault();
                void this.commandService
                    .executeCommand('writenow.aiPanel.open')
                    .catch((error: unknown) => console.error('[writenow-core] Ctrl+K command failed', error));
                return;
            }

            // Editor-owned shortcuts: prevent Theia's global layer; TipTap will handle.
            if (isMod && (key === 'z' || key === 'y' || key === 'b')) {
                event.preventDefault();
                this.tiptapEditor?.commands.focus();
                if (key === 'z') {
                    if (event.shiftKey) {
                        this.tiptapEditor?.commands.redo();
                    } else {
                        this.tiptapEditor?.commands.undo();
                    }
                } else if (key === 'y') {
                    this.tiptapEditor?.commands.redo();
                } else if (key === 'b') {
                    this.tiptapEditor?.commands.toggleBold();
                }
            }
        };

        window.addEventListener('keydown', onKeyDownCapture, true);
        this.toDispose.push({
            dispose: () => window.removeEventListener('keydown', onKeyDownCapture, true),
        });
    }

    protected override onBeforeDetach(msg: import('@lumino/messaging').Message): void {
        // Why: The widget is leaving the DOM; ensure focus context keys don't remain stuck.
        this.setEditorFocused(false);
        if (this.activeEditorService.getActive() === this) {
            this.activeEditorService.setActive(null);
        }
        super.onBeforeDetach(msg);
    }

    async setResourceUri(uri: URI): Promise<void> {
        this.resourceUri = uri;
        await this.loadFromDisk();
    }

    private async loadFromDisk(): Promise<void> {
        if (!this.resourceUri) return;
        try {
            const file = await this.fileService.readFile(this.resourceUri);
            const markdown = file.value.toString();

            this.isLoaded = true;
            this.loadError = undefined;
            this.currentMarkdown = markdown;
            this.lastSavedMarkdown = markdown;
            this.setDirtyState(false);
        } catch (error) {
            this.isLoaded = false;
            this.loadError = error instanceof Error ? error.message : String(error);
            this.currentMarkdown = '';
            this.lastSavedMarkdown = '';
            this.setDirtyState(false);

            this.messageService.error(`Failed to load file: ${this.resourceUri.path.fsPath()}\n${this.loadError}`);
        } finally {
            this.update();
        }
    }

    private onEditorMarkdownChanged(nextMarkdown: string): void {
        if (!this.isLoaded) return;
        this.currentMarkdown = nextMarkdown;

        const nextDirty = this.currentMarkdown !== this.lastSavedMarkdown;
        if (nextDirty !== this.isDirty) {
            this.setDirtyState(nextDirty);
        }

        this.onContentChangedEmitter.fire();
    }

    private setEditorFocused(focused: boolean): void {
        this.isEditorFocused = focused;
        this.editorFocusKey.set(focused);
        if (focused) {
            // Why: AI Panel needs access to the most recently focused editor selection.
            this.activeEditorService.setActive(this);
        }
    }

    private onEditorFocusChanged(focused: boolean): void {
        this.setEditorFocused(focused);
    }

    private setDirtyState(dirty: boolean): void {
        this.isDirty = dirty;
        setDirty(this, dirty);
        this.onDirtyChangedEmitter.fire();
    }

    async save(): Promise<void> {
        if (!this.resourceUri) return;
        if (!this.isDirty) return;

        try {
            await this.fileService.writeFile(this.resourceUri, BinaryBuffer.fromString(this.currentMarkdown));
            this.lastSavedMarkdown = this.currentMarkdown;
            this.setDirtyState(false);
        } catch (error) {
            const message = error instanceof Error ? error.message : String(error);
            this.messageService.error(`Failed to save file: ${this.resourceUri.path.fsPath()}\n${message}`);
            // Why: On save failure, dirty MUST remain set so the user can retry.
            this.setDirtyState(true);
            throw error;
        }
    }

    /**
     * Get the current selection snapshot.
     *
     * Why: The AI Panel needs deterministic selection capture for "rewrite selection" flows even after focus moves
     * away from the editor widget.
     */
    getSelectionSnapshot(): { from: number; to: number; text: string } | null {
        const editor = this.tiptapEditor;
        if (!editor) return null;

        const selection = editor.state.selection;
        const from = selection.from;
        const to = selection.to;
        const text = editor.state.doc.textBetween(from, to, '\n');
        return { from, to, text };
    }

    /**
     * Replace a document range with plain text.
     *
     * Why: `insertContent` treats strings as HTML; using a ProseMirror transaction preserves literal text/Markdown.
     */
    replaceRange(from: number, to: number, text: string): void {
        const editor = this.tiptapEditor;
        if (!editor) return;

        const nextText = typeof text === 'string' ? text : '';
        const docSize = editor.state.doc.content.size;
        const clampedFrom = Math.max(0, Math.min(from, docSize));
        const clampedTo = Math.max(clampedFrom, Math.min(to, docSize));

        editor.commands.focus();
        editor.view.dispatch(editor.state.tr.insertText(nextText, clampedFrom, clampedTo));
    }

    /**
     * Replace the entire document content.
     *
     * Why: Rolling back to a historical snapshot must update the editor view while preserving Save/Dirty semantics.
     * Failure semantics: No-op if the widget hasn't finished loading.
     */
    setMarkdown(markdown: string): void {
        if (!this.isLoaded) return;

        this.currentMarkdown = typeof markdown === 'string' ? markdown : '';
        const nextDirty = this.currentMarkdown !== this.lastSavedMarkdown;
        if (nextDirty !== this.isDirty) {
            this.setDirtyState(nextDirty);
        }
        this.onContentChangedEmitter.fire();
        this.update();
    }

    protected override render(): React.ReactNode {
        if (!this.resourceUri) {
            return <div style={{ padding: 12 }}>No resource.</div>;
        }

        if (!this.isLoaded) {
            return <div style={{ padding: 12 }}>{this.loadError ? `Load failed: ${this.loadError}` : 'Loading…'}</div>;
        }

        return (
            <TipTapMarkdownEditor
                markdown={this.currentMarkdown}
                onMarkdownChanged={(markdown) => this.onEditorMarkdownChanged(markdown)}
                onFocusChanged={(focused) => this.onEditorFocusChanged(focused)}
                onEditorReady={(editor) => {
                    this.tiptapEditor = editor ?? undefined;
                }}
            />
        );
    }
}
