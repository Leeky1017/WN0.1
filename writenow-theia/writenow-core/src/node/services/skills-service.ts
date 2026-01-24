import * as crypto from 'node:crypto';
import * as fsp from 'node:fs/promises';
import * as path from 'node:path';

import { inject, injectable } from '@theia/core/shared/inversify';
import { ILogger } from '@theia/core/lib/common/logger';

import * as yaml from 'yaml';

import type {
    IpcError,
    IpcErrorCode,
    IpcResponse,
    SkillFileDefinition,
    SkillListItem,
    SkillListRequest,
    SkillListResponse,
    SkillReadRequest,
    SkillReadResponse,
    SkillScope,
} from '../../common/ipc-generated';
import type { SkillsService as SkillsServiceShape } from '../../common/writenow-protocol';
import { WritenowSqliteDb } from '../database/writenow-sqlite-db';

type IndexedSkillRow = {
    id: string;
    name: string;
    description: string | null;
    tag: string | null;
    system_prompt: string | null;
    user_prompt_template: string;
    context_rules: string;
    model: string;
    is_builtin: 0 | 1;
    source_uri: string;
    source_hash: string;
    version: string | null;
    scope: SkillScope;
    package_id: string | null;
    is_valid: 0 | 1;
    error_code: string | null;
    error_message: string | null;
};

function ipcOk<TData>(data: TData): IpcResponse<TData> {
    return { ok: true, data };
}

function ipcErr<TData>(error: IpcError): IpcResponse<TData> {
    return { ok: false, error };
}

function coerceString(value: unknown): string {
    return typeof value === 'string' ? value.trim() : '';
}

function isRecord(value: unknown): value is Record<string, unknown> {
    return Boolean(value) && typeof value === 'object' && !Array.isArray(value);
}

function mapScope(value: unknown): SkillScope {
    const raw = coerceString(value);
    if (raw === 'builtin' || raw === 'global' || raw === 'project') return raw;
    return 'global';
}

function isValidSemVer(version: unknown): boolean {
    const v = coerceString(version);
    if (!v) return false;
    return /^(0|[1-9]\d*)\.(0|[1-9]\d*)\.(0|[1-9]\d*)(?:-([0-9A-Za-z-]+(?:\.[0-9A-Za-z-]+)*))?(?:\+([0-9A-Za-z-]+(?:\.[0-9A-Za-z-]+)*))?$/.test(
        v,
    );
}

function sha256Hex(text: string): string {
    return crypto.createHash('sha256').update(text).digest('hex');
}

function stableInvalidId(scope: SkillScope, sourceUri: string): string {
    const hash = sha256Hex(`${scope}:${sourceUri}`).slice(0, 12);
    return `invalid:${scope}:${hash}`;
}

function splitFrontmatter(text: string): { ok: true; yaml: string; markdown: string } | { ok: false; error: IpcError } {
    const normalized = (typeof text === 'string' ? text : '').replace(/\r\n/g, '\n').replace(/^\uFEFF/, '');
    const lines = normalized.split('\n');
    if ((lines[0] ?? '').trim() !== '---') {
        return {
            ok: false,
            error: { code: 'INVALID_ARGUMENT', message: 'Missing YAML frontmatter', details: { reason: 'missing_frontmatter' } },
        };
    }

    let endIndex = -1;
    for (let i = 1; i < lines.length; i += 1) {
        if ((lines[i] ?? '').trim() === '---') {
            endIndex = i;
            break;
        }
    }

    if (endIndex === -1) {
        return {
            ok: false,
            error: { code: 'INVALID_ARGUMENT', message: 'Unterminated YAML frontmatter', details: { reason: 'unterminated_frontmatter' } },
        };
    }

    return {
        ok: true,
        yaml: lines.slice(1, endIndex).join('\n'),
        markdown: lines.slice(endIndex + 1).join('\n'),
    };
}

function parseSkillText(text: string): { ok: true; definition: SkillFileDefinition } | { ok: false; error: IpcError } {
    const split = splitFrontmatter(text);
    if (!split.ok) return split;

    let frontmatter: unknown;
    try {
        frontmatter = yaml.parse(split.yaml);
    } catch (error) {
        return {
            ok: false,
            error: {
                code: 'INVALID_ARGUMENT',
                message: 'Invalid YAML frontmatter',
                details: { message: error instanceof Error ? error.message : String(error) },
            },
        };
    }

    if (!isRecord(frontmatter)) {
        return { ok: false, error: { code: 'INVALID_ARGUMENT', message: 'YAML frontmatter must be a mapping' } };
    }

    return { ok: true, definition: { frontmatter, markdown: split.markdown } };
}

function buildDefaultContextRulesJson(): string {
    return JSON.stringify({ includeArticle: true, includeStyleGuide: true });
}

