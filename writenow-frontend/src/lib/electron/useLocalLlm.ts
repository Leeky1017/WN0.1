/**
 * useLocalLlm
 * Why: Provide a single, typed facade for Local LLM settings/model management via Electron IPC.
 */

import { useCallback, useEffect, useState } from 'react'

import type { ElectronAPI } from '@/types/electron-api'
import type {
  IpcResponse,
  LocalLlmModelDescriptor,
  LocalLlmModelEnsureRequest,
  LocalLlmModelEnsureResponse,
  LocalLlmModelListResponse,
  LocalLlmModelRemoveRequest,
  LocalLlmModelRemoveResponse,
  LocalLlmModelState,
  LocalLlmSettings,
  LocalLlmSettingsUpdateRequest,
  LocalLlmSettingsUpdateResponse,
} from '@/types/ipc-generated'

import { useElectronApi } from './useElectronApi'

function formatIpcError(res: IpcResponse<unknown>, fallback: string): string {
  if (res.ok) return ''
  const code = typeof res.error?.code === 'string' ? res.error.code : 'UNKNOWN'
  const message = typeof res.error?.message === 'string' && res.error.message ? res.error.message : fallback
  return `${code}: ${message}`
}

export interface UseLocalLlmResult {
  supported: boolean
  loading: boolean
  error: string | null

  models: LocalLlmModelDescriptor[]
  installedModelIds: string[]
  settings: LocalLlmSettings | null
  state: LocalLlmModelState | null

  refresh: () => Promise<void>
  updateSettings: (patch: LocalLlmSettingsUpdateRequest) => Promise<IpcResponse<LocalLlmSettingsUpdateResponse> | null>
  ensureModel: (payload: LocalLlmModelEnsureRequest) => Promise<IpcResponse<LocalLlmModelEnsureResponse> | null>
  removeModel: (payload: LocalLlmModelRemoveRequest) => Promise<IpcResponse<LocalLlmModelRemoveResponse> | null>
}

function getLocalLlmApi(api: ElectronAPI | null): ElectronAPI['localLlm'] | null {
  const localLlm = api?.localLlm
  if (!localLlm) return null
  if (!localLlm.modelList || !localLlm.ensureModel || !localLlm.settingsUpdate) return null
  return localLlm
}

export function useLocalLlm(): UseLocalLlmResult {
  const electronApi = useElectronApi()
  const localLlm = getLocalLlmApi(electronApi)

  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const [models, setModels] = useState<LocalLlmModelDescriptor[]>([])
  const [installedModelIds, setInstalledModelIds] = useState<string[]>([])
  const [settings, setSettings] = useState<LocalLlmSettings | null>(null)
  const [state, setState] = useState<LocalLlmModelState | null>(null)

  const supported = Boolean(localLlm)

  const applySnapshot = useCallback((snapshot: LocalLlmModelListResponse) => {
    setModels(snapshot.models)
    setInstalledModelIds(snapshot.installedModelIds)
    setSettings(snapshot.settings)
    setState(snapshot.state)
  }, [])

  const refresh = useCallback(async () => {
    if (!localLlm) return
    setLoading(true)
    setError(null)
    try {
      const res = await localLlm.modelList()
      if (!res.ok) {
        setError(formatIpcError(res, 'Failed to load local LLM models'))
        return
      }
      applySnapshot(res.data)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load local LLM models')
    } finally {
      setLoading(false)
    }
  }, [applySnapshot, localLlm])

  const updateSettings = useCallback(
    async (patch: LocalLlmSettingsUpdateRequest) => {
      if (!localLlm) return null
      setError(null)
      try {
        const res = await localLlm.settingsUpdate(patch)
        if (!res.ok) {
          setError(formatIpcError(res, 'Failed to update local LLM settings'))
          return res
        }
        setSettings(res.data.settings)
        return res
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to update local LLM settings')
        return null
      }
    },
    [localLlm],
  )

  const ensureModel = useCallback(
    async (payload: LocalLlmModelEnsureRequest) => {
      if (!localLlm) return null
      setError(null)
      try {
        const res = await localLlm.ensureModel(payload)
        if (!res.ok) {
          setError(formatIpcError(res, 'Failed to ensure local model'))
        }
        await refresh()
        return res
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to ensure local model')
        return null
      }
    },
    [localLlm, refresh],
  )

  const removeModel = useCallback(
    async (payload: LocalLlmModelRemoveRequest) => {
      if (!localLlm?.removeModel) return null
      setError(null)
      try {
        const res = await localLlm.removeModel(payload)
        if (!res.ok) {
          setError(formatIpcError(res, 'Failed to remove local model'))
        }
        await refresh()
        return res
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to remove local model')
        return null
      }
    },
    [localLlm, refresh],
  )

  useEffect(() => {
    void refresh()
  }, [refresh])

  useEffect(() => {
    if (!localLlm?.onStateChanged) return
    const unsubscribe = localLlm.onStateChanged((next) => setState(next))
    return () => unsubscribe()
  }, [localLlm])

  useEffect(() => {
    if (!localLlm?.onSettingsChanged) return
    const unsubscribe = localLlm.onSettingsChanged((next) => setSettings(next))
    return () => unsubscribe()
  }, [localLlm])

  return {
    supported,
    loading,
    error,
    models,
    installedModelIds,
    settings,
    state,
    refresh,
    updateSettings,
    ensureModel,
    removeModel,
  }
}

export default useLocalLlm

