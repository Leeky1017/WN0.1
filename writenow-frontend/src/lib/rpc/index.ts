/**
 * RPC module barrel export
 */

export { rpcClient, type RpcConnectionStatus, type RpcConnectionListener } from './client'
export { invoke, invokeSafe, RpcError } from './api'
export { subscribeToAiStream } from './ai-stream'
export {
  connectionManager,
  type ConnectionStatus,
  type ConnectionStatusListener,
  type ConnectionStatusDetails,
  type ConnectionManagerOptions,
} from './connection-manager'