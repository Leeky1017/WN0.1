/**
 * Theia AI streaming event types.
 * Why: The AI JSON-RPC service pushes `onStreamEvent` notifications with this stable shape.
 *
 * Source: writenow-theia/writenow-core/src/common/writenow-protocol.ts (AiStreamEvent)
 */

import type { IpcError } from './ipc-generated';

export type AiStreamEvent =
  | { type: 'delta'; runId: string; text: string }
  | { type: 'done'; runId: string; result: { text: string; meta?: unknown } }
  | { type: 'error'; runId: string; error: IpcError };
