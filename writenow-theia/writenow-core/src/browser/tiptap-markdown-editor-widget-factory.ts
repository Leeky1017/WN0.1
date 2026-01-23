import URI from '@theia/core/lib/common/uri';
import { inject, injectable } from '@theia/core/shared/inversify';
import { LabelProvider, NavigatableWidgetOptions, WidgetFactory } from '@theia/core/lib/browser';
import { CommandService } from '@theia/core/lib/common/command';
import { ContextKeyService } from '@theia/core/lib/browser/context-key-service';
import { MessageService } from '@theia/core/lib/common/message-service';

import { FileService } from '@theia/filesystem/lib/browser/file-service';

import { TIPTAP_MARKDOWN_EDITOR_WIDGET_FACTORY_ID, TipTapMarkdownEditorWidget } from './tiptap-markdown-editor-widget';

/**
 * Why: `NavigatableWidgetOpenHandler` expects a widget factory registered under the same `id`.
 * We keep the ID stable so the opener + widget are trivially connected.
 */
@injectable()
export class TipTapMarkdownEditorWidgetFactory implements WidgetFactory {
    static readonly ID = TIPTAP_MARKDOWN_EDITOR_WIDGET_FACTORY_ID;

    readonly id: string = TipTapMarkdownEditorWidgetFactory.ID;

    constructor(
        @inject(LabelProvider) private readonly labelProvider: LabelProvider,
        @inject(FileService) private readonly fileService: FileService,
        @inject(CommandService) private readonly commandService: CommandService,
        @inject(MessageService) private readonly messageService: MessageService,
        @inject(ContextKeyService) private readonly contextKeyService: ContextKeyService,
    ) {}

    static createWidgetId(uri: URI, counter?: number): string {
        return `${TipTapMarkdownEditorWidgetFactory.ID}:${uri.toString()}${counter !== undefined ? `:${counter}` : ''}`;
    }

    async createWidget(options: NavigatableWidgetOptions): Promise<TipTapMarkdownEditorWidget> {
        const uri = new URI(options.uri);
        const widget = new TipTapMarkdownEditorWidget(
            this.fileService,
            this.commandService,
            this.messageService,
            this.contextKeyService,
        );

        this.setLabels(widget, uri);
        const labelListener = this.labelProvider.onDidChange((event) => {
            if (event.affects(uri)) {
                this.setLabels(widget, uri);
            }
        });
        widget.onDidDispose(() => labelListener.dispose());

        widget.id = TipTapMarkdownEditorWidgetFactory.createWidgetId(uri, options.counter);
        widget.title.closable = true;

        await widget.setResourceUri(uri);
        return widget;
    }

    private setLabels(widget: TipTapMarkdownEditorWidget, uri: URI): void {
        widget.title.caption = uri.path.fsPath();
        widget.title.label = this.labelProvider.getName(uri);
        widget.title.iconClass = `${this.labelProvider.getIcon(uri)} file-icon`;
    }
}
