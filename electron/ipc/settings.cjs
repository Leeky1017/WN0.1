/**
 * User Settings IPC handlers.
 * Implements settings:get/update channels with a standardized UserSettings schema.
 */

function createIpcError(code, message, details) {
  const error = new Error(message)
  error.ipcError = { code, message, details }
  return error
}

function toBooleanOrUndefined(value) {
  if (typeof value === 'boolean') return value
  return undefined
}

function toNumberOrUndefined(value, min, max) {
  if (typeof value !== 'number' || !Number.isFinite(value)) return undefined
  const clamped = Math.max(min, Math.min(max, value))
  return clamped
}

/**
 * Default UserSettings schema.
 * These are the default values for all settings.
 */
const DEFAULT_USER_SETTINGS = Object.freeze({
  writing: {
    focusMode: false,
    typewriterScroll: false,
    smartPunctuation: true,
    autoPairBrackets: true,
  },
  data: {
    autoSaveEnabled: true,
    autoSaveInterval: 30, // seconds
    backupEnabled: true,
    backupInterval: 300, // seconds (5 minutes)
  },
  appearance: {
    theme: 'dark',
    fontFamily: 'Inter',
    fontSize: 16,
    uiScale: 100,
  },
  export: {
    defaultFormat: 'docx',
    includeMetadata: true,
  },
})

/**
 * Config keys for UserSettings.
 */
const SETTINGS_KEYS = Object.freeze({
  // Writing
  'writing.focusMode': 'userSettings.writing.focusMode',
  'writing.typewriterScroll': 'userSettings.writing.typewriterScroll',
  'writing.smartPunctuation': 'userSettings.writing.smartPunctuation',
  'writing.autoPairBrackets': 'userSettings.writing.autoPairBrackets',
  // Data
  'data.autoSaveEnabled': 'userSettings.data.autoSaveEnabled',
  'data.autoSaveInterval': 'userSettings.data.autoSaveInterval',
  'data.backupEnabled': 'userSettings.data.backupEnabled',
  'data.backupInterval': 'userSettings.data.backupInterval',
  // Appearance
  'appearance.theme': 'userSettings.appearance.theme',
  'appearance.fontFamily': 'userSettings.appearance.fontFamily',
  'appearance.fontSize': 'userSettings.appearance.fontSize',
  'appearance.uiScale': 'userSettings.appearance.uiScale',
  // Export
  'export.defaultFormat': 'userSettings.export.defaultFormat',
  'export.includeMetadata': 'userSettings.export.includeMetadata',
})

/**
 * Normalizes a theme value.
 * @param {unknown} value - The value to normalize
 * @returns {string} - 'dark', 'light', or 'system'
 */
function normalizeTheme(value) {
  const raw = typeof value === 'string' ? value.trim().toLowerCase() : ''
  if (raw === 'light' || raw === 'system') return raw
  return 'dark'
}

/**
 * Normalizes an export format value.
 * @param {unknown} value - The value to normalize
 * @returns {string} - 'docx', 'pdf', or 'markdown'
 */
function normalizeExportFormat(value) {
  const raw = typeof value === 'string' ? value.trim().toLowerCase() : ''
  if (raw === 'pdf' || raw === 'markdown') return raw
  return 'docx'
}

/**
 * Reads all UserSettings from config.
 * @param {object} config - The electron-store config instance
 * @returns {object} - The UserSettings object
 */
function readUserSettings(config) {
  if (!config || typeof config.get !== 'function') {
    return { ...DEFAULT_USER_SETTINGS }
  }

  return {
    writing: {
      focusMode: config.get(SETTINGS_KEYS['writing.focusMode']) ?? DEFAULT_USER_SETTINGS.writing.focusMode,
      typewriterScroll: config.get(SETTINGS_KEYS['writing.typewriterScroll']) ?? DEFAULT_USER_SETTINGS.writing.typewriterScroll,
      smartPunctuation: config.get(SETTINGS_KEYS['writing.smartPunctuation']) ?? DEFAULT_USER_SETTINGS.writing.smartPunctuation,
      autoPairBrackets: config.get(SETTINGS_KEYS['writing.autoPairBrackets']) ?? DEFAULT_USER_SETTINGS.writing.autoPairBrackets,
    },
    data: {
      autoSaveEnabled: config.get(SETTINGS_KEYS['data.autoSaveEnabled']) ?? DEFAULT_USER_SETTINGS.data.autoSaveEnabled,
      autoSaveInterval: config.get(SETTINGS_KEYS['data.autoSaveInterval']) ?? DEFAULT_USER_SETTINGS.data.autoSaveInterval,
      backupEnabled: config.get(SETTINGS_KEYS['data.backupEnabled']) ?? DEFAULT_USER_SETTINGS.data.backupEnabled,
      backupInterval: config.get(SETTINGS_KEYS['data.backupInterval']) ?? DEFAULT_USER_SETTINGS.data.backupInterval,
    },
    appearance: {
      theme: normalizeTheme(config.get(SETTINGS_KEYS['appearance.theme'])),
      fontFamily: config.get(SETTINGS_KEYS['appearance.fontFamily']) ?? DEFAULT_USER_SETTINGS.appearance.fontFamily,
      fontSize: config.get(SETTINGS_KEYS['appearance.fontSize']) ?? DEFAULT_USER_SETTINGS.appearance.fontSize,
      uiScale: config.get(SETTINGS_KEYS['appearance.uiScale']) ?? DEFAULT_USER_SETTINGS.appearance.uiScale,
    },
    export: {
      defaultFormat: normalizeExportFormat(config.get(SETTINGS_KEYS['export.defaultFormat'])),
      includeMetadata: config.get(SETTINGS_KEYS['export.includeMetadata']) ?? DEFAULT_USER_SETTINGS.export.includeMetadata,
    },
  }
}

