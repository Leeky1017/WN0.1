import { parentPort } from 'node:worker_threads';
import * as fs from 'node:fs/promises';
import * as http from 'node:http';
import * as https from 'node:https';
import * as path from 'node:path';
import { URL } from 'node:url';

import type { IpcErrorCode } from '../../common/ipc-generated';

const TEXT2VEC_MODEL_ID = 'shibing624/text2vec-base-chinese';

type FeatureExtractor = (texts: string[], options: Readonly<Record<string, unknown>>) => Promise<unknown>;
type TransformersPipelineFactory = (task: string, model: string, options?: Readonly<Record<string, unknown>>) => Promise<FeatureExtractor>;

let extractor: FeatureExtractor | null = null;
let extractorModel: string | null = null;
let extractorCacheDir: string | null = null;

let transformerEnv: Record<string, unknown> | null = null;
let transformerPipeline: TransformersPipelineFactory | null = null;

type IpcErrorLike = Readonly<{
    ipcError: Readonly<{ code: IpcErrorCode; message: string; details?: unknown }>;
}>;

function isIpcErrorLike(value: unknown): value is IpcErrorLike {
    if (!value || typeof value !== 'object') return false;
    if (!('ipcError' in value)) return false;
    const ipcError = (value as { ipcError?: unknown }).ipcError;
    if (!ipcError || typeof ipcError !== 'object') return false;
    const record = ipcError as { code?: unknown; message?: unknown };
    return typeof record.code === 'string' && typeof record.message === 'string';
}

function toIpcError(code: IpcErrorCode, message: string, details?: unknown): IpcErrorLike {
    return {
        ipcError: {
            code,
            message,
            ...(typeof details === 'undefined' ? {} : { details }),
        },
    };
}

function sleep(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
}

function shouldRetryRequest(error: unknown): boolean {
    const code = error && typeof error === 'object' ? String((error as { code?: unknown }).code || '') : '';
    return code === 'ECONNRESET' || code === 'ETIMEDOUT' || code === 'EAI_AGAIN';
}

type FetchOnceResult = Readonly<{
    status: number;
    ok: boolean;
    headers: Readonly<{ get(name: string): string | null }>;
    arrayBuffer(): Promise<ArrayBuffer>;
    text(): Promise<string>;
}>;

class SimpleHeaders {
    private readonly map: Map<string, string>;

    constructor(raw: Record<string, unknown>) {
        this.map = new Map();
        for (const [key, value] of Object.entries(raw)) {
            const lower = String(key).toLowerCase();
            if (Array.isArray(value)) this.map.set(lower, value.map((v) => String(v)).join(', '));
            else if (typeof value === 'string') this.map.set(lower, value);
            else if (typeof value === 'number') this.map.set(lower, String(value));
        }
    }

    get(name: string): string | null {
        if (!name) return null;
        return this.map.get(name.toLowerCase()) ?? null;
    }
}

async function fetchOnce(urlString: string, init: Readonly<{ method?: string; timeoutMs?: number; headers?: Record<string, string> }> = {}, redirectsLeft = 8): Promise<FetchOnceResult> {
    const parsed = new URL(urlString);
    const lib = parsed.protocol === 'https:' ? https : http;
    const method = typeof init.method === 'string' ? init.method.toUpperCase() : 'GET';
    const timeoutMs = typeof init.timeoutMs === 'number' ? init.timeoutMs : 300_000;
    const headers = init.headers && typeof init.headers === 'object' ? { ...init.headers } : {};
    if (!headers['user-agent'] && !headers['User-Agent']) headers['user-agent'] = 'WriteNow-EmbeddingWorker';

    return new Promise((resolve, reject) => {
        const req = lib.request(
            parsed,
            {
                method,
                headers,
            },
            (res) => {
                const status = typeof res.statusCode === 'number' ? res.statusCode : 0;
                const location = typeof res.headers?.location === 'string' ? res.headers.location : '';
                if ([301, 302, 303, 307, 308].includes(status) && location && redirectsLeft > 0) {
                    res.resume();
                    const nextUrl = new URL(location, parsed).toString();
                    fetchOnce(nextUrl, { ...init, method: status === 303 ? 'GET' : method }, redirectsLeft - 1)
                        .then(resolve)
                        .catch(reject);
                    return;
                }

                const chunks: Buffer[] = [];
                res.on('data', (chunk) => {
                    chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk));
                });
                res.on('end', () => {
                    const buffer = Buffer.concat(chunks);
                    const headersRecord = new SimpleHeaders(res.headers as unknown as Record<string, unknown>);
                    resolve({
                        status,
                        ok: status >= 200 && status < 300,
                        headers: headersRecord,
                        arrayBuffer: async () => buffer.buffer.slice(buffer.byteOffset, buffer.byteOffset + buffer.byteLength),
                        text: async () => buffer.toString('utf8'),
                    });
                });
            },
        );

        req.setTimeout(timeoutMs, () => {
            req.destroy(Object.assign(new Error('Request timed out'), { code: 'ETIMEDOUT' }));
        });

        req.on('error', reject);
        req.end();
    });
}

