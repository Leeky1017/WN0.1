import { inject, injectable } from '@theia/core/shared/inversify';
import { ILogger } from '@theia/core/lib/common/logger';

import type {
    IpcErrorCode,
    VersionCreateRequest,
    VersionCreateResponse,
    VersionDiffRequest,
    VersionDiffResponse,
    VersionListRequest,
    VersionListResponse,
    VersionRestoreRequest,
    VersionRestoreResponse,
} from '../../common/ipc-generated';
import type { VersionServiceContract as VersionServiceContractShape } from '../../common/writenow-protocol';
import { TheiaInvokeRegistry } from '../theia-invoke-adapter';
import { type SqliteDatabase } from '../database/init';
import { upsertArticle } from '../database/articles';
import { WritenowSqliteDb } from '../database/writenow-sqlite-db';

type SnapshotActor = 'user' | 'ai' | 'auto';

function createIpcError(code: IpcErrorCode, message: string, details?: unknown): Error {
    const error = new Error(message);
    (error as { ipcError?: unknown }).ipcError = {
        code,
        message,
        ...(typeof details === 'undefined' ? {} : { details }),
    };
    return error;
}

function coerceString(value: unknown): string {
    return typeof value === 'string' ? value.trim() : '';
}

function nowIso(): string {
    return new Date().toISOString();
}

function generateSnapshotId(): string {
    const rand = Math.random().toString(16).slice(2, 10);
    return `snap_${Date.now()}_${rand}`;
}

function parseLimit(input: unknown): number | null {
    if (typeof input === 'undefined') return 20;
    const parsed = Number.parseInt(String(input), 10);
    if (Number.isNaN(parsed) || parsed <= 0) return null;
    return Math.min(parsed, 50);
}

function parseOffsetCursor(cursor: unknown): number | null {
    if (typeof cursor === 'undefined' || cursor === null || cursor === '') return 0;
    const parsed = Number.parseInt(String(cursor), 10);
    if (Number.isNaN(parsed) || parsed < 0) return null;
    return parsed;
}

function assertActor(value: unknown): SnapshotActor | null {
    if (typeof value === 'undefined') return 'user';
    if (value === 'user' || value === 'ai' || value === 'auto') return value;
    return null;
}

function readArticleRow(db: SqliteDatabase, articleId: string): { id: string; content: string } | null {
    const id = coerceString(articleId);
    if (!id) return null;
    const row = db.prepare('SELECT id, content FROM articles WHERE id = ?').get(id) as { id?: unknown; content?: unknown } | undefined;
    if (!row || typeof row.id !== 'string') return null;
    return { id: row.id, content: typeof row.content === 'string' ? row.content : '' };
}

function readSnapshotRow(
    db: SqliteDatabase,
    snapshotId: string,
): { id: string; article_id: string; content: string; created_at: string; name?: string | null; reason?: string | null; actor?: string | null } | null {
    const id = coerceString(snapshotId);
    if (!id) return null;
    const row = db
        .prepare('SELECT id, article_id, content, name, reason, actor, created_at FROM article_snapshots WHERE id = ?')
        .get(id) as
        | {
              id?: unknown;
              article_id?: unknown;
              content?: unknown;
              name?: unknown;
              reason?: unknown;
              actor?: unknown;
              created_at?: unknown;
          }
        | undefined;
    if (!row || typeof row.id !== 'string') return null;
    return {
        id: row.id,
        article_id: typeof row.article_id === 'string' ? row.article_id : '',
        content: typeof row.content === 'string' ? row.content : '',
        name: typeof row.name === 'string' ? row.name : null,
        reason: typeof row.reason === 'string' ? row.reason : null,
        actor: typeof row.actor === 'string' ? row.actor : null,
        created_at: typeof row.created_at === 'string' ? row.created_at : '',
    };
}

function splitLines(text: string): string[] {
    if (!text) return [];
    const lines = text.split('\n');
    if (text.endsWith('\n') && lines.length > 0 && lines[lines.length - 1] === '') {
        lines.pop();
    }
    return lines;
}

type DiffEdit = { op: 'equal' | 'insert' | 'delete'; value: string };

function myersDiff(a: string[], b: string[]): DiffEdit[] {
    const n = a.length;
    const m = b.length;
    const max = n + m;
    const offset = max;

    let v = new Array(2 * max + 1).fill(-1);
    v[offset + 1] = 0;

    const trace: number[][] = [];

    for (let d = 0; d <= max; d += 1) {
        trace.push([...v]);

        for (let k = -d; k <= d; k += 2) {
            const kIndex = offset + k;

            const down = k === -d || (k !== d && v[kIndex - 1] < v[kIndex + 1]);
            let x = down ? v[kIndex + 1] : v[kIndex - 1] + 1;

            let y = x - k;
            while (x < n && y < m && a[x] === b[y]) {
                x += 1;
                y += 1;
            }

            v[kIndex] = x;

            if (x >= n && y >= m) {
                return backtrack(trace, a, b, offset);
            }
        }
    }

    return [];
}

