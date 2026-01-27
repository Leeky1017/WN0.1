# Design: Local LLM Tab Autocomplete (node-llama-cpp)

## Context (existing entrypoints)

- Electron main entry: `writenow-frontend/electron/main.ts` (IPC handlers live here today via `ipcMain.handle(...)`).
- Preload bridge: `writenow-frontend/electron/preload.ts` (exposes `electronAPI` to renderer).
- TipTap editor: `writenow-frontend/src/components/editor/TipTapEditor.tsx` (extensions + DOM event hooks).
- App shell currently mounts `Editor` (contentEditable demo): `writenow-frontend/src/components/layout/AppShell.tsx`.

Conclusion: Tab autocomplete should be implemented as a TipTap extension and wired when the main canvas uses TipTap.

## Goals

- Tab-based inline autocomplete in the editor using a **local LLM**.
- Explicit opt-in model download; no background download unless user clicks.
- IPC with deterministic `IpcResponse<T>` and stable error codes (`TIMEOUT`, `CANCELED`, `MODEL_NOT_READY`).
- Cancellation must clear pending state in both main + renderer.
- Single code path: local LLM only; feature flag gates execution, not architecture.

## Non-Goals

- No cloud fallback for Tab completion.
- No replacement of existing AI Skills (`ai:skill:*`).
- No UI polish spec here beyond required interfaces + flows.

## Architecture Overview

```
+----------------------+         IPC (invoke + stream)         +---------------------------+
| Renderer (TipTap)    |-------------------------------------->| Main (LocalLlmService)    |
| - Tab pressed        |                                        | - ensureModel(opt-in)     |
| - prefix/suffix      |<--------------------------------------| - node-llama-cpp stream   |
| - ghost text overlay |       localLlm:tab:stream events       | - cancel/timeout cleanup  |
+----------------------+                                        +---------------------------+
                       models stored under: app.getPath('userData')/models
```

## Tech Choices

- Engine: `node-llama-cpp` (GGUF support, runs in Electron main process).
- Storage: `app.getPath('userData')/models` (per-user local assets).
- IPC: new `localLlm:*` channels with `IpcResponse<T>` (contract SSOT).
- Feature flag: `LocalLlmSettings.enabled` (single path, gate execution only).

## Model Storage Layout

```
{userData}/models/
  registry.json            # optional checksum/metadata
  qwen2.5-1.5b-q4.gguf      # default model example
```

## IPC Surface (add to contract)

Channels:
- `localLlm:model:list` -> list available + downloaded
- `localLlm:model:ensure` -> validate or download (opt-in)
- `localLlm:tab:complete` -> start completion (returns runId)
- `localLlm:tab:cancel` -> cancel by runId
- `localLlm:settings:get` / `localLlm:settings:update`

Events:
- `localLlm:tab:stream` -> delta / done / error
- `localLlm:state:changed` -> download/ready state

Minimal types (sketch):

```ts
export type LocalLlmSettings = {
  enabled: boolean;
  modelId: 'qwen2.5-1.5b-q4';
  maxTokens: number;
  temperature: number;
  timeoutMs: number;
};

export type LocalLlmModelState = {
  status: 'idle' | 'downloading' | 'ready' | 'error';
  modelId?: string;
  modelPath?: string;
  progress?: { receivedBytes: number; totalBytes?: number };
  error?: IpcError;
};

export type LocalLlmTabCompleteRequest = {
  prefix: string;
  suffix: string;
  maxTokens: number;
  temperature: number;
  timeoutMs: number;
  stop?: string[];
};

export type LocalLlmTabStreamEvent =
  | { type: 'delta'; runId: string; text: string }
  | { type: 'done'; runId: string; result: string; durationMs: number }
  | { type: 'error'; runId: string; error: IpcError };
```

## Main Process Service (TypeScript example)

