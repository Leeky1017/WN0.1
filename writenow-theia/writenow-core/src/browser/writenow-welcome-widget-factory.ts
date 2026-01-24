import { WidgetFactory } from '@theia/core/lib/browser';
import { CommandService } from '@theia/core/lib/common/command';
import { MessageService } from '@theia/core/lib/common/message-service';
import { inject, injectable } from '@theia/core/shared/inversify';

import { WritenowFrontendService } from './writenow-frontend-service';
import { WritenowWelcomeWidget } from './writenow-welcome-widget';

@injectable()
export class WritenowWelcomeWidgetFactory implements WidgetFactory {
    static readonly ID = WritenowWelcomeWidget.ID;

    readonly id = WritenowWelcomeWidgetFactory.ID;

    constructor(
        @inject(CommandService) private readonly commandService: CommandService,
        @inject(MessageService) private readonly messageService: MessageService,
        @inject(WritenowFrontendService) private readonly writenow: WritenowFrontendService,
    ) {}

    async createWidget(): Promise<WritenowWelcomeWidget> {
        return new WritenowWelcomeWidget(this.commandService, this.messageService, this.writenow);
    }
}
