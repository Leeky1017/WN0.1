declare global {
  interface Window {
    __WN_PERF__?: {
      measures: Record<string, number>;
    };
  }
}

export {};
