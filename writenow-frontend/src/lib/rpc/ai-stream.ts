/**
 * AI Stream subscription utilities
 * @see design/04-rpc-client.md
 */

// TODO: Implement AI streaming when integrating AI panel
// This is a placeholder for the AI stream subscription

export type AiStreamDeltaHandler = (text: string) => void
export type AiStreamDoneHandler = (result: string) => void
export type AiStreamErrorHandler = (error: Error) => void

/**
 * Subscribe to AI stream events
 * @param runId - The AI run ID to subscribe to
 * @param onDelta - Called for each delta (partial response)
 * @param onDone - Called when streaming is complete
 * @param onError - Called on error
 * @returns Unsubscribe function
 */
export function subscribeToAiStream(
  runId: string,
  onDelta: AiStreamDeltaHandler,
  onDone: AiStreamDoneHandler,
  onError: AiStreamErrorHandler
): () => void {
  // TODO(P3): Implement actual subscription logic (backend notifications).
  // Why: Keep a typed placeholder so early phases can compile; real streaming is wired in Phase 3.
  void onDelta
  void onDone
  void onError

  console.log(`[AI Stream] Subscribing to run ${runId}`)
  
  // Return unsubscribe function
  return () => {
    console.log(`[AI Stream] Unsubscribing from run ${runId}`)
  }
}
