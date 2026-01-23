import { WidgetFactory } from '@theia/core/lib/browser';
import { injectable } from '@theia/core/shared/inversify';

import { WritenowAiPanelPlaceholderWidget } from './writenow-ai-panel-placeholder-widget';

@injectable()
export class WritenowAiPanelPlaceholderWidgetFactory implements WidgetFactory {
    static readonly ID = WritenowAiPanelPlaceholderWidget.ID;

    readonly id = WritenowAiPanelPlaceholderWidgetFactory.ID;

    async createWidget(): Promise<WritenowAiPanelPlaceholderWidget> {
        return new WritenowAiPanelPlaceholderWidget();
    }
}