/**
 * Writes UserSettings updates to config.
 * @param {object} config - The electron-store config instance
 * @param {object} patch - The partial settings to update
 * @returns {object} - The updated UserSettings object
 */
function writeUserSettings(config, patch) {
  if (!config || typeof config.set !== 'function') {
    throw createIpcError('INTERNAL', 'Config is not available')
  }

  // Apply writing updates
  if (patch?.writing) {
    const w = patch.writing
    const focusMode = toBooleanOrUndefined(w.focusMode)
    const typewriterScroll = toBooleanOrUndefined(w.typewriterScroll)
    const smartPunctuation = toBooleanOrUndefined(w.smartPunctuation)
    const autoPairBrackets = toBooleanOrUndefined(w.autoPairBrackets)

    if (focusMode !== undefined) config.set(SETTINGS_KEYS['writing.focusMode'], focusMode)
    if (typewriterScroll !== undefined) config.set(SETTINGS_KEYS['writing.typewriterScroll'], typewriterScroll)
    if (smartPunctuation !== undefined) config.set(SETTINGS_KEYS['writing.smartPunctuation'], smartPunctuation)
    if (autoPairBrackets !== undefined) config.set(SETTINGS_KEYS['writing.autoPairBrackets'], autoPairBrackets)
  }

  // Apply data updates
  if (patch?.data) {
    const d = patch.data
    const autoSaveEnabled = toBooleanOrUndefined(d.autoSaveEnabled)
    const autoSaveInterval = toNumberOrUndefined(d.autoSaveInterval, 5, 300)
    const backupEnabled = toBooleanOrUndefined(d.backupEnabled)
    const backupInterval = toNumberOrUndefined(d.backupInterval, 60, 3600)

    if (autoSaveEnabled !== undefined) config.set(SETTINGS_KEYS['data.autoSaveEnabled'], autoSaveEnabled)
    if (autoSaveInterval !== undefined) config.set(SETTINGS_KEYS['data.autoSaveInterval'], autoSaveInterval)
    if (backupEnabled !== undefined) config.set(SETTINGS_KEYS['data.backupEnabled'], backupEnabled)
    if (backupInterval !== undefined) config.set(SETTINGS_KEYS['data.backupInterval'], backupInterval)
  }

  // Apply appearance updates
  if (patch?.appearance) {
    const a = patch.appearance
    if (typeof a.theme === 'string') config.set(SETTINGS_KEYS['appearance.theme'], normalizeTheme(a.theme))
    if (typeof a.fontFamily === 'string' && a.fontFamily.trim()) config.set(SETTINGS_KEYS['appearance.fontFamily'], a.fontFamily.trim())
    const fontSize = toNumberOrUndefined(a.fontSize, 10, 32)
    if (fontSize !== undefined) config.set(SETTINGS_KEYS['appearance.fontSize'], fontSize)
    const uiScale = toNumberOrUndefined(a.uiScale, 50, 200)
    if (uiScale !== undefined) config.set(SETTINGS_KEYS['appearance.uiScale'], uiScale)
  }

  // Apply export updates
  if (patch?.export) {
    const e = patch.export
    if (typeof e.defaultFormat === 'string') config.set(SETTINGS_KEYS['export.defaultFormat'], normalizeExportFormat(e.defaultFormat))
    const includeMetadata = toBooleanOrUndefined(e.includeMetadata)
    if (includeMetadata !== undefined) config.set(SETTINGS_KEYS['export.includeMetadata'], includeMetadata)
  }

  return readUserSettings(config)
}

function registerSettingsIpcHandlers(ipcMain, options = {}) {
  const config = options.config ?? null
  const handleInvoke =
    typeof options.handleInvoke === 'function' ? options.handleInvoke : (channel, handler) => ipcMain.handle(channel, handler)

  handleInvoke('settings:get', async () => {
    const settings = readUserSettings(config)
    return { settings }
  })

  handleInvoke('settings:update', async (_evt, payload) => {
    const settings = writeUserSettings(config, payload)
    return { settings }
  })
}

module.exports = { registerSettingsIpcHandlers, DEFAULT_USER_SETTINGS }