async function fetchWithRetries(
    urlString: string,
    init: Readonly<{ method?: string; timeoutMs?: number; headers?: Record<string, string>; retries?: number }> = {},
): Promise<FetchOnceResult> {
    const retries = typeof init.retries === 'number' ? Math.max(0, Math.min(5, init.retries)) : 2;
    let lastError: unknown = null;

    for (let attempt = 0; attempt <= retries; attempt += 1) {
        try {
            return await fetchOnce(urlString, init, 8);
        } catch (error) {
            lastError = error;
            if (!shouldRetryRequest(error) || attempt === retries) throw error;
            await sleep(500 * (attempt + 1));
        }
    }

    throw lastError ?? new Error('fetch failed');
}

const dynamicImport = new Function('specifier', 'return import(specifier)') as (specifier: string) => Promise<unknown>;

async function loadTransformers(): Promise<{ env: Record<string, unknown>; pipeline: TransformersPipelineFactory }> {
    if (transformerEnv && transformerPipeline) return { env: transformerEnv, pipeline: transformerPipeline };

    const mod = await dynamicImport('@xenova/transformers');
    if (!mod || typeof mod !== 'object') {
        throw new Error('Failed to load transformers module');
    }

    const env = (mod as { env?: unknown }).env;
    const pipeline = (mod as { pipeline?: unknown }).pipeline;
    if (!env || typeof env !== 'object' || typeof pipeline !== 'function') {
        throw new Error('transformers module missing { env, pipeline }');
    }

    transformerEnv = env as Record<string, unknown>;
    transformerPipeline = pipeline as TransformersPipelineFactory;
    return { env: transformerEnv, pipeline: transformerPipeline };
}

function getRemoteHost(): string {
    const override = typeof process.env.WN_HF_REMOTE_HOST === 'string' ? process.env.WN_HF_REMOTE_HOST.trim() : '';
    if (override) return override.endsWith('/') ? override : `${override}/`;
    return 'https://huggingface.co/';
}

async function fileExists(filePath: string): Promise<boolean> {
    try {
        await fs.access(filePath);
        return true;
    } catch {
        return false;
    }
}

async function downloadTo(url: string, outPath: string): Promise<{ ok: true } | { ok: false; status: number }> {
    const response = await fetchWithRetries(url, { timeoutMs: 600_000, retries: 3 });
    if (!response.ok) {
        return { ok: false, status: response.status };
    }
    const buf = Buffer.from(await response.arrayBuffer());
    await fs.mkdir(path.dirname(outPath), { recursive: true });
    await fs.writeFile(outPath, buf);
    return { ok: true };
}

async function downloadToWithMirror(url: string, outPath: string): Promise<{ ok: true } | { ok: false; status: number }> {
    const res = await downloadTo(url, outPath);
    if (res.ok) return res;

    const remoteHost = getRemoteHost();
    const hfPrimary = 'https://huggingface.co/';
    const hfMirror = 'https://hf-mirror.com/';
    if (remoteHost !== hfPrimary) return res;

    const mirrorUrl = url.replace(hfPrimary, hfMirror);
    return downloadTo(mirrorUrl, outPath);
}

