import { Emitter, Event } from '@theia/core/lib/common/event';
import { injectable } from '@theia/core/shared/inversify';

import type { TipTapMarkdownEditorWidget } from './tiptap-markdown-editor-widget';

/**
 * Tracks the most recently focused TipTap editor widget.
 *
 * Why: The AI Panel lives in a different shell area (right sidebar) and becomes the active widget when opened.
 * We still need a stable handle to the last editor selection to support "selection -> SKILL -> apply".
 */
@injectable()
export class ActiveEditorService {
    private active: TipTapMarkdownEditorWidget | null = null;
    private readonly onDidChangeEmitter = new Emitter<TipTapMarkdownEditorWidget | null>();
    readonly onDidChange: Event<TipTapMarkdownEditorWidget | null> = this.onDidChangeEmitter.event;

    setActive(widget: TipTapMarkdownEditorWidget | null): void {
        if (this.active === widget) return;
        this.active = widget;
        this.onDidChangeEmitter.fire(widget);
    }

    getActive(): TipTapMarkdownEditorWidget | null {
        return this.active;
    }
}

