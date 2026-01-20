import type { IpcChannel, IpcInvokePayloadMap, IpcInvokeResponseMap } from './ipc';

declare global {
  interface Window {
    writenow: {
      invoke<T extends IpcChannel>(channel: T, payload: IpcInvokePayloadMap[T]): Promise<IpcInvokeResponseMap[T]>;

      on(event: string, callback: (...args: unknown[]) => void): void;
      off(event: string, callback: (...args: unknown[]) => void): void;

      minimize?: () => void;
      maximize?: () => void;
      close?: () => void;

      send?: (channel: string, payload?: unknown) => void;
      platform?: string;
    };
  }
}

export {};