```ts
import fs from 'node:fs';
import path from 'node:path';
import { pipeline } from 'node:stream/promises';
import { TransformStream } from 'node:stream/web';
import type { App, BrowserWindow } from 'electron';
import type { IpcError, IpcResponse } from '@/types/ipc-generated';

type LocalLlmEngine = {
  loadModel: (modelPath: string) => Promise<void>;
  streamCompletion: (input: {
    prompt: string;
    maxTokens: number;
    temperature: number;
    stop?: string[];
    signal: AbortSignal;
  }) => AsyncIterable<string>;
};

type ModelDescriptor = {
  id: string;
  filename: string;
  url: string;
  sizeBytes: number;
  sha256: string;
};

type LocalLlmDeps = {
  app: App;
  engine: LocalLlmEngine;
  getWindows: () => BrowserWindow[];
  logger: { info: (m: string) => void; warn: (m: string) => void; error: (m: string) => void };
};

type RunEntry = { controller: AbortController; startedAt: number };

type LlmState = {
  status: 'idle' | 'downloading' | 'ready' | 'error';
  modelId?: string;
  modelPath?: string;
  progress?: { receivedBytes: number; totalBytes?: number };
  error?: IpcError;
};

function ok<T>(data: T): IpcResponse<T> { return { ok: true, data }; }
function err(code: IpcError['code'], message: string, details?: unknown): IpcResponse<never> {
  return { ok: false, error: { code, message, details } };
}

export class LocalLlmService {
  private readonly runs = new Map<string, RunEntry>();
  private state: LlmState = { status: 'idle' };
  private loadedModelPath: string | null = null;

  constructor(private readonly deps: LocalLlmDeps, private readonly models: ModelDescriptor[]) {}

  private modelDir(): string {
    return path.join(this.deps.app.getPath('userData'), 'models');
  }

  private broadcastState(): void {
    for (const win of this.deps.getWindows()) {
      win.webContents.send('localLlm:state:changed', this.state);
    }
  }

  private broadcastStream(event: unknown): void {
    for (const win of this.deps.getWindows()) {
      win.webContents.send('localLlm:tab:stream', event);
    }
  }

  async ensureModel(modelId: string, allowDownload: boolean): Promise<IpcResponse<{ modelPath: string }>> {
    const model = this.models.find((m) => m.id === modelId);
    if (!model) return err('NOT_FOUND', 'Model not found', { modelId });

    const modelPath = path.join(this.modelDir(), model.filename);
    if (!fs.existsSync(modelPath)) {
      if (!allowDownload) return err('MODEL_NOT_READY', 'Model not downloaded', { modelId });

      await fs.promises.mkdir(this.modelDir(), { recursive: true });
      this.state = { status: 'downloading', modelId, modelPath };
      this.broadcastState();

      const res = await fetch(model.url);
      if (!res.ok || !res.body) return err('IO_ERROR', 'Model download failed', { status: res.status });

      let received = 0;
      const total = Number(res.headers.get('content-length') ?? 0) || undefined;
      const progressStream = new TransformStream<Uint8Array, Uint8Array>({
        transform: (chunk, controller) => {
          received += chunk.byteLength;
          this.state = { status: 'downloading', modelId, modelPath, progress: { receivedBytes: received, totalBytes: total } };
          this.broadcastState();
          controller.enqueue(chunk);
        },
      });

      await pipeline(res.body, progressStream, fs.createWriteStream(modelPath));
    }

    if (this.loadedModelPath !== modelPath) {
      await this.deps.engine.loadModel(modelPath);
      this.loadedModelPath = modelPath;
    }

    this.state = { status: 'ready', modelId, modelPath };
    this.broadcastState();
    return ok({ modelPath });
  }

  async complete(request: {
    prefix: string; suffix: string; maxTokens: number; temperature: number; timeoutMs: number; stop?: string[];
  }): Promise<IpcResponse<{ runId: string; startedAt: number }>> {
    if (!this.loadedModelPath) return err('MODEL_NOT_READY', 'Model not ready');
    if (!request.prefix.trim()) return err('INVALID_ARGUMENT', 'Prefix is empty');

    const runId = `llm_${Date.now()}_${Math.random().toString(16).slice(2)}`;
    const controller = new AbortController();
    const startedAt = Date.now();
    this.runs.set(runId, { controller, startedAt });

    const timeoutMs = Number.isFinite(request.timeoutMs) && request.timeoutMs > 0 ? request.timeoutMs : 15_000;
    const timeoutId = setTimeout(() => controller.abort('timeout'), timeoutMs);

    const prompt = [
      'You are a writing assistant. Output only continuation text.',
      '',
      '## Prefix',
      request.prefix,
      '',
      '## Suffix (style alignment, do not repeat)',
      request.suffix,
      '',
      '## Continuation',
    ].join('\n');

    void (async () => {
      let output = '';
      try {
        for await (const token of this.deps.engine.streamCompletion({
          prompt,
          maxTokens: request.maxTokens,
          temperature: request.temperature,
          stop: request.stop,
          signal: controller.signal,
        })) {
          output += token;
          this.broadcastStream({ type: 'delta', runId, text: token });
        }
        this.broadcastStream({ type: 'done', runId, result: output, durationMs: Date.now() - startedAt });
      } catch (error) {
        const reason = controller.signal.aborted ? String(controller.signal.reason ?? 'canceled') : 'error';
        const code: IpcError['code'] = reason === 'timeout' ? 'TIMEOUT' : controller.signal.aborted ? 'CANCELED' : 'UPSTREAM_ERROR';
        this.broadcastStream({ type: 'error', runId, error: { code, message: 'Local LLM failed', details: { reason } } });
      } finally {
        clearTimeout(timeoutId);
        this.runs.delete(runId);
      }
    })();

    return ok({ runId, startedAt });
  }

  cancel(runId: string, reason: 'user' | 'input' | 'timeout'): IpcResponse<{ canceled: true }> {
    const active = this.runs.get(runId);
    if (!active) return err('NOT_FOUND', 'Run not found', { runId });
    active.controller.abort(reason);
    this.runs.delete(runId);
    return ok({ canceled: true });
  }
}
```