function backtrack(trace: number[][], a: string[], b: string[], offset: number): DiffEdit[] {
    let x = a.length;
    let y = b.length;
    const edits: DiffEdit[] = [];

    for (let d = trace.length - 1; d > 0; d -= 1) {
        const v = trace[d];
        const k = x - y;

        const kIndex = offset + k;
        const down = k === -d || (k !== d && v[kIndex - 1] < v[kIndex + 1]);
        const prevK = down ? k + 1 : k - 1;

        const prevX = v[offset + prevK];
        const prevY = prevX - prevK;

        while (x > prevX && y > prevY) {
            edits.push({ op: 'equal', value: a[x - 1] });
            x -= 1;
            y -= 1;
        }

        if (x === prevX) {
            edits.push({ op: 'insert', value: b[y - 1] });
            y -= 1;
        } else {
            edits.push({ op: 'delete', value: a[x - 1] });
            x -= 1;
        }
    }

    while (x > 0 && y > 0) {
        edits.push({ op: 'equal', value: a[x - 1] });
        x -= 1;
        y -= 1;
    }

    while (x > 0) {
        edits.push({ op: 'delete', value: a[x - 1] });
        x -= 1;
    }

    while (y > 0) {
        edits.push({ op: 'insert', value: b[y - 1] });
        y -= 1;
    }

    edits.reverse();
    return edits;
}

function formatHunkRange(start: number, count: number): string {
    if (count === 0) return `${start},0`;
    if (count === 1) return String(start);
    return `${start},${count}`;
}

function unifiedDiff(fromText: string, toText: string): string {
    const a = splitLines(fromText);
    const b = splitLines(toText);

    const edits = myersDiff(a, b);

    const fromStart = a.length === 0 ? 0 : 1;
    const toStart = b.length === 0 ? 0 : 1;

    const header = [
        '--- a',
        '+++ b',
        `@@ -${formatHunkRange(fromStart, a.length)} +${formatHunkRange(toStart, b.length)} @@`,
    ];

    const body = edits.map((edit) => {
        const prefix = edit.op === 'insert' ? '+' : edit.op === 'delete' ? '-' : ' ';
        return `${prefix}${edit.value}`;
    });

    return `${[...header, ...body].join('\n')}\n`;
}

@injectable()
export class VersionService implements VersionServiceContractShape {
    constructor(
        @inject(ILogger) private readonly logger: ILogger,
        @inject(WritenowSqliteDb) private readonly sqliteDb: WritenowSqliteDb,
    ) {}

    async list(request: VersionListRequest): Promise<VersionListResponse> {
        const db = this.sqliteDb.db;

        const articleId = coerceString(request?.articleId);
        if (!articleId) throw createIpcError('INVALID_ARGUMENT', 'Invalid articleId', { articleId: request?.articleId });

        const limit = parseLimit(request?.limit);
        if (limit === null) throw createIpcError('INVALID_ARGUMENT', 'Invalid limit', { limit: request?.limit });

        const offset = parseOffsetCursor(request?.cursor);
        if (offset === null) throw createIpcError('INVALID_ARGUMENT', 'Invalid cursor', { cursor: request?.cursor });

        const article = readArticleRow(db, articleId);
        if (!article) throw createIpcError('NOT_FOUND', 'Article not found', { articleId });

        try {
            const totalRow = db.prepare('SELECT COUNT(*) AS total FROM article_snapshots WHERE article_id = ?').get(articleId) as {
                total?: unknown;
            };
            const total = typeof totalRow?.total === 'number' ? totalRow.total : Number(totalRow?.total ?? 0);

            const rows = db
                .prepare(
                    `SELECT id, article_id, name, reason, actor, created_at
                     FROM article_snapshots
                     WHERE article_id = ?
                     ORDER BY datetime(created_at) DESC, id DESC
                     LIMIT ? OFFSET ?`,
                )
                .all(articleId, limit, offset) as Array<{
                id?: unknown;
                name?: unknown;
                reason?: unknown;
                actor?: unknown;
                created_at?: unknown;
            }>;

            const items = rows
                .map((row) => {
                    const id = coerceString(row?.id);
                    const createdAt = coerceString(row?.created_at);
                    if (!id || !createdAt) return null;
                    return {
                        id,
                        articleId,
                        name: typeof row?.name === 'string' && row.name.trim() ? row.name.trim() : undefined,
                        reason: typeof row?.reason === 'string' && row.reason.trim() ? row.reason.trim() : undefined,
                        actor: row?.actor === 'ai' || row?.actor === 'auto' ? (row.actor as SnapshotActor) : 'user',
                        createdAt,
                    };
                })
                .filter((item): item is NonNullable<typeof item> => Boolean(item));

            const nextOffset = offset + items.length;
            const nextCursor = nextOffset < total ? String(nextOffset) : undefined;

            return {
                items,
                page: {
                    limit,
                    cursor: String(offset),
                    nextCursor,
                    total,
                },
            };
        } catch (error) {
            this.logger.error(`[version] list failed: ${error instanceof Error ? error.message : String(error)}`);
            throw createIpcError('DB_ERROR', 'Failed to list versions', { message: error instanceof Error ? error.message : String(error) });
        }
    }

