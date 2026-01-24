import * as fs from 'node:fs';
import * as fsp from 'node:fs/promises';
import * as path from 'node:path';
import { Readable } from 'node:stream';
import { finished } from 'node:stream/promises';
import { createHash } from 'node:crypto';
import type { ReadableStream as NodeReadableStream } from 'node:stream/web';

import type { ILogger } from '@theia/core/lib/common/logger';

import type { IpcErrorCode } from '../../common/ipc-generated';

export type ModelDownloadProgress = Readonly<{
    percent: number;
    transferred: number;
    total: number;
    bytesPerSecond: number;
}>;

export type ModelDownloadConfig = Readonly<{
    url: string;
    filename: string;
    sha256?: string;
}>;

export type ModelDownloader = Readonly<{
    ensureModel(
        model: ModelDownloadConfig,
        runtimeOptions?: Readonly<{ signal?: AbortSignal; onProgress?: (progress: ModelDownloadProgress) => void }>,
    ): Promise<{ ready: true; path: string }>;
}>;

function createIpcError(code: IpcErrorCode, message: string, details?: unknown): Error {
    const error = new Error(message);
    (error as { ipcError?: unknown }).ipcError = { code, message, ...(typeof details === 'undefined' ? {} : { details }) };
    return error;
}

function nowMs(): number {
    return Date.now();
}

function isValidSha256(value: unknown): value is string {
    return typeof value === 'string' && /^[a-f0-9]{64}$/i.test(value.trim());
}

async function safeStat(filePath: string): Promise<fs.Stats | null> {
    try {
        return await fsp.stat(filePath);
    } catch {
        return null;
    }
}

function toProgress(options: Readonly<{ transferred: number; total: number; startedAtMs: number; lastBytesPerSecond: number }>): ModelDownloadProgress {
    const elapsedMs = Math.max(1, nowMs() - options.startedAtMs);
    const bytesPerSecond = Math.max(options.lastBytesPerSecond, Math.round((options.transferred * 1000) / elapsedMs));
    const percent = options.total > 0 ? (options.transferred / options.total) * 100 : 0;
    return { percent, transferred: options.transferred, total: options.total, bytesPerSecond };
}

function parseContentRange(rangeHeader: unknown): { start: number; end: number; total: number | null } | null {
    if (typeof rangeHeader !== 'string') return null;
    const match = rangeHeader.match(/^bytes\s+(\d+)-(\d+)\/(\d+|\*)$/i);
    if (!match) return null;
    const start = Number(match[1]);
    const end = Number(match[2]);
    const total = match[3] === '*' ? null : Number(match[3]);
    if (!Number.isFinite(start) || !Number.isFinite(end)) return null;
    if (total !== null && !Number.isFinite(total)) return null;
    return { start, end, total };
}

async function computeSha256(filePath: string): Promise<string> {
    const hash = createHash('sha256');
    const stream = fs.createReadStream(filePath);
    stream.on('data', (chunk) => hash.update(chunk));
    await finished(stream);
    return hash.digest('hex');
}

async function getRemoteSize(url: string, signal: AbortSignal | undefined): Promise<number | null> {
    const head = await fetch(url, { method: 'HEAD', redirect: 'follow', signal });
    if (head.ok) {
        const raw = head.headers.get('content-length');
        if (raw) {
            const total = Number(raw);
            return Number.isFinite(total) && total > 0 ? total : null;
        }
    }

    const fallback = await fetch(url, {
        method: 'GET',
        redirect: 'follow',
        headers: { Range: 'bytes=0-0' },
        signal,
    });

    const range = parseContentRange(fallback.headers.get('content-range'));
    if (range?.total) return range.total;

    const raw = fallback.headers.get('content-length');
    if (raw) {
        const total = Number(raw);
        return Number.isFinite(total) && total > 0 ? total : null;
    }
    return null;
}

