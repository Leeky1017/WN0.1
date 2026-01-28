/**
 * useAiProxySettings
 * Why: Provide a typed hook for AI Proxy settings (LiteLLM) via RPC.
 */

import { useCallback, useEffect, useState } from 'react'

import type {
  AiProxySettings,
  AiProxySettingsUpdateRequest,
  AiProxyTestResponse,
} from '@/types/ipc-generated'

import { invoke, RpcError } from './api'

export interface UseAiProxySettingsResult {
  loading: boolean
  error: string | null
  settings: AiProxySettings | null

  refresh: () => Promise<void>
  updateSettings: (patch: AiProxySettingsUpdateRequest) => Promise<boolean>
  testConnection: (baseUrl: string, apiKey?: string) => Promise<AiProxyTestResponse>
}

export function useAiProxySettings(): UseAiProxySettingsResult {
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [settings, setSettings] = useState<AiProxySettings | null>(null)

  const refresh = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const response = await invoke('ai:proxy:settings:get', {})
      setSettings(response.settings)
    } catch (err) {
      const message = err instanceof RpcError ? `${err.code}: ${err.message}` : '加载设置失败'
      setError(message)
    } finally {
      setLoading(false)
    }
  }, [])

  const updateSettings = useCallback(
    async (patch: AiProxySettingsUpdateRequest): Promise<boolean> => {
      setError(null)
      try {
        const response = await invoke('ai:proxy:settings:update', patch)
        setSettings(response.settings)
        return true
      } catch (err) {
        const message = err instanceof RpcError ? `${err.code}: ${err.message}` : '更新设置失败'
        setError(message)
        return false
      }
    },
    [],
  )

  const testConnection = useCallback(
    async (baseUrl: string, apiKey?: string): Promise<AiProxyTestResponse> => {
      try {
        return await invoke('ai:proxy:test', { baseUrl, apiKey })
      } catch (err) {
        const message = err instanceof RpcError ? err.message : '测试连接失败'
        return { success: false, message }
      }
    },
    [],
  )

  useEffect(() => {
    void refresh()
  }, [refresh])

  return {
    loading,
    error,
    settings,
    refresh,
    updateSettings,
    testConnection,
  }
}

export default useAiProxySettings
