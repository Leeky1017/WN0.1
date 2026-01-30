/**
 * Share IPC handlers.
 * Implements share:create/list/revoke/get channels.
 *
 * NOTE: This is a placeholder implementation.
 * Full sharing functionality requires cloud services and will be
 * implemented in a future iteration.
 */

function createIpcError(code, message, details) {
  const error = new Error(message)
  error.ipcError = { code, message, details }
  return error
}

function registerShareIpcHandlers(ipcMain, options = {}) {
  const logger = options.logger ?? null
  const handleInvoke =
    typeof options.handleInvoke === 'function' ? options.handleInvoke : (channel, handler) => ipcMain.handle(channel, handler)

  /**
   * Create a share link.
   * Placeholder: Not implemented in local mode.
   */
  handleInvoke('share:create', async (_evt, payload) => {
    const projectId = typeof payload?.projectId === 'string' ? payload.projectId : 'unknown'
    logger?.info?.('share', 'create share link (not implemented)', { projectId })

    throw createIpcError('UNSUPPORTED', 'Sharing is not yet implemented. This feature requires cloud services.', { projectId })
  })

  /**
   * List share links for a project.
   * Placeholder: Returns empty list in local mode.
   */
  handleInvoke('share:list', async (_evt, payload) => {
    const projectId = typeof payload?.projectId === 'string' ? payload.projectId : null
    logger?.info?.('share', 'list share links (not implemented)', { projectId })

    // Return empty list since sharing is not implemented
    return { shares: [] }
  })

  /**
   * Revoke a share link.
   * Placeholder: Not implemented in local mode.
   */
  handleInvoke('share:revoke', async (_evt, payload) => {
    const shareId = typeof payload?.shareId === 'string' ? payload.shareId : 'unknown'
    logger?.info?.('share', 'revoke share link (not implemented)', { shareId })

    throw createIpcError('UNSUPPORTED', 'Sharing is not yet implemented. This feature requires cloud services.', { shareId })
  })

  /**
   * Get shared content by token.
   * Placeholder: Not implemented in local mode.
   */
  handleInvoke('share:get', async (_evt, payload) => {
    const token = typeof payload?.token === 'string' ? payload.token : 'unknown'
    logger?.info?.('share', 'get shared content (not implemented)', { token })

    throw createIpcError('UNSUPPORTED', 'Sharing is not yet implemented. This feature requires cloud services.', { token })
  })
}

module.exports = { registerShareIpcHandlers }
