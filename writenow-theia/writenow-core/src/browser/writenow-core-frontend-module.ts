import { CommandContribution, MenuContribution } from '@theia/core';
import { KeybindingContribution } from '@theia/core/lib/browser/keybinding';
import { FrontendApplicationContribution } from '@theia/core/lib/browser/frontend-application-contribution';
import { OpenHandler } from '@theia/core/lib/browser/opener-service';
import { WidgetFactory } from '@theia/core/lib/browser/widget-manager';
import { injectable, ContainerModule } from '@theia/core/shared/inversify';
import { ProblemContribution } from '@theia/markers/lib/browser/problem/problem-contribution';

import { ActiveEditorService } from './active-editor-service';
import { TipTapMarkdownEditorWidgetFactory } from './tiptap-markdown-editor-widget-factory';
import { TipTapMarkdownOpenHandler } from './tiptap-markdown-open-handler';
import { AiPanelContribution, AiPanelWidgetFactory } from './ai-panel/ai-panel-contribution';
import { AiPanelService } from './ai-panel/ai-panel-service';
import { VersionHistoryContribution, VersionHistoryWidgetFactory } from './version-history/version-history-contribution';
import { WritenowCoreContribution } from './writenow-core-contribution';
import { WritenowFrontendService } from './writenow-frontend-service';
import { WritenowLayoutContribution } from './writenow-layout-contribution';
import { WritenowWelcomeWidgetFactory } from './writenow-welcome-widget-factory';

@injectable()
class WritenowHiddenProblemContribution extends ProblemContribution {
    /**
     * Why: `@theia/markers` is pulled transitively by `@theia/monaco`, but WriteNow is not a
     * programmer IDE and should not expose the "Problems" panel/commands. We keep markers for
     * Monaco diagnostics while disabling the Problems UI entrypoints.
     */
    override onStart(_app: unknown): void {}

    /**
     * Why: The upstream contribution opens the Problems view by default; WriteNow must not.
     */
    override async initializeLayout(_app: unknown): Promise<void> {}

    /**
     * Why: Hide Problems commands (incl. toggle) from the command palette.
     */
    override registerCommands(_commands: unknown): void {}

    /**
     * Why: Hide Problems menu entries (View menu).
     */
    override registerMenus(_menus: unknown): void {}

    /**
     * Why: Hide Problems keybindings (e.g. Ctrl/Cmd+Shift+M).
     */
    override registerKeybindings(_keybindings: unknown): void {}

    /**
     * Why: Hide Problems toolbar items.
     */
    override async registerToolbarItems(_toolbarRegistry: unknown): Promise<void> {}
}

export default new ContainerModule((bind, _unbind, isBound, rebind) => {
    if (isBound(ProblemContribution)) {
        rebind(ProblemContribution).to(WritenowHiddenProblemContribution).inSingletonScope();
    }

    bind(WritenowFrontendService).toSelf().inSingletonScope();
    bind(ActiveEditorService).toSelf().inSingletonScope();

    bind(AiPanelService).toSelf().inSingletonScope();
    bind(AiPanelContribution).toSelf().inSingletonScope();
    bind(CommandContribution).toService(AiPanelContribution);
    bind(KeybindingContribution).toService(AiPanelContribution);
    bind(AiPanelWidgetFactory).toSelf().inSingletonScope();

    bind(VersionHistoryContribution).toSelf().inSingletonScope();
    bind(CommandContribution).toService(VersionHistoryContribution);
    bind(VersionHistoryWidgetFactory).toSelf().inSingletonScope();

    bind(WritenowCoreContribution).toSelf().inSingletonScope();
    bind(CommandContribution).toService(WritenowCoreContribution);
    bind(MenuContribution).toService(WritenowCoreContribution);
    bind(FrontendApplicationContribution).toService(WritenowCoreContribution);

    bind(WritenowLayoutContribution).toSelf().inSingletonScope();
    bind(CommandContribution).toService(WritenowLayoutContribution);
    bind(FrontendApplicationContribution).toService(WritenowLayoutContribution);

    // Why: Align with Theia/PoC binding style; opener-service + widget-manager collect these
    // via multi-injection (no aliases) and choose the highest `canHandle` priority.
    bind(WidgetFactory).to(TipTapMarkdownEditorWidgetFactory).inSingletonScope();
    bind(OpenHandler).to(TipTapMarkdownOpenHandler).inSingletonScope();

    bind(WidgetFactory).to(WritenowWelcomeWidgetFactory).inSingletonScope();
    bind(WidgetFactory).to(AiPanelWidgetFactory).inSingletonScope();
    bind(WidgetFactory).to(VersionHistoryWidgetFactory).inSingletonScope();
});
