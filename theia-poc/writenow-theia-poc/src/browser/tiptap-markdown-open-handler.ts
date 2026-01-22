import URI from '@theia/core/lib/common/uri';
import { defaultHandlerPriority, NavigatableWidgetOpenHandler, WidgetOpenerOptions } from '@theia/core/lib/browser';
import { injectable } from '@theia/core/shared/inversify';

import { TipTapMarkdownEditorWidget } from './tiptap-markdown-editor-widget';
import { TipTapMarkdownEditorWidgetFactory } from './tiptap-markdown-editor-widget-factory';

/**
 * Why: `.md` must open in TipTap (PoC 001). We give it a higher priority than the
 * default editor opener so File Explorer opens markdown with this widget without
 * requiring preference configuration.
 */
@injectable()
export class TipTapMarkdownOpenHandler extends NavigatableWidgetOpenHandler<TipTapMarkdownEditorWidget> {
  readonly id: string = TipTapMarkdownEditorWidgetFactory.ID;

  canHandle(uri: URI, _options?: WidgetOpenerOptions): number {
    if (uri.path.ext !== '.md') return 0;
    return defaultHandlerPriority + 1;
  }
}