    async create(request: VersionCreateRequest): Promise<VersionCreateResponse> {
        const db = this.sqliteDb.db;

        const articleId = coerceString(request?.articleId);
        if (!articleId) throw createIpcError('INVALID_ARGUMENT', 'Invalid articleId', { articleId: request?.articleId });

        const actor = assertActor(request?.actor);
        if (!actor) throw createIpcError('INVALID_ARGUMENT', 'Invalid actor', { actor: request?.actor });

        const explicitContent = typeof request?.content === 'string' ? request.content : null;
        const article = readArticleRow(db, articleId);
        if (!article && explicitContent === null) {
            throw createIpcError('NOT_FOUND', 'Article not found', { articleId });
        }

        // Why: Snapshots are stored under `article_snapshots` with a foreign key to `articles`.
        // Users may create/edit `.md` files via Theia's file explorer before the DB indexer sees them; when explicit
        // content is provided we can safely upsert the article row to satisfy the FK without requiring a prior
        // `file:create/write` call.
        if (!article && explicitContent !== null) {
            try {
                upsertArticle(db, { id: articleId, fileName: articleId, content: explicitContent });
            } catch (error) {
                this.logger.error(`[version] upsert article failed: ${error instanceof Error ? error.message : String(error)}`);
                throw createIpcError('DB_ERROR', 'Failed to initialize article for version snapshot', {
                    articleId,
                    message: error instanceof Error ? error.message : String(error),
                });
            }
        }

        const content = explicitContent !== null ? explicitContent : article?.content ?? '';
        const snapshotId = generateSnapshotId();
        const createdAt = nowIso();

        const name = typeof request?.name === 'string' && request.name.trim() ? request.name.trim() : null;
        const reason = typeof request?.reason === 'string' && request.reason.trim() ? request.reason.trim() : null;

        try {
            db.prepare(
                `INSERT INTO article_snapshots (id, article_id, content, name, reason, actor, created_at)
                 VALUES (?, ?, ?, ?, ?, ?, ?)`,
            ).run(snapshotId, articleId, content, name, reason, actor, createdAt);
            return { snapshotId };
        } catch (error) {
            this.logger.error(`[version] create failed: ${error instanceof Error ? error.message : String(error)}`);
            throw createIpcError('DB_ERROR', 'Failed to create version snapshot', { message: error instanceof Error ? error.message : String(error) });
        }
    }

    async restore(request: VersionRestoreRequest): Promise<VersionRestoreResponse> {
        const db = this.sqliteDb.db;

        const snapshotId = coerceString(request?.snapshotId);
        if (!snapshotId) throw createIpcError('INVALID_ARGUMENT', 'Invalid snapshotId', { snapshotId: request?.snapshotId });

        const row = readSnapshotRow(db, snapshotId);
        if (!row) throw createIpcError('NOT_FOUND', 'Snapshot not found', { snapshotId });

        const articleId = coerceString(row.article_id);
        if (!articleId) throw createIpcError('DB_ERROR', 'Snapshot row is invalid', { snapshotId });

        return { articleId, content: row.content };
    }

    async diff(request: VersionDiffRequest): Promise<VersionDiffResponse> {
        const db = this.sqliteDb.db;

        const fromSnapshotId = coerceString(request?.fromSnapshotId);
        const toSnapshotId = coerceString(request?.toSnapshotId);
        if (!fromSnapshotId) {
            throw createIpcError('INVALID_ARGUMENT', 'Invalid fromSnapshotId', { fromSnapshotId: request?.fromSnapshotId });
        }
        if (!toSnapshotId) {
            throw createIpcError('INVALID_ARGUMENT', 'Invalid toSnapshotId', { toSnapshotId: request?.toSnapshotId });
        }

        const from = readSnapshotRow(db, fromSnapshotId);
        const to = readSnapshotRow(db, toSnapshotId);
        if (!from) throw createIpcError('NOT_FOUND', 'Snapshot not found', { snapshotId: fromSnapshotId });
        if (!to) throw createIpcError('NOT_FOUND', 'Snapshot not found', { snapshotId: toSnapshotId });

        try {
            const diff = unifiedDiff(from.content, to.content);
            return { format: 'unified', diff };
        } catch (error) {
            this.logger.error(`[version] diff failed: ${error instanceof Error ? error.message : String(error)}`);
            throw createIpcError('DB_ERROR', 'Failed to compute diff', { message: error instanceof Error ? error.message : String(error) });
        }
    }

    register(registry: TheiaInvokeRegistry): void {
        registry.handleInvoke('version:list', async (_evt, payload) => {
            return this.list(payload as VersionListRequest);
        });

        registry.handleInvoke('version:create', async (_evt, payload) => {
            return this.create(payload as VersionCreateRequest);
        });

        registry.handleInvoke('version:restore', async (_evt, payload) => {
            return this.restore(payload as VersionRestoreRequest);
        });

        registry.handleInvoke('version:diff', async (_evt, payload) => {
            return this.diff(payload as VersionDiffRequest);
        });
    }
}
