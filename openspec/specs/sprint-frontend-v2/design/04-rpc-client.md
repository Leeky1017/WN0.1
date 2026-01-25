# RPC 客户端设计

## 客户端实现

```typescript
// lib/rpc/client.ts
import { listen, MessageConnection } from 'vscode-ws-jsonrpc';

class RpcClient {
  private connection: MessageConnection | null = null;

  async connect(url: string): Promise<void> {
    const socket = new WebSocket(url);
    return new Promise((resolve) => {
      listen({
        webSocket: socket,
        onConnection: (connection) => {
          this.connection = connection;
          connection.listen();
          resolve();
        },
      });
    });
  }

  async invoke<T>(channel: string, payload: unknown): Promise<T> {
    if (!this.connection) throw new Error('Not connected');
    return this.connection.sendRequest('invoke', [channel, payload]);
  }
}

export const rpcClient = new RpcClient();
```

## 类型安全调用

```typescript
// lib/rpc/api.ts
import type { IpcChannel, IpcInvokePayloadMap, IpcInvokeDataMap } from '@/types/ipc-generated';
import { rpcClient } from './client';

export async function invoke<T extends IpcChannel>(
  channel: T,
  payload: IpcInvokePayloadMap[T]
): Promise<IpcInvokeDataMap[T]> {
  const response = await rpcClient.invoke(channel, payload);
  if (!response.ok) {
    throw new Error(response.error.message);
  }
  return response.data;
}

// 使用示例
const project = await invoke('project:bootstrap', {});
const file = await invoke('file:read', { path: '/article.md' });
```

## AI 流式推送

```typescript
// lib/rpc/ai-stream.ts
export function subscribeToAiStream(
  runId: string,
  onDelta: (text: string) => void,
  onDone: (result: string) => void,
  onError: (error: Error) => void
): () => void {
  // 订阅后端推送的 onStreamEvent
  const unsubscribe = aiConnection.onNotification('onStreamEvent', (event) => {
    if (event.runId !== runId) return;
    if (event.type === 'delta') onDelta(event.text);
    if (event.type === 'done') onDone(event.result.text);
    if (event.type === 'error') onError(new Error(event.error.message));
  });
  return unsubscribe;
}
```

## 错误处理

```typescript
// lib/rpc/errors.ts
export class RpcError extends Error {
  constructor(
    public code: string,
    message: string
  ) {
    super(message);
    this.name = 'RpcError';
  }
}

// 使用 TanStack Query 封装
export function useInvoke<T extends IpcChannel>(
  channel: T,
  payload: IpcInvokePayloadMap[T]
) {
  return useQuery({
    queryKey: [channel, payload],
    queryFn: () => invoke(channel, payload),
    retry: (failureCount, error) => {
      // 超时/网络错误可重试，业务错误不重试
      if (error instanceof RpcError) return false;
      return failureCount < 3;
    },
  });
}
```
