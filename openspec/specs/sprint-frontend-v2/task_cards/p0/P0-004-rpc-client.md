# P0-004: 实现 RPC 客户端

## 元信息

| 字段 | 值 |
|------|-----|
| ID | P0-004 |
| Phase | 0 - 基础设施 |
| 优先级 | P0 |
| 状态 | Pending |
| 依赖 | P0-001 |

## 目标

实现 WebSocket JSON-RPC 客户端，能够连接 Theia 后端并进行类型安全的 RPC 调用。

## 任务清单

- [ ] 安装 `vscode-ws-jsonrpc` 依赖
- [ ] 复制 IPC 类型定义到前端（`src/types/ipc-generated.ts`）
- [ ] 实现 `lib/rpc/client.ts`（RPC 客户端核心）
- [ ] 实现 `lib/rpc/api.ts`（类型安全调用封装）
- [ ] 实现 `lib/rpc/ai-stream.ts`（AI 流式推送订阅）
- [ ] 创建 RPC 连接状态 Hook

## 验收标准

- [ ] 能够成功连接到 Theia 后端
- [ ] `invoke` 函数类型推导正确
- [ ] 连接断开时有重连机制

## 产出

- `src/lib/rpc/client.ts`
- `src/lib/rpc/api.ts`
- `src/lib/rpc/ai-stream.ts`
- `src/types/ipc-generated.ts`

## 技术细节

参考 `design/04-rpc-client.md` 中的完整实现。

### 连接管理 Hook

```typescript
// lib/hooks/useRpcConnection.ts
export function useRpcConnection() {
  const [status, setStatus] = useState<'connecting' | 'connected' | 'disconnected'>('connecting');
  
  useEffect(() => {
    const connect = async () => {
      try {
        await rpcClient.connect('ws://localhost:3000');
        setStatus('connected');
      } catch (error) {
        setStatus('disconnected');
        // 5 秒后重试
        setTimeout(connect, 5000);
      }
    };
    connect();
  }, []);
  
  return status;
}
```