async function downloadWithResume(options: Readonly<{
    url: string;
    partialPath: string;
    totalBytes?: number;
    onProgress?: (progress: ModelDownloadProgress) => void;
    signal?: AbortSignal;
}>): Promise<{ transferred: number; total: number | null }> {
    const existing = await safeStat(options.partialPath);
    const existingBytes = existing ? existing.size : 0;

    const res = await fetch(options.url, {
        method: 'GET',
        redirect: 'follow',
        headers: existingBytes > 0 ? { Range: `bytes=${existingBytes}-` } : undefined,
        signal: options.signal,
    });

    if (!res.ok) {
        throw createIpcError('UPSTREAM_ERROR', 'Failed to download model', { status: res.status });
    }

    const isPartial = res.status === 206;
    if (existingBytes > 0 && !isPartial) {
        try {
            await fsp.truncate(options.partialPath, 0);
        } catch {
            // ignore
        }
    }

    const contentRange = parseContentRange(res.headers.get('content-range'));
    const remoteTotal = contentRange?.total ?? null;
    const contentLengthRaw = res.headers.get('content-length');
    const contentLength = contentLengthRaw ? Number(contentLengthRaw) : null;
    const expectedTotal =
        remoteTotal ??
        options.totalBytes ??
        (contentLength ? (isPartial ? existingBytes + contentLength : contentLength) : null);

    if (!res.body) {
        throw createIpcError('UPSTREAM_ERROR', 'Download response has no body');
    }

    const writeStream = fs.createWriteStream(options.partialPath, { flags: existingBytes > 0 && isPartial ? 'a' : 'w' });
    const startedAtMs = nowMs();
    let transferred = existingBytes > 0 && isPartial ? existingBytes : 0;
    let lastBytesPerSecond = 0;

    const nodeStream = Readable.fromWeb(res.body as unknown as NodeReadableStream);
    nodeStream.on('data', (chunk) => {
        transferred += chunk.length;
        if (typeof expectedTotal === 'number') {
            const progress = toProgress({ transferred, total: expectedTotal, startedAtMs, lastBytesPerSecond });
            lastBytesPerSecond = progress.bytesPerSecond;
            options.onProgress?.(progress);
        } else {
            options.onProgress?.({ percent: 0, transferred, total: 0, bytesPerSecond: 0 });
        }
    });

    try {
        nodeStream.pipe(writeStream);
        await finished(writeStream);
    } catch (error) {
        try {
            writeStream.destroy();
        } catch {
            // ignore
        }
        if (options.signal?.aborted) throw createIpcError('CANCELED', 'Download canceled');
        throw error;
    }

    return { transferred, total: expectedTotal };
}

async function validateModelFile(options: Readonly<{ filePath: string; expectedBytes?: number; expectedSha256?: string }>): Promise<{ ok: true } | { ok: false; reason: string; details?: unknown }> {
    const stat = await safeStat(options.filePath);
    if (!stat || stat.size <= 0) return { ok: false, reason: 'empty' };
    if (typeof options.expectedBytes === 'number' && options.expectedBytes > 0 && stat.size !== options.expectedBytes) {
        return { ok: false, reason: 'size_mismatch', details: { size: stat.size, expectedBytes: options.expectedBytes } };
    }
    if (isValidSha256(options.expectedSha256)) {
        const actual = await computeSha256(options.filePath);
        if (actual.toLowerCase() !== options.expectedSha256.toLowerCase()) {
            return { ok: false, reason: 'sha256_mismatch', details: { sha256: actual, expectedSha256: options.expectedSha256 } };
        }
    }
    return { ok: true };
}

export function createModelDownloader(options: Readonly<{ logger?: ILogger | null; modelDir: string }>): ModelDownloader {
    const logger = options.logger ?? null;
    const modelDir = options.modelDir.trim();
    if (!modelDir) throw new Error('createModelDownloader requires { modelDir }');

    async function ensureModel(
        model: ModelDownloadConfig,
        runtimeOptions: Readonly<{ signal?: AbortSignal; onProgress?: (progress: ModelDownloadProgress) => void }> = {},
    ): Promise<{ ready: true; path: string }> {
        if (!model || typeof model !== 'object') {
            throw createIpcError('INVALID_ARGUMENT', 'Invalid model config');
        }

        const url = typeof model.url === 'string' ? model.url.trim() : '';
        const filename = typeof model.filename === 'string' ? model.filename.trim() : '';
        if (!url || !filename) throw createIpcError('INVALID_ARGUMENT', 'Invalid model config', { url, filename });

        await fsp.mkdir(modelDir, { recursive: true });

        const targetPath = path.join(modelDir, filename);
        const partialPath = `${targetPath}.part`;

        const remoteSize = await getRemoteSize(url, runtimeOptions.signal).catch(() => null);
        const existing = await validateModelFile({
            filePath: targetPath,
            expectedBytes: remoteSize ?? undefined,
            expectedSha256: model.sha256,
        });
        if (existing.ok) return { ready: true, path: targetPath };

        const downloadResult = await downloadWithResume({
            url,
            partialPath,
            totalBytes: remoteSize ?? undefined,
            onProgress: runtimeOptions.onProgress,
            signal: runtimeOptions.signal,
        });

        const finalSize = downloadResult.total ?? remoteSize ?? undefined;
        const validated = await validateModelFile({
            filePath: partialPath,
            expectedBytes: finalSize,
            expectedSha256: model.sha256,
        });

        if (!validated.ok) {
            logger?.error?.(`[model-downloader] validate failed: ${validated.reason}`);
            try {
                await fsp.unlink(partialPath);
            } catch {
                // ignore
            }
            throw createIpcError('IO_ERROR', 'Model validation failed', { reason: validated.reason, details: validated.details });
        }

        await fsp.rename(partialPath, targetPath);
        return { ready: true, path: targetPath };
    }

    return { ensureModel };
}
