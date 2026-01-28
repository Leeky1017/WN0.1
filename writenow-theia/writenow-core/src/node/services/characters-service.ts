import { randomUUID } from 'node:crypto';
import * as fsp from 'node:fs/promises';
import * as path from 'node:path';

import { inject, injectable } from '@theia/core/shared/inversify';
import { ILogger } from '@theia/core/lib/common/logger';

import type {
    Character,
    CharacterCreateRequest,
    CharacterCreateResponse,
    CharacterDeleteRequest,
    CharacterDeleteResponse,
    CharacterListRequest,
    CharacterListResponse,
    CharacterUpdateRequest,
    CharacterUpdateResponse,
    IpcErrorCode,
} from '../../common/ipc-generated';
import { TheiaInvokeRegistry } from '../theia-invoke-adapter';
import { type SqliteDatabase } from '../database/init';
import { WritenowSqliteDb } from '../database/writenow-sqlite-db';
import { WRITENOW_DATA_DIR } from '../writenow-data-dir';

function createIpcError(code: IpcErrorCode, message: string, details?: unknown): Error {
    const error = new Error(message);
    (error as { ipcError?: unknown }).ipcError = {
        code,
        message,
        ...(typeof details === 'undefined' ? {} : { details }),
    };
    return error;
}

function toIsoNow(): string {
    return new Date().toISOString();
}

function coerceString(value: unknown): string {
    return typeof value === 'string' ? value.trim() : '';
}

function stableJsonStringify(value: unknown): string {
    const seen = new Set<unknown>();
    const normalize = (v: unknown): unknown => {
        if (v === null || typeof v !== 'object') return v;
        if (seen.has(v)) return null;
        seen.add(v);
        if (Array.isArray(v)) return v.map(normalize);
        const obj = v as Record<string, unknown>;
        const keys = Object.keys(obj).sort((a, b) => a.localeCompare(b));
        const out: Record<string, unknown> = {};
        for (const k of keys) out[k] = normalize(obj[k]);
        return out;
    };
    return JSON.stringify(normalize(value), null, 2);
}