type Text2VecOnnxVariant = 'model_qint8_avx512_vnni' | 'model_O4' | 'model';

async function detectAvx512Vnni(): Promise<boolean> {
    if (process.arch !== 'x64') return false;
    if (process.platform !== 'linux') return false;
    try {
        const cpuinfo = await fs.readFile('/proc/cpuinfo', 'utf8');
        const flagsLine = cpuinfo
            .split('\n')
            .find((line) => line.toLowerCase().startsWith('flags'));
        if (!flagsLine) return false;
        const flags = new Set(flagsLine.split(':').slice(1).join(':').trim().split(/\s+/g));
        return flags.has('avx512f') && (flags.has('avx512vnni') || flags.has('avx512_vnni'));
    } catch {
        return false;
    }
}

function parseText2VecVariantOverride(): Text2VecOnnxVariant | null {
    const raw = typeof process.env.WN_TEXT2VEC_ONNX_VARIANT === 'string' ? process.env.WN_TEXT2VEC_ONNX_VARIANT.trim() : '';
    if (!raw) return null;
    if (raw === 'avx512_vnni') return 'model_qint8_avx512_vnni';
    if (raw === 'o4') return 'model_O4';
    if (raw === 'f32') return 'model';
    return null;
}

async function selectText2VecOnnxVariant(): Promise<Text2VecOnnxVariant> {
    const override = parseText2VecVariantOverride();
    if (override) return override;
    return (await detectAvx512Vnni()) ? 'model_qint8_avx512_vnni' : 'model';
}

async function ensureText2VecAssets(model: string, cacheDir: string, allowRemote: boolean): Promise<{ modelFileName: Text2VecOnnxVariant }> {
    const baseDir = path.join(cacheDir, model);
    const remoteHost = getRemoteHost();
    const baseUrl = `${remoteHost}${model}/resolve/main/`;

    const required = [
        { url: `${baseUrl}config.json`, out: path.join(baseDir, 'config.json') },
        // Prefer ONNX-exported tokenizer_config.json because sentence-transformers repos may omit `model_max_length` at root.
        { url: `${baseUrl}onnx/tokenizer_config.json`, out: path.join(baseDir, 'tokenizer_config.json') },
        // The upstream repo stores `tokenizer.json` under `onnx/` (sentence-transformers layout).
        // transformers.js requires `tokenizer.json` at the root of the model directory.
        { url: `${baseUrl}onnx/tokenizer.json`, out: path.join(baseDir, 'tokenizer.json') },
        { url: `${baseUrl}onnx/special_tokens_map.json`, out: path.join(baseDir, 'special_tokens_map.json') },
        { url: `${baseUrl}onnx/vocab.txt`, out: path.join(baseDir, 'vocab.txt') },
    ];

    for (const file of required) {
        const exists = await fileExists(file.out);
        if (exists) {
            if (file.out.endsWith(`${path.sep}tokenizer_config.json`)) {
                const raw = await fs.readFile(file.out, 'utf8').catch(() => null);
                if (typeof raw === 'string') {
                    try {
                        const parsed = JSON.parse(raw) as unknown;
                        if (parsed && typeof parsed === 'object' && typeof (parsed as { model_max_length?: unknown }).model_max_length === 'number') continue;
                    } catch {
                        // fall through
                    }
                }
            } else {
                continue;
            }
        }

        if (!allowRemote) {
            throw toIpcError('MODEL_NOT_READY', 'Embedding model assets are missing', {
                model,
                missing: path.relative(cacheDir, file.out),
                cacheDir,
                recovery: 'Enable downloads (WN_EMBEDDING_ALLOW_REMOTE=1) to initialize the model, then retry offline.',
            });
        }

        const res = await downloadToWithMirror(file.url, file.out);
        if (!res.ok) {
            throw new Error(`download failed: ${res.status} ${file.url}`);
        }
    }

    const selected = await selectText2VecOnnxVariant();
    const candidates: Text2VecOnnxVariant[] =
        selected === 'model_qint8_avx512_vnni' ? [selected, 'model'] : selected === 'model_O4' ? [selected, 'model'] : [selected];

    for (const variant of candidates) {
        const modelFile = `${variant}.onnx`;
        const out = path.join(baseDir, 'onnx', modelFile);
        if (await fileExists(out)) {
            return { modelFileName: variant };
        }

        if (!allowRemote) {
            throw toIpcError('MODEL_NOT_READY', 'Embedding model assets are missing', {
                model,
                missing: path.relative(cacheDir, out),
                cacheDir,
                recovery: 'Enable downloads (WN_EMBEDDING_ALLOW_REMOTE=1) to initialize the model, then retry offline.',
            });
        }

        const res = await downloadToWithMirror(`${baseUrl}onnx/${modelFile}`, out);
        if (res.ok) {
            return { modelFileName: variant };
        }
        if (res.status === 404) {
            continue;
        }
        throw new Error(`download failed: ${res.status} ${baseUrl}onnx/${modelFile}`);
    }

    throw toIpcError('MODEL_NOT_READY', 'Embedding model assets are missing', {
        model,
        cacheDir,
        recovery: 'Enable downloads (WN_EMBEDDING_ALLOW_REMOTE=1) to initialize the model, then retry offline.',
    });
}

