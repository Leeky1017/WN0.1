import type { IJudge } from './types';

import { CodeJudge } from './code-judge';
import { LlmJudge } from './llm-judge';

export type CreateJudgeOptions = {
  enableL2: boolean;
  timeoutMs?: number;
};

export function createJudge(options: CreateJudgeOptions): IJudge {
  const codeJudge = new CodeJudge();
  if (!options.enableL2) return codeJudge;
  return new LlmJudge({ codeJudge, timeoutMs: options.timeoutMs });
}
