import { CommandContribution, MenuContribution } from '@theia/core';
import { KeybindingContribution } from '@theia/core/lib/browser/keybinding';
import { FrontendApplicationContribution } from '@theia/core/lib/browser/frontend-application-contribution';
import { OpenHandler } from '@theia/core/lib/browser/opener-service';
import { WidgetFactory } from '@theia/core/lib/browser/widget-manager';
import { injectable, ContainerModule } from '@theia/core/shared/inversify';
import { ProblemContribution } from '@theia/markers/lib/browser/problem/problem-contribution';

/**
 * Why: Import WriteNow design system styles. This single import loads:
 * - Design tokens (primitive + semantic)
 * - Theme definitions (Midnight default, Warm Gray, Parchment)
 * - Theia variable overrides
 * - Component-specific styles (AI Panel, Welcome, Editor)
 */
import './style/index.css';

import { ActiveEditorService } from './active-editor-service';
import { TipTapMarkdownEditorWidgetFactory } from './tiptap-markdown-editor-widget-factory';
import { TipTapMarkdownOpenHandler } from './tiptap-markdown-open-handler';
import { AiPanelContribution, AiPanelWidgetFactory } from './ai-panel/ai-panel-contribution';
import { AiPanelService } from './ai-panel/ai-panel-service';
import { VersionHistoryContribution, VersionHistoryWidgetFactory } from './version-history/version-history-contribution';
import { KnowledgeGraphContribution, KnowledgeGraphWidgetFactory } from './knowledge-graph/knowledge-graph-contribution';
import { SettingsContribution, SettingsWidgetFactory } from './settings/settings-contribution';
import { WritenowStatusbarContribution } from './statusbar/writenow-statusbar-contribution';
import { CrashRecoveryContribution } from './crash-recovery/crash-recovery-contribution';
import { WritenowCoreContribution } from './writenow-core-contribution';
import { WritenowFrontendService } from './writenow-frontend-service';
import { WritenowLayoutContribution } from './writenow-layout-contribution';
import { WritenowWelcomeWidgetFactory } from './writenow-welcome-widget-factory';
import { OutlineContribution, OutlineWidgetFactory } from './outline/outline-contribution';
import { HelpContribution, ShortcutsDialogFactory, AboutDialogFactory } from './help/help-contribution';
import { NotificationService } from './notification/notification-widget';
import { NotificationContribution, NotificationWidgetFactory } from './notification/notification-contribution';
import { NavigatorContextMenuContribution } from './navigator/navigator-context-menu-contribution';