async function getExtractor(model: string, cacheDir: string, allowRemote: boolean): Promise<FeatureExtractor> {
    if (extractor && extractorModel === model && extractorCacheDir === cacheDir) return extractor;

    const { env, pipeline } = await loadTransformers();

    try {
        env.cacheDir = cacheDir;
        env.localModelPath = cacheDir;
        env.allowRemoteModels = Boolean(allowRemote);
        env.allowLocalModels = true;
        env.remoteHost = getRemoteHost();
    } catch {
        // ignore
    }

    let next: FeatureExtractor;
    if (model === TEXT2VEC_MODEL_ID) {
        const assets = await ensureText2VecAssets(model, cacheDir, allowRemote);
        next = await pipeline('feature-extraction', model, {
            quantized: false,
            cache_dir: cacheDir,
            local_files_only: !allowRemote,
            model_file_name: assets.modelFileName,
        });
    } else {
        try {
            next = await pipeline('feature-extraction', model, { quantized: true, cache_dir: cacheDir, local_files_only: !allowRemote });
        } catch {
            next = await pipeline('feature-extraction', model, { cache_dir: cacheDir, local_files_only: !allowRemote });
        }
    }

    extractor = next;
    extractorModel = model;
    extractorCacheDir = cacheDir;
    return extractor;
}

type EmbeddingWorkerEncodePayload = Readonly<{
    model?: unknown;
    cacheDir?: unknown;
    allowRemote?: unknown;
    texts?: unknown;
    debugDelayMs?: unknown;
}>;

function coercePositiveDelayMs(value: unknown): number | null {
    if (typeof value !== 'number' || !Number.isFinite(value) || value <= 0) return null;
    return Math.min(Math.floor(value), 600_000);
}

function inferDimension(outputDims: unknown, dataLength: number, textsLength: number): number {
    if (Array.isArray(outputDims) && outputDims.length >= 2) {
        const last = outputDims[outputDims.length - 1];
        if (typeof last === 'number' && Number.isFinite(last) && last > 0) return last;
    }
    const inferred = Math.floor(dataLength / Math.max(1, textsLength));
    if (!inferred || inferred <= 0) throw new Error('Unable to infer embedding dimension');
    return inferred;
}

