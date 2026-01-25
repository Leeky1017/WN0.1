import * as crypto from 'node:crypto';

import { inject, injectable } from '@theia/core/shared/inversify';

import type {
    DocumentSnapshot,
    FileSnapshotLatestRequest,
    FileSnapshotLatestResponse,
    FileSnapshotWriteRequest,
    FileSnapshotWriteResponse,
} from '../../common/ipc-generated';
import { WritenowSqliteDb } from '../database/writenow-sqlite-db';

/**
 * Why: SnapshotService implements file snapshot IPC contract for auto-save and crash recovery.
 * Stores periodic snapshots of document content for recovery purposes.
 */
@injectable()
export class SnapshotService {
    constructor(@inject(WritenowSqliteDb) private readonly db: WritenowSqliteDb) {}

    /**
     * Why: Write a new snapshot of document content for recovery.
     */
    writeSnapshot(request: FileSnapshotWriteRequest): FileSnapshotWriteResponse {
        const { path, content, reason = 'auto' } = request;
        const db = this.db.db;

        const snapshotId = this.generateSnapshotId();
        const now = new Date().toISOString();

        db.prepare(`
            INSERT INTO article_snapshots (id, article_id, content, reason, actor, created_at)
            VALUES (?, ?, ?, ?, 'auto', ?)
        `).run(snapshotId, path, content, reason, now);

        // Cleanup old snapshots - keep only last 20 per article
        db.prepare(`
            DELETE FROM article_snapshots
            WHERE article_id = ? AND id NOT IN (
                SELECT id FROM article_snapshots
                WHERE article_id = ?
                ORDER BY created_at DESC
                LIMIT 20
            )
        `).run(path, path);

        return { snapshotId };
    }

    /**
     * Why: Get the latest snapshot for crash recovery.
     */
    getLatestSnapshot(request: FileSnapshotLatestRequest): FileSnapshotLatestResponse {
        const { path } = request;
        const db = this.db.db;

        if (path) {
            // Get latest snapshot for specific path
            const row = db.prepare(`
                SELECT id, article_id, content, reason, created_at
                FROM article_snapshots
                WHERE article_id = ?
                ORDER BY created_at DESC
                LIMIT 1
            `).get(path) as {
                id: string;
                article_id: string;
                content: string;
                reason: string;
                created_at: string;
            } | undefined;

            if (!row) {
                return { snapshot: null };
            }

            const snapshot: DocumentSnapshot = {
                id: row.id,
                path: row.article_id,
                content: row.content,
                reason: row.reason as 'auto' | 'manual',
                createdAt: new Date(row.created_at).getTime(),
            };

            return { snapshot };
        }

        // Get latest snapshot across all documents
        const row = db.prepare(`
            SELECT id, article_id, content, reason, created_at
            FROM article_snapshots
            ORDER BY created_at DESC
            LIMIT 1
        `).get() as {
            id: string;
            article_id: string;
            content: string;
            reason: string;
            created_at: string;
        } | undefined;

        if (!row) {
            return { snapshot: null };
        }

        const snapshot: DocumentSnapshot = {
            id: row.id,
            path: row.article_id,
            content: row.content,
            reason: row.reason as 'auto' | 'manual',
            createdAt: new Date(row.created_at).getTime(),
        };

        return { snapshot };
    }

    /**
     * Why: Generate unique snapshot ID.
     */
    private generateSnapshotId(): string {
        return `snapshot_${Date.now()}_${crypto.randomBytes(4).toString('hex')}`;
    }
}
