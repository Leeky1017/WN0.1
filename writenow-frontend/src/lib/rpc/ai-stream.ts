/**
 * AI stream subscription utilities (Theia JSON-RPC)
 * Why: AI streaming is delivered as backend->frontend notifications (`onStreamEvent`).
 */

import type { AiStreamEvent } from '@/types/theia-ai';

import { aiClient } from './ai-client';

export type AiStreamDeltaHandler = (text: string) => void;
export type AiStreamDoneHandler = (result: string) => void;
export type AiStreamErrorHandler = (error: Error) => void;

function toError(event: Extract<AiStreamEvent, { type: 'error' }>): Error {
  const err = new Error(event.error.message);
  err.name = event.error.code;
  return err;
}

/**
 * Subscribe to AI stream events for a run.
 *
 * Note: Callers must ensure the AI client is connected before subscribing.
 */
export function subscribeToAiStream(
  runId: string,
  onDelta: AiStreamDeltaHandler,
  onDone: AiStreamDoneHandler,
  onError: AiStreamErrorHandler,
): () => void {
  const normalizedRunId = runId.trim();
  if (!normalizedRunId) {
    throw new Error('runId is empty');
  }

  const unsubscribe = aiClient.onStreamEvent((event) => {
    if (event.runId !== normalizedRunId) return;
    if (event.type === 'delta') onDelta(event.text);
    if (event.type === 'done') onDone(event.result.text);
    if (event.type === 'error') onError(toError(event));
  });

  return unsubscribe;
}
