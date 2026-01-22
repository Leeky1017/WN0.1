import type { FrontendApplication } from '@theia/core/lib/browser/frontend-application';
import { ApplicationShell, FrontendApplicationContribution } from '@theia/core/lib/browser';
import { open as openUri, OpenerService } from '@theia/core/lib/browser/opener-service';
import { FrontendApplicationStateService } from '@theia/core/lib/browser/frontend-application-state';
import { MessageService } from '@theia/core/lib/common/message-service';
import { PreferenceService } from '@theia/core/lib/common/preferences';
import { inject, injectable } from '@theia/core/shared/inversify';
import { WorkspaceService } from '@theia/workspace/lib/browser/workspace-service';

/**
 * Why: The generator's default layout can start with the left panel collapsed (width 0),
 * which prevents verifying `.md` opener behavior via File Explorer. For Phase 0 PoC we
 * force-expand the left panel to ensure the File Navigator is visible.
 */
@injectable()
export class WritenowTheiaPocFrontendStartup implements FrontendApplicationContribution {
  constructor(
    @inject(ApplicationShell) private readonly shell: ApplicationShell,
    @inject(FrontendApplicationStateService)
    private readonly appState: FrontendApplicationStateService,
    @inject(OpenerService) private readonly openerService: OpenerService,
    @inject(WorkspaceService) private readonly workspaceService: WorkspaceService,
    @inject(PreferenceService) private readonly preferenceService: PreferenceService,
    @inject(MessageService) private readonly messageService: MessageService,
  ) {}

  onStart(_app: FrontendApplication): void {
    void this.ensureExpanded();
  }

  initializeLayout(_app: FrontendApplication): void {
    void this.ensureExpanded();
  }

  private async ensureExpanded(): Promise<void> {
    // Why: Side panel sizing depends on the shell being visible; waiting for `ready`
    // ensures `getDefaultPanelSize()` can compute a non-zero width.
    await this.appState.reachedState('ready');
    // eslint-disable-next-line no-console
    console.info('[writenow-theia-poc] expanding left panel (files)');
    this.shell.leftPanelHandler.expand('files');

    await this.maybeAutoOpenPocMarkdown();
  }

  /**
   * Why: Puppeteer-based verification needs a deterministic way to open a `.md` file
   * without relying on File Explorer rendering (which can be flaky in headless Chromium).
   *
   * Controlled via `--set-preference writenow.poc.autoOpenTestMarkdown=true`.
   */
  private async maybeAutoOpenPocMarkdown(): Promise<void> {
    const enabled = this.preferenceService.get<boolean>('writenow.poc.autoOpenTestMarkdown', false);
    if (!enabled) {
      return;
    }

    const roots = await this.workspaceService.roots;
    const [root] = roots;
    if (!root) {
      this.messageService.error('Auto-open PoC markdown failed: no workspace root is open.');
      return;
    }

    const target = root.resource.resolve('test.md');
    try {
      await openUri(this.openerService, target);
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      this.messageService.error(`Auto-open PoC markdown failed: ${message}`);
    }
  }
}
