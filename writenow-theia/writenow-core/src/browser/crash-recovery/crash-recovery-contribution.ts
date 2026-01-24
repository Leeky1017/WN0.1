import { FrontendApplicationContribution } from '@theia/core/lib/browser/frontend-application-contribution';
import { MessageService } from '@theia/core/lib/common/message-service';
import { inject, injectable } from '@theia/core/shared/inversify';

import { WritenowFrontendService } from '../writenow-frontend-service';

/**
 * Recoverable snapshot info.
 */
type RecoverableSnapshot = {
    articleId: string;
    snapshotId: string;
    content: string;
    createdAt: string;
};

/**
 * Crash Recovery Contribution.
 *
 * Why: On application start, check for unsaved snapshots from previous sessions.
 * If found, prompt user to recover or discard.
 */
@injectable()
export class CrashRecoveryContribution implements FrontendApplicationContribution {
    constructor(
        @inject(WritenowFrontendService) private readonly writenow: WritenowFrontendService,
        @inject(MessageService) private readonly messageService: MessageService,
    ) {}

    async onStart(): Promise<void> {
        // Delay check to allow UI to initialize
        setTimeout(() => {
            void this.checkForRecoverableSnapshots();
        }, 1000);
    }

    private async checkForRecoverableSnapshots(): Promise<void> {
        try {
            // Check for latest snapshots that might need recovery
            // This is a simplified implementation - in production, we'd track
            // "dirty" state at app exit and store recovery markers
            const recoveryKey = 'writenow.crashRecovery.pending';
            const pendingRecovery = localStorage.getItem(recoveryKey);
            
            if (!pendingRecovery) {
                return;
            }

            let snapshots: RecoverableSnapshot[];
            try {
                snapshots = JSON.parse(pendingRecovery);
                if (!Array.isArray(snapshots) || snapshots.length === 0) {
                    localStorage.removeItem(recoveryKey);
                    return;
                }
            } catch {
                localStorage.removeItem(recoveryKey);
                return;
            }

            // Show recovery dialog
            const fileList = snapshots.map((s) => `• ${s.articleId}`).join('\n');
            const message = `检测到上次会话有未保存的内容：\n\n${fileList}\n\n是否恢复这些内容？`;

            const action = await this.messageService.info(
                message,
                '恢复',
                '丢弃',
            );

            if (action === '恢复') {
                await this.recoverSnapshots(snapshots);
            } else {
                // User chose to discard
                localStorage.removeItem(recoveryKey);
                this.messageService.info('已丢弃未保存的内容。');
            }
        } catch (error) {
            // Silently fail - crash recovery should not block app startup
            console.error('[writenow-core] Crash recovery check failed:', error);
        }
    }

    private async recoverSnapshots(snapshots: RecoverableSnapshot[]): Promise<void> {
        let recovered = 0;
        let failed = 0;

        for (const snapshot of snapshots) {
            try {
                // Attempt to restore the snapshot
                // In production, this would open the file and apply the snapshot content
                const result = await this.writenow.invokeResponse('file:snapshot:write', {
                    path: snapshot.articleId,
                    content: snapshot.content,
                    reason: 'manual',
                });

                if (result.ok) {
                    recovered++;
                } else {
                    failed++;
                }
            } catch {
                failed++;
            }
        }

        // Clear recovery markers
        localStorage.removeItem('writenow.crashRecovery.pending');

        if (recovered > 0 && failed === 0) {
            this.messageService.info(`成功恢复 ${recovered} 个文件。`);
        } else if (recovered > 0 && failed > 0) {
            this.messageService.warn(`恢复了 ${recovered} 个文件，${failed} 个文件恢复失败。`);
        } else if (failed > 0) {
            this.messageService.error(`恢复失败，共 ${failed} 个文件。`);
        }
    }
}

/**
 * Mark content for crash recovery.
 *
 * Why: Called before app closes or when detecting potential crash scenarios.
 * Stores snapshot data in localStorage for recovery on next start.
 */
export function markForCrashRecovery(articleId: string, content: string): void {
    try {
        const recoveryKey = 'writenow.crashRecovery.pending';
        let snapshots: RecoverableSnapshot[];
        
        try {
            const existing = localStorage.getItem(recoveryKey);
            snapshots = existing ? JSON.parse(existing) : [];
            if (!Array.isArray(snapshots)) snapshots = [];
        } catch {
            snapshots = [];
        }

        // Update or add snapshot for this article
        const existingIndex = snapshots.findIndex((s) => s.articleId === articleId);
        const snapshot: RecoverableSnapshot = {
            articleId,
            snapshotId: `recovery-${Date.now()}`,
            content,
            createdAt: new Date().toISOString(),
        };

        if (existingIndex >= 0) {
            snapshots[existingIndex] = snapshot;
        } else {
            snapshots.push(snapshot);
        }

        // Keep only last 10 recovery snapshots
        if (snapshots.length > 10) {
            snapshots = snapshots.slice(-10);
        }

        localStorage.setItem(recoveryKey, JSON.stringify(snapshots));
    } catch {
        // Silently fail - crash recovery marking should not throw
    }
}

/**
 * Clear crash recovery markers for an article.
 *
 * Why: Called after successful save to clear the recovery marker.
 */
export function clearCrashRecoveryMarker(articleId: string): void {
    try {
        const recoveryKey = 'writenow.crashRecovery.pending';
        const existing = localStorage.getItem(recoveryKey);
        if (!existing) return;

        let snapshots: RecoverableSnapshot[];
        try {
            snapshots = JSON.parse(existing);
            if (!Array.isArray(snapshots)) return;
        } catch {
            return;
        }

        const filtered = snapshots.filter((s) => s.articleId !== articleId);
        
        if (filtered.length === 0) {
            localStorage.removeItem(recoveryKey);
        } else {
            localStorage.setItem(recoveryKey, JSON.stringify(filtered));
        }
    } catch {
        // Silently fail
    }
}
