import type { PromptMessage } from '../../types/context';

export type TokenEstimatorKind = 'approx-v1';

export type TokenEstimate = {
  tokens: number;
  kind: TokenEstimatorKind;
};

export type TokenEstimator = {
  kind: TokenEstimatorKind;
  estimate: (text: string, model: string) => TokenEstimate;
  estimateMessage?: (message: PromptMessage, model: string) => TokenEstimate;
};

function clampTokens(tokens: number) {
  if (!Number.isFinite(tokens)) return 0;
  return Math.max(0, Math.floor(tokens));
}

function estimateTextTokensApproxV1(text: string): number {
  const raw = typeof text === 'string' ? text : '';
  const trimmed = raw.trim();
  if (!trimmed) return 0;

  let cjk = 0;
  for (const ch of trimmed) {
    const code = ch.charCodeAt(0);
    const isCjk = code >= 0x4e00 && code <= 0x9fff;
    if (isCjk) cjk += 1;
  }

  const nonCjk = Math.max(0, trimmed.length - cjk);
  const approx = cjk + Math.ceil(nonCjk / 3);
  return clampTokens(approx);
}

export function createDefaultTokenEstimator(): TokenEstimator {
  return {
    kind: 'approx-v1',
    estimate: (text: string) => ({ tokens: estimateTextTokensApproxV1(text), kind: 'approx-v1' }),
    estimateMessage: (message: PromptMessage) => {
      const roleOverhead = 4;
      const contentTokens = estimateTextTokensApproxV1(message.content);
      return { tokens: clampTokens(contentTokens + roleOverhead), kind: 'approx-v1' };
    },
  };
}

