function createIpcError(code, message, details) {
  const error = new Error(message)
  error.ipcError = { code, message, details }
  return error
}

/**
 * registerLocalLlmIpcHandlers
 * Why: Keep `localLlm:*` IPC channels in the contract SSOT (`electron/ipc/*.cjs`) so type generation
 * can remain deterministic. Runtime implementations can be injected by the Electron main entrypoint.
 */
function registerLocalLlmIpcHandlers(ipcMain, options = {}) {
  const handleInvoke =
    typeof options.handleInvoke === 'function' ? options.handleInvoke : (channel, handler) => ipcMain.handle(channel, handler)

  const service = options.service ?? null

  function requireServiceMethod(name) {
    const fn = service && typeof service[name] === 'function' ? service[name].bind(service) : null
    if (fn) return fn
    return async () => {
      throw createIpcError('UNSUPPORTED', 'Local LLM service is not wired', { missing: name })
    }
  }

  handleInvoke('localLlm:model:list', async () => {
    return await requireServiceMethod('modelList')()
  })

  handleInvoke('localLlm:model:ensure', async (_evt, payload) => {
    return await requireServiceMethod('ensureModel')(payload)
  })

  handleInvoke('localLlm:model:remove', async (_evt, payload) => {
    return await requireServiceMethod('removeModel')(payload)
  })

  handleInvoke('localLlm:settings:get', async () => {
    return await requireServiceMethod('settingsGet')()
  })

  handleInvoke('localLlm:settings:update', async (_evt, payload) => {
    return await requireServiceMethod('settingsUpdate')(payload)
  })

  handleInvoke('localLlm:tab:complete', async (_evt, payload) => {
    return await requireServiceMethod('tabComplete')(payload)
  })

  handleInvoke('localLlm:tab:cancel', async (_evt, payload) => {
    return await requireServiceMethod('tabCancel')(payload)
  })
}

module.exports = { registerLocalLlmIpcHandlers }

