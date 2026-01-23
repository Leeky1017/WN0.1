import { CommandContribution, MenuContribution } from '@theia/core';
import { FrontendApplicationContribution } from '@theia/core/lib/browser/frontend-application-contribution';
import { OpenHandler } from '@theia/core/lib/browser/opener-service';
import { WidgetFactory } from '@theia/core/lib/browser/widget-manager';
import { injectable, ContainerModule } from '@theia/core/shared/inversify';
import { ProblemContribution } from '@theia/markers/lib/browser/problem/problem-contribution';

import { TipTapMarkdownEditorWidgetFactory } from './tiptap-markdown-editor-widget-factory';
import { TipTapMarkdownOpenHandler } from './tiptap-markdown-open-handler';
import { WritenowCoreContribution } from './writenow-core-contribution';

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

    bind(WritenowCoreContribution).toSelf().inSingletonScope();
    bind(CommandContribution).toService(WritenowCoreContribution);
    bind(MenuContribution).toService(WritenowCoreContribution);
    bind(FrontendApplicationContribution).toService(WritenowCoreContribution);

    // Why: Align with Theia/PoC binding style; opener-service + widget-manager collect these
    // via multi-injection (no aliases) and choose the highest `canHandle` priority.
    bind(WidgetFactory).to(TipTapMarkdownEditorWidgetFactory).inSingletonScope();
    bind(OpenHandler).to(TipTapMarkdownOpenHandler).inSingletonScope();
});