function sanitizeWindowsUnsafeFileStem(value: string): string {
    const raw = coerceString(value);
    if (!raw) return '';
    const replaced = raw.replace(/[<>:"/\\|?*\x00-\x1F]/g, '_');
    const collapsed = replaced.replace(/\s+/g, ' ').trim();
    return collapsed.replace(/[. ]+$/g, '');
}

function toCharacterFileName(name: string): string {
    const stem = sanitizeWindowsUnsafeFileStem(name);
    if (!stem) throw createIpcError('INVALID_ARGUMENT', 'name is required');
    const limited = stem.length > 120 ? stem.slice(0, 120) : stem;
    if (limited === '.' || limited === '..') throw createIpcError('INVALID_ARGUMENT', 'Invalid character name', { name });
    return `${limited}.md`;
}

function parseCharacterCard(text: string): Record<string, unknown> | null {
    const raw = typeof text === 'string' ? text : '';
    const match = raw.match(
        /<!--\s*writenow:character-card:v1\s*-->\s*```json\s*([\s\S]*?)\s*```\s*<!--\s*\/writenow:character-card:v1\s*-->/,
    );
    if (!match) return null;
    try {
        const value = JSON.parse(match[1]) as unknown;
        if (!value || typeof value !== 'object' || Array.isArray(value)) return null;
        return value as Record<string, unknown>;
    } catch {
        return null;
    }
}

function buildCharacterCardText(character: Character): string {
    const meta = {
        version: 1,
        id: character.id,
        projectId: character.projectId,
        name: character.name,
        description: character.description ?? null,
        traits: typeof character.traits === 'undefined' ? null : character.traits,
        relationships: typeof character.relationships === 'undefined' ? null : character.relationships,
        createdAt: character.createdAt,
        updatedAt: character.updatedAt,
    };

    const metaJson = stableJsonStringify(meta);
    const title = character.name;
    const description = typeof character.description === 'string' && character.description.trim() ? character.description.trim() : '';

    return [
        '<!-- writenow:character-card:v1 -->',
        '```json',
        metaJson,
        '```',
        '<!-- /writenow:character-card:v1 -->',
        '',
        `# ${title}`,
        description ? '' : '(no description)',
        description ? description : '',
        '',
    ].join('\n');
}

async function writeUtf8Atomic(filePath: string, content: string): Promise<void> {
    const dir = path.dirname(filePath);
    const base = path.basename(filePath);
    const tmpPath = path.join(dir, `.${base}.tmp-${process.pid}-${Date.now()}`);

    try {
        await fsp.writeFile(tmpPath, content, 'utf8');
        await fsp.rename(tmpPath, filePath);
    } catch (error) {
        try {
            await fsp.unlink(tmpPath);
        } catch {
            // ignore
        }
        const code = error && typeof error === 'object' ? (error as { code?: unknown }).code : null;
        if (code === 'EACCES' || code === 'EPERM') throw createIpcError('PERMISSION_DENIED', 'Permission denied');
        throw createIpcError('IO_ERROR', 'Atomic write failed', { path: base, cause: String(code || '') });
    }
}

async function readUtf8(filePath: string): Promise<{ ok: true; content: string } | { ok: false; error: { code: IpcErrorCode; message: string } }> {
    try {
        const content = await fsp.readFile(filePath, 'utf8');
        return { ok: true, content };
    } catch (error) {
        const code = error && typeof error === 'object' ? (error as { code?: unknown }).code : null;
        if (code === 'ENOENT') return { ok: false, error: { code: 'NOT_FOUND', message: 'Not found' } };
        if (code === 'EACCES' || code === 'EPERM') return { ok: false, error: { code: 'PERMISSION_DENIED', message: 'Permission denied' } };
        return { ok: false, error: { code: 'IO_ERROR', message: 'I/O error' } };
    }
}

@injectable()
export class CharactersService {
    constructor(
        @inject(ILogger) private readonly logger: ILogger,
        @inject(WRITENOW_DATA_DIR) private readonly dataDir: string,
        @inject(WritenowSqliteDb) private readonly sqliteDb: WritenowSqliteDb,
    ) {}

    register(registry: TheiaInvokeRegistry): void {
        registry.handleInvoke('character:list', async (_evt, payload) => this.list(payload as CharacterListRequest));
        registry.handleInvoke('character:create', async (_evt, payload) => this.create(payload as CharacterCreateRequest));
        registry.handleInvoke('character:update', async (_evt, payload) => this.update(payload as CharacterUpdateRequest));
        registry.handleInvoke('character:delete', async (_evt, payload) => this.delete(payload as CharacterDeleteRequest));
    }

    private get db(): SqliteDatabase {
        return this.sqliteDb.db;
    }

    private getProjectsDir(): string {
        return path.join(this.dataDir, 'projects');
    }

    private getProjectDir(projectId: string): string {
        const id = coerceString(projectId);
        if (!id) throw createIpcError('INVALID_ARGUMENT', 'projectId is required');
        return path.join(this.getProjectsDir(), id);
    }

    private getWritenowRoot(projectId: string): string {
        return path.join(this.getProjectDir(projectId), '.writenow');
    }

    private getWritenowCharactersDir(projectId: string): string {
        return path.join(this.getWritenowRoot(projectId), 'characters');
    }

    private async ensureCharactersDir(projectId: string): Promise<string> {
        const dir = this.getWritenowCharactersDir(projectId);
        await fsp.mkdir(dir, { recursive: true });
        return dir;
    }

    private ensureProjectExists(projectId: string): void {
        const row = this.db.prepare('SELECT 1 FROM projects WHERE id = ?').get(projectId) as { '1'?: unknown } | undefined;
        if (!row) throw createIpcError('NOT_FOUND', 'Project not found', { projectId });
    }

    private async listCards(projectId: string): Promise<Array<Character & { _filePath: string }>> {
        await this.ensureCharactersDir(projectId);
        const dir = this.getWritenowCharactersDir(projectId);
        const entries = await fsp.readdir(dir, { withFileTypes: true });
        const files = entries.filter((e) => e.isFile() && e.name.toLowerCase().endsWith('.md')).map((e) => e.name).sort((a, b) => a.localeCompare(b));

        const characters: Array<Character & { _filePath: string }> = [];
        for (const fileName of files) {
            const filePath = path.join(dir, fileName);
            const read = await readUtf8(filePath);
            if (!read.ok) continue;
            const meta = parseCharacterCard(read.content);
            if (!meta) continue;

            const id = coerceString(meta.id);
            const pid = coerceString(meta.projectId);
            const name = coerceString(meta.name);
            const createdAt = coerceString(meta.createdAt);
            const updatedAt = coerceString(meta.updatedAt);
            if (!id || !pid || !name || !createdAt || !updatedAt) continue;
            if (pid !== projectId) continue;

            characters.push({
                id,
                projectId: pid,
                name,
                description: coerceString(meta.description) || undefined,
                traits: meta.traits === null ? undefined : (meta.traits as Character['traits']),
                relationships: meta.relationships === null ? undefined : (meta.relationships as Character['relationships']),
                createdAt,
                updatedAt,
                _filePath: filePath,
            });
        }

        characters.sort((a, b) => b.updatedAt.localeCompare(a.updatedAt) || b.createdAt.localeCompare(a.createdAt) || b.id.localeCompare(a.id));
        return characters;
    }

    async list(request: CharacterListRequest): Promise<CharacterListResponse> {
        const projectId = coerceString(request?.projectId);
        if (!projectId) throw createIpcError('INVALID_ARGUMENT', 'projectId is required');
        this.ensureProjectExists(projectId);

        const cards = await this.listCards(projectId);
        return { characters: cards.map(({ _filePath: _ignore, ...rest }) => rest) };
    }

    async create(request: CharacterCreateRequest): Promise<CharacterCreateResponse> {
        const projectId = coerceString(request?.projectId);
        const name = coerceString(request?.name);
        const description = coerceString(request?.description) || null;
        if (!projectId) throw createIpcError('INVALID_ARGUMENT', 'projectId is required');
        if (!name) throw createIpcError('INVALID_ARGUMENT', 'name is required');
        if (name.length > 120) throw createIpcError('INVALID_ARGUMENT', 'name is too long', { max: 120 });
        this.ensureProjectExists(projectId);

        // Validate JSON fields early (size + serializability).
        const validateJsonField = (field: 'traits' | 'relationships'): unknown => {
            if (!(field in (request as unknown as Record<string, unknown>))) return undefined;
            const raw = (request as unknown as Record<string, unknown>)[field];
            if (raw === null) return null;
            let json = '';
            try {
                json = JSON.stringify(raw);
            } catch {
                throw createIpcError('INVALID_ARGUMENT', 'Invalid JSON field', { field });
            }
            const bytes = Buffer.byteLength(json, 'utf8');
            const maxBytes = 64 * 1024;
            if (bytes > maxBytes) throw createIpcError('INVALID_ARGUMENT', 'JSON field too large', { field, bytes, maxBytes });
            return raw;
        };

        const traits = validateJsonField('traits');
        const relationships = validateJsonField('relationships');

        const id = randomUUID();
        const now = toIsoNow();
        const character: Character = {
            id,
            projectId,
            name,
            description: description || undefined,
            traits: traits === null ? undefined : (traits as Character['traits']),
            relationships: relationships === null ? undefined : (relationships as Character['relationships']),
            createdAt: now,
            updatedAt: now,
        };

        await this.ensureCharactersDir(projectId);
        const fileName = toCharacterFileName(name);
        const filePath = path.join(this.getWritenowCharactersDir(projectId), fileName);

        try {
            await fsp.access(filePath);
            throw createIpcError('INVALID_ARGUMENT', 'Character file already exists', { fileName });
        } catch (error) {
            if (error && typeof error === 'object' && (error as { ipcError?: unknown }).ipcError) throw error as Error;
            const code = error && typeof error === 'object' ? (error as { code?: unknown }).code : null;
            if (code && code !== 'ENOENT') {
                if (code === 'EACCES' || code === 'EPERM') throw createIpcError('PERMISSION_DENIED', 'Permission denied');
                throw createIpcError('IO_ERROR', 'Failed to access character file', { cause: String(code || '') });
            }
        }

        await writeUtf8Atomic(filePath, buildCharacterCardText(character));
        return { character };
    }

    async update(request: CharacterUpdateRequest): Promise<CharacterUpdateResponse> {
        const projectId = coerceString(request?.projectId);
        const id = coerceString(request?.id);
        if (!projectId) throw createIpcError('INVALID_ARGUMENT', 'projectId is required');
        if (!id) throw createIpcError('INVALID_ARGUMENT', 'id is required');
        this.ensureProjectExists(projectId);

        const name = typeof request?.name === 'string' ? request.name.trim() : undefined;
        const description = typeof request?.description === 'string' ? request.description.trim() : undefined;
        if (typeof name === 'string' && !name) throw createIpcError('INVALID_ARGUMENT', 'name cannot be empty');
        if (typeof name === 'string' && name.length > 120) throw createIpcError('INVALID_ARGUMENT', 'name is too long', { max: 120 });

        const hasTraits = 'traits' in (request as unknown as Record<string, unknown>);
        const hasRelationships = 'relationships' in (request as unknown as Record<string, unknown>);
        if (typeof name !== 'string' && typeof description !== 'string' && !hasTraits && !hasRelationships) {
            throw createIpcError('INVALID_ARGUMENT', 'No fields to update');
        }

        const cards = await this.listCards(projectId);
        const existing = cards.find((c) => c.id === id);
        if (!existing) throw createIpcError('NOT_FOUND', 'Character not found', { id, projectId });

        const next: Character = {
            id: existing.id,
            projectId: existing.projectId,
            name: typeof name === 'string' ? name : existing.name,
            description: typeof description === 'string' ? (description.trim() ? description.trim() : undefined) : existing.description,
            traits: hasTraits ? ((request as unknown as Record<string, unknown>).traits as Character['traits']) : existing.traits,
            relationships: hasRelationships ? ((request as unknown as Record<string, unknown>).relationships as Character['relationships']) : existing.relationships,
            createdAt: existing.createdAt,
            updatedAt: toIsoNow(),
        };

        const oldPath = existing._filePath;
        const dir = path.dirname(oldPath);
        const newFileName = toCharacterFileName(next.name);
        const newPath = path.join(dir, newFileName);

        const raw = await readUtf8(oldPath);
        if (!raw.ok) throw createIpcError(raw.error.code, raw.error.message);

        const base = buildCharacterCardText(next);
        const markerRe =
            /<!--\s*writenow:character-card:v1\s*-->\s*```json\s*[\s\S]*?\s*```\s*<!--\s*\/writenow:character-card:v1\s*-->\s*/m;
        const stripped = raw.content.replace(markerRe, '').trimStart();
        const nextContent = stripped ? `${base}\n${stripped}` : base;

        if (newPath !== oldPath) {
            try {
                await fsp.access(newPath);
                throw createIpcError('INVALID_ARGUMENT', 'Character file already exists', { fileName: newFileName });
            } catch (error) {
                if (error && typeof error === 'object' && (error as { ipcError?: unknown }).ipcError) throw error as Error;
                const code = error && typeof error === 'object' ? (error as { code?: unknown }).code : null;
                if (code && code !== 'ENOENT') {
                    if (code === 'EACCES' || code === 'EPERM') throw createIpcError('PERMISSION_DENIED', 'Permission denied');
                    throw createIpcError('IO_ERROR', 'Failed to access character file', { cause: String(code || '') });
                }
            }
        }

        await writeUtf8Atomic(newPath, nextContent);
        if (newPath !== oldPath) {
            try {
                await fsp.unlink(oldPath);
            } catch (error) {
                this.logger.warn(`[characters] old file cleanup failed: ${error instanceof Error ? error.message : String(error)}`);
            }
        }

        return { character: next };
    }

    async delete(request: CharacterDeleteRequest): Promise<CharacterDeleteResponse> {
        const projectId = coerceString(request?.projectId);
        const id = coerceString(request?.id);
        if (!projectId) throw createIpcError('INVALID_ARGUMENT', 'projectId is required');
        if (!id) throw createIpcError('INVALID_ARGUMENT', 'id is required');
        this.ensureProjectExists(projectId);

        const cards = await this.listCards(projectId);
        const existing = cards.find((c) => c.id === id);
        if (!existing) throw createIpcError('NOT_FOUND', 'Character not found', { id, projectId });

        try {
            await fsp.unlink(existing._filePath);
        } catch (error) {
            const code = error && typeof error === 'object' ? (error as { code?: unknown }).code : null;
            if (code === 'ENOENT') throw createIpcError('NOT_FOUND', 'Character file not found', { id, projectId });
            if (code === 'EACCES' || code === 'EPERM') throw createIpcError('PERMISSION_DENIED', 'Permission denied');
            throw createIpcError('IO_ERROR', 'Failed to delete character file', { cause: String(code || '') });
        }

        return { deleted: true };
    }
}