## Preload Bridge (TypeScript example)

```ts
import { contextBridge, ipcRenderer, type IpcRendererEvent } from 'electron';
import type { LocalLlmTabStreamEvent, LocalLlmModelState } from '@/types/ipc-generated';

const localLlm = {
  ensureModel: (payload: { modelId: string; allowDownload: boolean }) => ipcRenderer.invoke('localLlm:model:ensure', payload),
  complete: (payload: { prefix: string; suffix: string; maxTokens: number; temperature: number; timeoutMs: number; stop?: string[] }) =>
    ipcRenderer.invoke('localLlm:tab:complete', payload),
  cancel: (payload: { runId: string; reason: 'user' | 'input' | 'timeout' }) => ipcRenderer.invoke('localLlm:tab:cancel', payload),
  onStream: (handler: (event: LocalLlmTabStreamEvent) => void) => {
    const listener = (_event: IpcRendererEvent, event: LocalLlmTabStreamEvent) => handler(event);
    ipcRenderer.on('localLlm:tab:stream', listener);
    return () => ipcRenderer.removeListener('localLlm:tab:stream', listener);
  },
  onStateChanged: (handler: (state: LocalLlmModelState) => void) => {
    const listener = (_event: IpcRendererEvent, state: LocalLlmModelState) => handler(state);
    ipcRenderer.on('localLlm:state:changed', listener);
    return () => ipcRenderer.removeListener('localLlm:state:changed', listener);
  },
};

contextBridge.exposeInMainWorld('electronAPI', { localLlm });
```

## TipTap Extension Hook (TypeScript example)

