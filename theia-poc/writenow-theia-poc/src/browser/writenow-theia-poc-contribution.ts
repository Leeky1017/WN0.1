import { KeybindingContribution, KeybindingRegistry } from '@theia/core/lib/browser';
import { open as openUri, OpenerService } from '@theia/core/lib/browser/opener-service';
import { Command, CommandContribution, CommandRegistry } from '@theia/core/lib/common';
import { MessageService } from '@theia/core/lib/common/message-service';
import { inject, injectable } from '@theia/core/shared/inversify';
import { WorkspaceService } from '@theia/workspace/lib/browser/workspace-service';
import { HelloBackendWithClientService, HelloBackendService } from '../common/protocol';
import { WritenowTheiaPocCommands } from './writenow-theia-poc-commands';

const SayHelloViaBackendCommandWithCallBack: Command = {
    id: 'sayHelloOnBackendWithCallBack.command',
    label: 'Say hello on the backend with a callback to the client',
};

const SayHelloViaBackendCommand: Command = {
    id: 'sayHelloOnBackend.command',
    label: 'Say hello on the backend',
};

@injectable()
export class WritenowTheiaPocCommandContribution implements CommandContribution, KeybindingContribution {

    constructor(
        @inject(HelloBackendWithClientService) private readonly helloBackendWithClientService: HelloBackendWithClientService,
        @inject(HelloBackendService) private readonly helloBackendService: HelloBackendService,
        @inject(MessageService) private readonly messageService: MessageService,
        @inject(OpenerService) private readonly openerService: OpenerService,
        @inject(WorkspaceService) private readonly workspaceService: WorkspaceService,
    ) { }

    registerCommands(registry: CommandRegistry): void {
        registry.registerCommand(WritenowTheiaPocCommands.OPEN_POC_TEST_MARKDOWN, {
            execute: async () => {
                const roots = await this.workspaceService.roots;
                const [root] = roots;
                if (!root) {
                    this.messageService.error('Open PoC markdown failed: no workspace root is open.');
                    return;
                }

                const target = root.resource.resolve('test.md');
                try {
                    await openUri(this.openerService, target);
                } catch (error) {
                    const message = error instanceof Error ? error.message : String(error);
                    this.messageService.error(`Open PoC markdown failed: ${message}`);
                }
            }
        });

        registry.registerCommand(WritenowTheiaPocCommands.OPEN_INLINE_AI, {
            execute: () => this.messageService.info('Inline AI (PoC): Ctrl/Cmd+K was routed from TipTap to a WriteNow-owned command.'),
        });

        registry.registerCommand(SayHelloViaBackendCommandWithCallBack, {
            execute: () => this.helloBackendWithClientService.greet().then(r => console.log(r))
        });
        registry.registerCommand(SayHelloViaBackendCommand, {
            execute: () => this.helloBackendService.sayHelloTo('World').then(r => console.log(r))
        });
    }

    registerKeybindings(registry: KeybindingRegistry): void {
        registry.registerKeybinding({
            command: WritenowTheiaPocCommands.OPEN_POC_TEST_MARKDOWN.id,
            keybinding: 'ctrlcmd+alt+o',
        });
    }
}
