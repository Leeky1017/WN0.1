/**
 * Authentication IPC handlers.
 * Implements auth:login/register/logout/session channels.
 *
 * NOTE: This is a placeholder implementation for local single-user mode.
 * Full authentication will be implemented in a future iteration when
 * cloud services are introduced.
 */

function createIpcError(code, message, details) {
  const error = new Error(message)
  error.ipcError = { code, message, details }
  return error
}

function toIsoNow() {
  return new Date().toISOString()
}

/**
 * Local user for single-user mode.
 * In local mode, this user is always "logged in".
 */
const LOCAL_USER = Object.freeze({
  id: 'local-user',
  email: 'local@writenow.app',
  name: 'Local User',
  role: 'pro', // Local mode gets pro features
  createdAt: '2024-01-01T00:00:00.000Z',
  updatedAt: '2024-01-01T00:00:00.000Z',
})

/**
 * Session state for local mode.
 * Always returns authenticated.
 */
const LOCAL_SESSION = Object.freeze({
  authenticated: true,
  user: LOCAL_USER,
  mode: 'local',
})

function registerAuthIpcHandlers(ipcMain, options = {}) {
  const logger = options.logger ?? null
  const handleInvoke =
    typeof options.handleInvoke === 'function' ? options.handleInvoke : (channel, handler) => ipcMain.handle(channel, handler)

  /**
   * Get current session.
   * In local mode, always returns authenticated with local user.
   */
  handleInvoke('auth:session', async () => {
    return { session: LOCAL_SESSION }
  })

  /**
   * Login.
   * In local mode, this is a no-op that returns the local user.
   * Future: Will validate credentials against auth server.
   */
  handleInvoke('auth:login', async (_evt, payload) => {
    logger?.info?.('auth', 'login attempt (local mode)', { email: payload?.email })

    // In local mode, any login succeeds and returns local user
    return {
      token: 'local-token',
      refreshToken: 'local-refresh-token',
      user: LOCAL_USER,
    }
  })

  /**
   * Register.
   * In local mode, this is a no-op.
   * Future: Will create account on auth server.
   */
  handleInvoke('auth:register', async (_evt, payload) => {
    logger?.info?.('auth', 'register attempt (local mode)', { email: payload?.email, name: payload?.name })

    // In local mode, registration always succeeds
    return { ok: true }
  })

  /**
   * Logout.
   * In local mode, this is a no-op.
   * Future: Will invalidate tokens on auth server.
   */
  handleInvoke('auth:logout', async () => {
    logger?.info?.('auth', 'logout (local mode)')

    // In local mode, logout is a no-op
    return { ok: true }
  })

  /**
   * OAuth initialization (placeholder).
   * Future: Will return OAuth redirect URL.
   */
  handleInvoke('auth:oauth:init', async (_evt, payload) => {
    const provider = typeof payload?.provider === 'string' ? payload.provider : 'unknown'
    logger?.info?.('auth', 'oauth init (not implemented)', { provider })

    throw createIpcError('UNSUPPORTED', 'OAuth authentication is not yet implemented', { provider })
  })
}

module.exports = { registerAuthIpcHandlers, LOCAL_USER, LOCAL_SESSION }