```ts
import { Extension } from '@tiptap/core';
import { Plugin, PluginKey, type Transaction } from '@tiptap/pm/state';
import { Decoration, DecorationSet, type EditorView } from '@tiptap/pm/view';

type LocalLlmClient = {
  complete: (payload: { prefix: string; suffix: string; maxTokens: number; temperature: number; timeoutMs: number; stop?: string[] })
    => Promise<{ ok: true; data: { runId: string } } | { ok: false; error: { code: string; message: string } }>;
  cancel: (payload: { runId: string; reason: 'user' | 'input' | 'timeout' }) => Promise<void>;
  onStream: (handler: (event: { type: 'delta' | 'done' | 'error'; runId: string; text?: string; result?: string }) => void) => () => void;
};

type SuggestionState = { runId: string | null; pending: boolean; suggestion: string };
const suggestionKey = new PluginKey<SuggestionState>('local-llm-tab');

export const LocalLlmTabExtension = Extension.create<{
  enabled: boolean;
  client: LocalLlmClient | null;
  maxTokens: number;
  temperature: number;
  timeoutMs: number;
  minPrefixChars: number;
}>({
  name: 'localLlmTab',
  addOptions() {
    return { enabled: false, client: null, maxTokens: 48, temperature: 0.4, timeoutMs: 15_000, minPrefixChars: 24 };
  },
  addStorage() {
    return { unsubscribe: null as null | (() => void) };
  },
  onCreate() {
    const client = this.options.client;
    if (!client) return;
    const editor = this.editor;
    const unsubscribe = client.onStream((event) => {
      const state = suggestionKey.getState(editor.state);
      if (!state || event.runId !== state.runId) return;
      if (event.type === 'delta' && event.text) editor.view.dispatch(editor.state.tr.setMeta(suggestionKey, { suggestionDelta: event.text }));
      if (event.type === 'done') editor.view.dispatch(editor.state.tr.setMeta(suggestionKey, { done: true }));
      if (event.type === 'error') editor.view.dispatch(editor.state.tr.setMeta(suggestionKey, { error: true }));
    });
    this.storage.unsubscribe = unsubscribe;
  },
  onDestroy() {
    this.storage.unsubscribe?.();
    this.storage.unsubscribe = null;
  },
  addProseMirrorPlugins() {
    const client = this.options.client;
    return [
      new Plugin<SuggestionState>({
        key: suggestionKey,
        state: {
          init: () => ({ runId: null, pending: false, suggestion: '' }),
          apply: (tr: Transaction, value) => {
            const meta = tr.getMeta(suggestionKey) as
              | { suggestionDelta?: string; done?: true; error?: true; reset?: true; runId?: string }
              | undefined;
            if (meta?.reset) return { runId: null, pending: false, suggestion: '' };
            if (meta?.runId) return { ...value, runId: meta.runId, pending: true, suggestion: '' };
            if (meta?.suggestionDelta) return { ...value, suggestion: value.suggestion + meta.suggestionDelta, pending: true };
            if (meta?.done) return { ...value, runId: null, pending: false };
            if (meta?.error) return { runId: null, pending: false, suggestion: '' };
            return value;
          },
        },
        props: {
          decorations: (state) => {
            const current = suggestionKey.getState(state);
            if (!current?.suggestion) return null;
            const widget = Decoration.widget(state.selection.to, () => {
              const span = document.createElement('span');
              span.className = 'wn-llm-ghost';
              span.textContent = current.suggestion;
              return span;
            });
            return DecorationSet.create(state.doc, [widget]);
          },
          handleKeyDown: (view: EditorView, event) => {
            const current = suggestionKey.getState(view.state);
            if (current?.runId && ['ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown', 'Escape'].includes(event.key)) {
              if (client) void client.cancel({ runId: current.runId, reason: 'input' });
              view.dispatch(view.state.tr.setMeta(suggestionKey, { reset: true }));
              return false;
            }
            if (event.key !== 'Tab') return false;
            if (current?.suggestion) {
              event.preventDefault();
              view.dispatch(view.state.tr.insertText(current.suggestion).setMeta(suggestionKey, { reset: true }));
              return true;
            }
            if (!this.options.enabled || !client) return false;
            const { from, to } = view.state.selection;
            const prefix = view.state.doc.textBetween(0, from, '\n', '\n');
            const suffix = view.state.doc.textBetween(to, view.state.doc.content.size, '\n', '\n');
            if (prefix.trim().length < this.options.minPrefixChars) return false;

            event.preventDefault();
            view.dispatch(view.state.tr.setMeta(suggestionKey, { reset: true }));
            void client.complete({
              prefix,
              suffix,
              maxTokens: this.options.maxTokens,
              temperature: this.options.temperature,
              timeoutMs: this.options.timeoutMs,
              stop: ['\n\n'],
            }).then((res) => {
              if (!res.ok) {
                view.dispatch(view.state.tr.setMeta(suggestionKey, { reset: true }));
                return;
              }
              view.dispatch(view.state.tr.setMeta(suggestionKey, { runId: res.data.runId }));
            });
            return true;
          },
          handleTextInput: (view) => {
            const current = suggestionKey.getState(view.state);
            if (current?.runId && client) void client.cancel({ runId: current.runId, reason: 'input' });
            view.dispatch(view.state.tr.setMeta(suggestionKey, { reset: true }));
            return false;
          },
        },
      }),
    ];
  },
});
```

## Cancellation / Timeout Rules

- Renderer: any input/cursor move/Escape cancels the run and clears ghost text.
- Main: `AbortController.abort()` is always followed by `runs.delete(runId)` (no pending leaks).
- Timeout: server-side timer returns `TIMEOUT` and ends stream; UI treats it as soft stop (no error toast).

## Feature Flag (single path)

- `LocalLlmSettings.enabled = false` => extension remains loaded, but `handleKeyDown` returns `false` (no new run).
- Only one execution path: local LLM; the flag gates activation, not architecture.

## Required Contract Updates

- Add new IPC types + channels to `electron/ipc/contract/ipc-contract.cjs`.
- Regenerate `src/types/ipc-generated.ts` via `npm run contract:generate`.

## E2E Acceptance (must be real)

- Download opt-in writes to `{userData}/models` and updates `localLlm:state:changed`.
- Tab triggers completion, streams ghost text, and accepts on Tab.
- Typing cancels and clears suggestion; run state is cleaned in both processes.
- Timeout returns `TIMEOUT` without UI hanging.
