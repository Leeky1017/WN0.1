/**
 * Type-safe RPC API wrapper
 */

import type {
  IpcChannel,
  IpcInvokePayloadMap,
  IpcInvokeDataMap,
  IpcError,
} from '@/types/ipc-generated'
import { rpcClient } from './client'

/**
 * Custom error class for RPC errors
 */
export class RpcError extends Error {
  public code: string
  public retryable?: boolean
  public details?: unknown

  constructor(code: string, message: string, retryable?: boolean, details?: unknown) {
    super(message)
    this.name = 'RpcError'
    this.code = code
    this.retryable = retryable
    this.details = details
  }

  static fromIpcError(error: IpcError): RpcError {
    return new RpcError(error.code, error.message, error.retryable, error.details)
  }
}

/**
 * Type-safe RPC invoke function
 * Throws RpcError on failure
 * @param channel - IPC channel name
 * @param payload - Request payload (type-checked)
 * @returns Response data (type-checked)
 */
export async function invoke<T extends IpcChannel>(
  channel: T,
  payload: IpcInvokePayloadMap[T]
): Promise<IpcInvokeDataMap[T]> {
  const response = await rpcClient.invoke<IpcInvokeDataMap[T]>(channel, payload)
  
  if (!response.ok) {
    throw RpcError.fromIpcError(response.error)
  }
  
  return response.data
}

/**
 * Safe RPC invoke that returns result or null on error
 * Does not throw, useful for optional data fetching
 * @param channel - IPC channel name
 * @param payload - Request payload
 * @returns Response data or null
 */
export async function invokeSafe<T extends IpcChannel>(
  channel: T,
  payload: IpcInvokePayloadMap[T]
): Promise<IpcInvokeDataMap[T] | null> {
  try {
    return await invoke(channel, payload)
  } catch (error) {
    console.error(`[RPC] Safe invoke failed for ${channel}:`, error)
    return null
  }
}
