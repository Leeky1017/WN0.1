import type { AssembleResult } from './context';

export type ContextDebugState =
  | {
      status: 'assembling';
      assembled: null;
      errorMessage: null;
    }
  | {
      status: 'ready';
      assembled: AssembleResult;
      errorMessage: null;
    }
  | {
      status: 'error';
      assembled: AssembleResult | null;
      errorMessage: string;
    };