function parseStringArray(value: unknown): string[] | null {
    if (!Array.isArray(value)) return null;
    return value.map((item) => coerceString(item)).filter(Boolean);
}

function derivePackageId(packagesDir: string, filePath: string): string | null {
    const rel = path.relative(packagesDir, filePath);
    const parts = rel.split(path.sep);
    if (parts.length < 5) return null;
    const [packageId, _packageVersion, skillsDirName] = parts;
    if (!packageId) return null;
    if (skillsDirName !== 'skills') return null;
    return packageId;
}

function normalizeBuiltinPackagesDir(): string {
    // Why: Theia packaging may relocate the working directory; resolve builtin skills relative to the extension path.
    const writenowCoreDir = path.resolve(__dirname, '..', '..', '..');
    const repoRoot = path.resolve(writenowCoreDir, '..', '..');
    return path.join(repoRoot, 'electron', 'skills', 'packages');
}

async function walkForSkillMd(rootDir: string): Promise<string[]> {
    const results: string[] = [];
    const stack: string[] = [rootDir];

    while (stack.length > 0) {
        const dir = stack.pop();
        if (!dir) continue;
        let entries: Array<{ name: string; isDirectory(): boolean; isFile(): boolean }> = [];
        try {
            entries = await fsp.readdir(dir, { withFileTypes: true });
        } catch {
            continue;
        }

        for (const entry of entries) {
            const fullPath = path.join(dir, entry.name);
            if (entry.isDirectory()) {
                stack.push(fullPath);
                continue;
            }
            if (entry.isFile() && entry.name === 'SKILL.md') {
                results.push(fullPath);
            }
        }
    }

    return results;
}

const IPC_ERROR_CODES: ReadonlySet<IpcErrorCode> = new Set([
    'INVALID_ARGUMENT',
    'NOT_FOUND',
    'ALREADY_EXISTS',
    'CONFLICT',
    'PERMISSION_DENIED',
    'UNSUPPORTED',
    'IO_ERROR',
    'DB_ERROR',
    'MODEL_NOT_READY',
    'ENCODING_FAILED',
    'RATE_LIMITED',
    'TIMEOUT',
    'CANCELED',
    'UPSTREAM_ERROR',
    'INTERNAL',
]);

function mapSkillListRow(row: unknown): SkillListItem {
    const record = row as {
        id?: unknown;
        name?: unknown;
        description?: unknown;
        version?: unknown;
        scope?: unknown;
        package_id?: unknown;
        enabled?: unknown;
        is_valid?: unknown;
        error_code?: unknown;
        error_message?: unknown;
    };

    const id = coerceString(record.id);
    const name = coerceString(record.name);
    const description = coerceString(record.description) || undefined;
    const version = coerceString(record.version) || undefined;
    const scope = mapScope(record.scope);
    const packageId = coerceString(record.package_id) || undefined;
    const enabled = record.enabled === 0 ? false : true;
    const valid = record.is_valid === 0 ? false : true;
    const errorCode = coerceString(record.error_code) || undefined;
    const errorMessage = coerceString(record.error_message) || undefined;

    const code: IpcErrorCode | undefined =
        errorCode && IPC_ERROR_CODES.has(errorCode as IpcErrorCode) ? (errorCode as IpcErrorCode) : errorCode ? 'INVALID_ARGUMENT' : undefined;

    return {
        id,
        name,
        ...(description ? { description } : {}),
        ...(version ? { version } : {}),
        scope,
        ...(packageId ? { packageId } : {}),
        enabled,
        valid,
        ...(errorCode || errorMessage
            ? { error: { code: code ?? 'INVALID_ARGUMENT', message: errorMessage || 'Invalid skill' } }
            : {}),
    };
}

function nowIso(): string {
    return new Date().toISOString();
}