// P2 Features
import { CharacterContribution, CharacterWidgetFactory } from './character/character-contribution';
import { TerminologyContribution, TerminologyWidgetFactory } from './terminology/terminology-contribution';
import { StatsContribution, StatsWidgetFactory } from './stats/stats-contribution';
import { LogViewerContribution, LogViewerWidgetFactory } from './log-viewer/log-viewer-contribution';
import { UserGuideContribution, UserGuideWidgetFactory } from './user-guide/user-guide-contribution';
import { UpdateContribution } from './update/update-contribution';

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
    bind(KnowledgeGraphContribution).toSelf().inSingletonScope();
    bind(CommandContribution).toService(KnowledgeGraphContribution);
    bind(MenuContribution).toService(KnowledgeGraphContribution);
    bind(KnowledgeGraphWidgetFactory).toSelf().inSingletonScope();

    // Settings panel
    bind(SettingsContribution).toSelf().inSingletonScope();
    bind(CommandContribution).toService(SettingsContribution);
    bind(MenuContribution).toService(SettingsContribution);
    bind(KeybindingContribution).toService(SettingsContribution);
    bind(SettingsWidgetFactory).toSelf().inSingletonScope();

    // Status bar (word count + AI status)
    bind(WritenowStatusbarContribution).toSelf().inSingletonScope();
    bind(FrontendApplicationContribution).toService(WritenowStatusbarContribution);

    // Crash recovery
    bind(CrashRecoveryContribution).toSelf().inSingletonScope();
    bind(FrontendApplicationContribution).toService(CrashRecoveryContribution);

    bind(WritenowCoreContribution).toSelf().inSingletonScope();
    bind(CommandContribution).toService(WritenowCoreContribution);
    bind(MenuContribution).toService(WritenowCoreContribution);
    bind(KeybindingContribution).toService(WritenowCoreContribution);
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
    bind(WidgetFactory).to(KnowledgeGraphWidgetFactory).inSingletonScope();
    bind(WidgetFactory).to(SettingsWidgetFactory).inSingletonScope();

    // Outline panel (P1-003)
    bind(OutlineContribution).toSelf().inSingletonScope();
    bind(CommandContribution).toService(OutlineContribution);
    bind(MenuContribution).toService(OutlineContribution);
    bind(OutlineWidgetFactory).toSelf().inSingletonScope();
    bind(WidgetFactory).to(OutlineWidgetFactory).inSingletonScope();

    // Help dialogs (P1-006, P1-007)
    bind(HelpContribution).toSelf().inSingletonScope();
    bind(CommandContribution).toService(HelpContribution);
    bind(MenuContribution).toService(HelpContribution);
    bind(KeybindingContribution).toService(HelpContribution);
    bind(ShortcutsDialogFactory).toSelf().inSingletonScope();
    bind(AboutDialogFactory).toSelf().inSingletonScope();
    bind(WidgetFactory).to(ShortcutsDialogFactory).inSingletonScope();
    bind(WidgetFactory).to(AboutDialogFactory).inSingletonScope();

    // Notification center (P1-008)
    bind(NotificationService).toSelf().inSingletonScope();
    bind(NotificationContribution).toSelf().inSingletonScope();
    bind(FrontendApplicationContribution).toService(NotificationContribution);
    bind(NotificationWidgetFactory).toSelf().inSingletonScope();
    bind(WidgetFactory).to(NotificationWidgetFactory).inSingletonScope();

    // Navigator context menu (P1-002)
    bind(NavigatorContextMenuContribution).toSelf().inSingletonScope();
    bind(CommandContribution).toService(NavigatorContextMenuContribution);
    bind(MenuContribution).toService(NavigatorContextMenuContribution);
    bind(KeybindingContribution).toService(NavigatorContextMenuContribution);

    // Character management (P2-003)
    bind(CharacterContribution).toSelf().inSingletonScope();
    bind(CommandContribution).toService(CharacterContribution);
    bind(MenuContribution).toService(CharacterContribution);
    bind(CharacterWidgetFactory).toSelf().inSingletonScope();
    bind(WidgetFactory).to(CharacterWidgetFactory).inSingletonScope();

    // Terminology panel (P2-004)
    bind(TerminologyContribution).toSelf().inSingletonScope();
    bind(CommandContribution).toService(TerminologyContribution);
    bind(MenuContribution).toService(TerminologyContribution);
    bind(TerminologyWidgetFactory).toSelf().inSingletonScope();
    bind(WidgetFactory).to(TerminologyWidgetFactory).inSingletonScope();

    // Stats panel (P2-005)
    bind(StatsContribution).toSelf().inSingletonScope();
    bind(CommandContribution).toService(StatsContribution);
    bind(MenuContribution).toService(StatsContribution);
    bind(StatsWidgetFactory).toSelf().inSingletonScope();
    bind(WidgetFactory).to(StatsWidgetFactory).inSingletonScope();

    // Log viewer (P2-006)
    bind(LogViewerContribution).toSelf().inSingletonScope();
    bind(CommandContribution).toService(LogViewerContribution);
    bind(MenuContribution).toService(LogViewerContribution);
    bind(LogViewerWidgetFactory).toSelf().inSingletonScope();
    bind(WidgetFactory).to(LogViewerWidgetFactory).inSingletonScope();

    // User guide (P2-007)
    bind(UserGuideContribution).toSelf().inSingletonScope();
    bind(CommandContribution).toService(UserGuideContribution);
    bind(MenuContribution).toService(UserGuideContribution);
    bind(UserGuideWidgetFactory).toSelf().inSingletonScope();
    bind(WidgetFactory).to(UserGuideWidgetFactory).inSingletonScope();

    // Update notification (P2-008)
    bind(UpdateContribution).toSelf().inSingletonScope();
    bind(FrontendApplicationContribution).toService(UpdateContribution);
});
