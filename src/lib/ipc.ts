import type {
  IpcChannel,
  IpcError as IpcErrorShape,
  IpcErrorCode,
  IpcInvokeDataMap,
  IpcInvokePayloadMap,
  IpcInvokeResponseMap,
} from '../types/ipc';

export class IpcError extends Error {
  code: IpcErrorCode;
  details?: unknown;
  retryable?: boolean;

  constructor(error: IpcErrorShape) {
    super(error.message);
    this.name = 'IpcError';
    this.code = error.code;
    this.details = error.details;
    this.retryable = error.retryable;
  }
}

function getWriteNowApi() {
  const api = window.writenow;
  if (!api) {
    throw new Error('WriteNow API is not available (are you running in Electron?)');
  }
  return api;
}

export async function invoke<T extends IpcChannel>(channel: T, payload: IpcInvokePayloadMap[T]): Promise<IpcInvokeDataMap[T]> {
  const response: IpcInvokeResponseMap[T] = await getWriteNowApi().invoke(channel, payload);
  if (!response.ok) {
    throw new IpcError(response.error);
  }
  return response.data;
}

export const fileOps = {
  list: () => invoke('file:list', {}),
  read: (path: string) => invoke('file:read', { path }),
  write: (path: string, content: string) => invoke('file:write', { path, content }),
  create: (name: string) => invoke('file:create', { name }),
  delete: (path: string) => invoke('file:delete', { path }),
};