function buildIndexedRow(args: {
    scope: SkillScope;
    sourceUri: string;
    sourceHash: string;
    packageId: string | null;
    definition: SkillFileDefinition;
}): IndexedSkillRow {
    const fm = args.definition.frontmatter;
    const id = coerceString(fm.id);
    const name = coerceString(fm.name);
    const description = coerceString(fm.description) || null;
    const version = coerceString(fm.version) || null;
    const tags = parseStringArray(fm.tags) ?? (coerceString((fm as { tag?: unknown }).tag) ? [coerceString((fm as { tag?: unknown }).tag)] : null);
    const tag = tags && tags.length > 0 ? coerceString(tags[0]) || null : null;

    const promptRaw = isRecord(fm.prompt) ? fm.prompt : null;
    const systemPrompt = typeof promptRaw?.system === 'string' ? promptRaw.system : '';
    const userPrompt = typeof promptRaw?.user === 'string' ? promptRaw.user : '';

    const modelProfile = isRecord(fm.modelProfile) ? fm.modelProfile : null;
    const modelPreferred = coerceString(modelProfile?.preferred) || 'claude-3-5-sonnet-latest';

    let isValid: boolean = true;
    let errorCode: string | null = null;
    let errorMessage: string | null = null;

    if (!id || !name) {
        isValid = false;
        errorCode = 'INVALID_ARGUMENT';
        errorMessage = 'Missing required fields (id/name)';
    } else if (!version || !isValidSemVer(version)) {
        isValid = false;
        errorCode = 'INVALID_ARGUMENT';
        errorMessage = 'version must be valid SemVer';
    } else if (!tags || tags.length === 0) {
        isValid = false;
        errorCode = 'INVALID_ARGUMENT';
        errorMessage = 'tags is required';
    } else if (!systemPrompt.trim() || !userPrompt.trim()) {
        isValid = false;
        errorCode = 'INVALID_ARGUMENT';
        errorMessage = 'prompt.system and prompt.user are required';
    }

    const resolvedId = id || stableInvalidId(args.scope, args.sourceUri);
    const fallbackName = name || path.basename(path.dirname(args.sourceUri)) || 'SKILL';

    return {
        id: resolvedId,
        name: fallbackName,
        description,
        tag,
        system_prompt: systemPrompt || null,
        user_prompt_template: userPrompt || '',
        context_rules: buildDefaultContextRulesJson(),
        model: modelPreferred,
        is_builtin: args.scope === 'builtin' ? 1 : 0,
        source_uri: args.sourceUri,
        source_hash: args.sourceHash,
        version,
        scope: args.scope,
        package_id: args.packageId,
        is_valid: isValid ? 1 : 0,
        error_code: isValid ? null : errorCode,
        error_message: isValid ? null : errorMessage,
    };
}

@injectable()
export class SkillsService implements SkillsServiceShape {
    private hasIndexedBuiltin = false;

    constructor(
        @inject(ILogger) private readonly logger: ILogger,
        @inject(WritenowSqliteDb) private readonly sqliteDb: WritenowSqliteDb,
    ) {}

    async listSkills(request: SkillListRequest): Promise<IpcResponse<SkillListResponse>> {
        try {
            await this.ensureBuiltinIndexed();

            const includeDisabled = request?.includeDisabled === true;
            const rows = this.sqliteDb.db
                .prepare(
                    `SELECT id, name, description, version, scope, package_id, enabled, is_valid, error_code, error_message
                     FROM skills
                     WHERE scope IN ('builtin','global','project')
                     ORDER BY
                       CASE scope WHEN 'project' THEN 3 WHEN 'global' THEN 2 WHEN 'builtin' THEN 1 ELSE 0 END DESC,
                       name COLLATE NOCASE ASC`,
                )
                .all();

            const skills = rows
                .map(mapSkillListRow)
                .filter((skill) => skill.id && skill.name)
                .filter((skill) => (includeDisabled ? true : skill.enabled));

            return ipcOk({ skills });
        } catch (error) {
            const message = error instanceof Error ? error.message : String(error);
            this.logger.error(`[skills] list failed: ${message}`);
            return ipcErr({ code: 'INTERNAL', message: 'Failed to list skills' });
        }
    }

    async getSkill(request: SkillReadRequest): Promise<IpcResponse<SkillReadResponse>> {
        try {
            await this.ensureBuiltinIndexed();

            const id = coerceString(request?.id);
            if (!id) return ipcErr({ code: 'INVALID_ARGUMENT', message: 'id is required' });

            const row = this.sqliteDb.db
                .prepare(
                    `SELECT id, name, description, version, scope, package_id, enabled, is_valid, error_code, error_message, source_uri, source_hash
                     FROM skills
                     WHERE id = ?`,
                )
                .get(id);

            if (!row) return ipcErr({ code: 'NOT_FOUND', message: 'Skill not found', details: { id } });

            const mapped = mapSkillListRow(row);
            const record = row as { source_uri?: unknown; source_hash?: unknown };
            const sourceUri = coerceString(record.source_uri);
            const sourceHash = coerceString(record.source_hash) || undefined;
            if (!sourceUri) {
                return ipcErr({ code: 'IO_ERROR', message: 'Skill source file is unavailable', details: { id } });
            }

            let rawText = '';
            try {
                rawText = await fsp.readFile(sourceUri, 'utf8');
            } catch (readError) {
                const code = readError && typeof readError === 'object' ? (readError as { code?: unknown }).code : null;
                if (code === 'ENOENT') return ipcErr({ code: 'NOT_FOUND', message: 'Not found', details: { id, sourceUri } });
                return ipcErr({ code: 'IO_ERROR', message: 'I/O error', details: { id, sourceUri, cause: String(code || '') } });
            }

            const parsed = parseSkillText(rawText);

            return ipcOk({
                skill: {
                    ...mapped,
                    sourceUri,
                    ...(sourceHash ? { sourceHash } : {}),
                    ...(parsed.ok ? { definition: parsed.definition } : { parseError: parsed.error }),
                    rawText,
                },
            });
        } catch (error) {
            const message = error instanceof Error ? error.message : String(error);
            this.logger.error(`[skills] read failed: ${message}`);
            return ipcErr({ code: 'INTERNAL', message: 'Failed to read skill' });
        }
    }