function sliceToNumberArray(data: unknown, start: number, end: number): number[] {
    if (!data || typeof data !== 'object') throw new Error('Unexpected embedding output');
    if (!('slice' in data)) throw new Error('Unexpected embedding output');
    const sliceFn = (data as { slice?: (s: number, e: number) => unknown }).slice;
    if (typeof sliceFn !== 'function') throw new Error('Unexpected embedding output');
    const sliced = sliceFn.call(data, start, end);
    if (!sliced || typeof sliced !== 'object' || !('length' in sliced)) throw new Error('Unexpected embedding output');
    const length = typeof (sliced as { length?: unknown }).length === 'number' ? (sliced as { length: number }).length : 0;
    const out: number[] = [];
    for (let i = 0; i < length; i += 1) {
        const value = (sliced as unknown as ArrayLike<unknown>)[i];
        out.push(typeof value === 'number' ? value : Number(value ?? 0));
    }
    return out;
}

async function encode(payload: EmbeddingWorkerEncodePayload): Promise<{ model: string; dimension: number; vectors: number[][] }> {
    const model = payload?.model;
    const cacheDir = payload?.cacheDir;
    const allowRemote = payload?.allowRemote;
    const texts = payload?.texts;

    if (!Array.isArray(texts) || texts.length === 0) {
        throw toIpcError('INVALID_ARGUMENT', 'texts must be a non-empty array');
    }
    for (const text of texts) {
        if (typeof text !== 'string') throw toIpcError('INVALID_ARGUMENT', 'texts must be string[]');
    }
    if (typeof model !== 'string' || typeof cacheDir !== 'string') {
        throw toIpcError('INVALID_ARGUMENT', 'model/cacheDir is required');
    }

    const delayMs = coercePositiveDelayMs(payload?.debugDelayMs);
    if (delayMs !== null) {
        await sleep(delayMs);
    }

    let output: unknown;
    try {
        const fn = await getExtractor(model, cacheDir, Boolean(allowRemote));
        output = await fn(texts, { pooling: 'mean', normalize: true });
    } catch (error) {
        if (isIpcErrorLike(error)) throw error;
        throw toIpcError('MODEL_NOT_READY', 'Embedding model is not ready', {
            model,
            cacheDir,
            allowRemote: Boolean(allowRemote),
            message: error instanceof Error ? error.message : String(error),
            recovery: allowRemote
                ? 'Ensure network access is available to download the model, or prewarm the cache and retry offline.'
                : 'Enable downloads (WN_EMBEDDING_ALLOW_REMOTE=1) to initialize the model, then retry offline.',
        });
    }

    const data = output && typeof output === 'object' ? (output as { data?: unknown }).data : null;
    const dims = output && typeof output === 'object' ? (output as { dims?: unknown }).dims : null;

    const dataLength = typeof (data as { length?: unknown } | null)?.length === 'number' ? (data as { length: number }).length : 0;
    if (!data || dataLength <= 0) throw new Error('Unexpected embedding output');

    const dimension = inferDimension(dims, dataLength, texts.length);

    const vectors: number[][] = [];
    for (let i = 0; i < texts.length; i += 1) {
        const start = i * dimension;
        const end = start + dimension;
        vectors.push(sliceToNumberArray(data, start, end));
    }

    return { model, dimension, vectors };
}

type WorkerInboundMessage = Readonly<{ id?: unknown; type?: unknown; payload?: unknown }>;

function isWorkerInboundMessage(value: unknown): value is WorkerInboundMessage {
    return Boolean(value && typeof value === 'object');
}

parentPort?.on('message', async (message: unknown) => {
    if (!isWorkerInboundMessage(message)) return;
    const id = message?.id;
    const type = message?.type;
    if (typeof id !== 'number' || typeof type !== 'string') return;

    try {
        if (type === 'encode') {
            const data = await encode(message.payload as EmbeddingWorkerEncodePayload);
            parentPort?.postMessage({ id, ok: true, data });
            return;
        }
        parentPort?.postMessage({ id, ok: false, error: toIpcError('INVALID_ARGUMENT', 'Unknown request type', { type }) });
    } catch (error) {
        if (isIpcErrorLike(error)) {
            parentPort?.postMessage({ id, ok: false, error });
            return;
        }
        const messageText = error instanceof Error ? error.message : String(error);
        parentPort?.postMessage({
            id,
            ok: false,
            error: toIpcError('ENCODING_FAILED', 'Embedding worker failed', { message: messageText }),
        });
    }
});