    private async ensureBuiltinIndexed(): Promise<void> {
        if (this.hasIndexedBuiltin) return;

        const db = this.sqliteDb.db;
        const builtinPackagesDir = normalizeBuiltinPackagesDir();

        let files: string[] = [];
        try {
            files = await walkForSkillMd(builtinPackagesDir);
        } catch (error) {
            this.logger.warn(`[skills] builtin scan failed: ${error instanceof Error ? error.message : String(error)}`);
            this.hasIndexedBuiltin = true;
            return;
        }

        if (files.length === 0) {
            this.logger.warn(`[skills] builtin packages dir is empty: ${builtinPackagesDir}`);
            this.hasIndexedBuiltin = true;
            return;
        }

        const upsert = db.prepare(
            `INSERT INTO skills (
                id, name, description, tag, system_prompt, user_prompt_template, context_rules, model, is_builtin,
                source_uri, source_hash, version, scope, package_id,
                enabled, is_valid, error_code, error_message,
                created_at, updated_at
            ) VALUES (
                @id, @name, @description, @tag, @system_prompt, @user_prompt_template, @context_rules, @model, @is_builtin,
                @source_uri, @source_hash, @version, @scope, @package_id,
                1, @is_valid, @error_code, @error_message,
                @created_at, @updated_at
            )
            ON CONFLICT(id) DO UPDATE SET
                name=excluded.name,
                description=excluded.description,
                tag=excluded.tag,
                system_prompt=excluded.system_prompt,
                user_prompt_template=excluded.user_prompt_template,
                context_rules=excluded.context_rules,
                model=excluded.model,
                is_builtin=excluded.is_builtin,
                source_uri=excluded.source_uri,
                source_hash=excluded.source_hash,
                version=excluded.version,
                scope=excluded.scope,
                package_id=excluded.package_id,
                is_valid=excluded.is_valid,
                error_code=excluded.error_code,
                error_message=excluded.error_message,
                updated_at=excluded.updated_at`,
        );

        const now = nowIso();
        try {
            const rows: IndexedSkillRow[] = [];
            for (const filePath of files) {
                const scope: SkillScope = 'builtin';
                const sourceUri = filePath;
                let text: string;
                try {
                    text = await fsp.readFile(filePath, 'utf8');
                } catch (error) {
                    const skillId = stableInvalidId(scope, sourceUri);
                    rows.push({
                        id: skillId,
                        name: path.basename(path.dirname(sourceUri)) || 'Invalid SKILL',
                        description: null,
                        tag: null,
                        system_prompt: null,
                        user_prompt_template: '',
                        context_rules: buildDefaultContextRulesJson(),
                        model: 'claude-3-5-sonnet-latest',
                        is_builtin: 1,
                        source_uri: sourceUri,
                        source_hash: '',
                        version: null,
                        scope,
                        package_id: null,
                        is_valid: 0,
                        error_code: 'IO_ERROR',
                        error_message: 'I/O error',
                    });
                    continue;
                }

                const sourceHash = sha256Hex(text);
                const parsed = parseSkillText(text);
                if (!parsed.ok) {
                    const skillId = stableInvalidId(scope, sourceUri);
                    rows.push({
                        id: skillId,
                        name: path.basename(path.dirname(sourceUri)) || 'Invalid SKILL',
                        description: null,
                        tag: null,
                        system_prompt: null,
                        user_prompt_template: '',
                        context_rules: buildDefaultContextRulesJson(),
                        model: 'claude-3-5-sonnet-latest',
                        is_builtin: 1,
                        source_uri: sourceUri,
                        source_hash: sourceHash,
                        version: null,
                        scope,
                        package_id: null,
                        is_valid: 0,
                        error_code: parsed.error.code,
                        error_message: parsed.error.message,
                    });
                    continue;
                }

                const packageId = derivePackageId(builtinPackagesDir, filePath);
                rows.push(buildIndexedRow({ scope, sourceUri, sourceHash, packageId, definition: parsed.definition }));
            }

            const tx = db.transaction((payload: IndexedSkillRow[]) => {
                for (const row of payload) {
                    upsert.run({ ...row, created_at: now, updated_at: now });
                }
            });
            tx(rows);
        } catch (error) {
            this.logger.error(`[skills] builtin index failed: ${error instanceof Error ? error.message : String(error)}`);
        } finally {
            this.hasIndexedBuiltin = true;
        }
    }
}
