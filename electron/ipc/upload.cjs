/**
 * Upload IPC handlers.
 * Implements upload:image channel for handling image uploads.
 */

const { randomUUID } = require('node:crypto')
const fs = require('node:fs')
const path = require('node:path')

function createIpcError(code, message, details) {
  const error = new Error(message)
  error.ipcError = { code, message, details }
  return error
}

/**
 * Supported image MIME types and their extensions.
 */
const SUPPORTED_IMAGE_TYPES = Object.freeze({
  'image/jpeg': '.jpg',
  'image/png': '.png',
  'image/gif': '.gif',
  'image/webp': '.webp',
})

/**
 * Maximum file size for image uploads (5MB).
 */
const MAX_IMAGE_SIZE = 5 * 1024 * 1024

/**
 * Validates image data.
 * @param {object} payload - The upload payload
 * @returns {object} - Validated data with type and buffer
 */
function validateImageData(payload) {
  const mimeType = typeof payload?.mimeType === 'string' ? payload.mimeType.toLowerCase() : ''
  if (!SUPPORTED_IMAGE_TYPES[mimeType]) {
    throw createIpcError('INVALID_ARGUMENT', 'Unsupported image type', { mimeType, supported: Object.keys(SUPPORTED_IMAGE_TYPES) })
  }

  const data = payload?.data
  if (!data) {
    throw createIpcError('INVALID_ARGUMENT', 'Image data is required')
  }

  // Handle base64 encoded data
  let buffer
  if (typeof data === 'string') {
    // Remove data URL prefix if present
    const base64Data = data.replace(/^data:image\/\w+;base64,/, '')
    try {
      buffer = Buffer.from(base64Data, 'base64')
    } catch (error) {
      throw createIpcError('INVALID_ARGUMENT', 'Invalid base64 image data', { message: error?.message })
    }
  } else if (Buffer.isBuffer(data)) {
    buffer = data
  } else if (data instanceof Uint8Array) {
    buffer = Buffer.from(data)
  } else {
    throw createIpcError('INVALID_ARGUMENT', 'Image data must be base64 string or buffer')
  }

  if (buffer.length > MAX_IMAGE_SIZE) {
    throw createIpcError('INVALID_ARGUMENT', 'Image file too large', { maxSize: MAX_IMAGE_SIZE, actualSize: buffer.length })
  }

  if (buffer.length === 0) {
    throw createIpcError('INVALID_ARGUMENT', 'Image data is empty')
  }

  return { mimeType, buffer, extension: SUPPORTED_IMAGE_TYPES[mimeType] }
}

/**
 * Gets or creates the uploads directory.
 * @param {string} userDataPath - The app's user data directory
 * @returns {string} - Path to the uploads directory
 */
function ensureUploadsDir(userDataPath) {
  const uploadsDir = path.join(userDataPath, 'uploads', 'images')
  if (!fs.existsSync(uploadsDir)) {
    fs.mkdirSync(uploadsDir, { recursive: true })
  }
  return uploadsDir
}

/**
 * Generates a unique filename for an uploaded image.
 * @param {string} extension - The file extension
 * @returns {string} - The generated filename
 */
function generateImageFilename(extension) {
  const timestamp = Date.now()
  const uuid = randomUUID().slice(0, 8)
  return `${timestamp}-${uuid}${extension}`
}

function registerUploadIpcHandlers(ipcMain, options = {}) {
  const userDataPath = options.userDataPath ?? null
  const logger = options.logger ?? null
  const handleInvoke =
    typeof options.handleInvoke === 'function' ? options.handleInvoke : (channel, handler) => ipcMain.handle(channel, handler)

  handleInvoke('upload:image', async (_evt, payload) => {
    if (!userDataPath) {
      throw createIpcError('INTERNAL', 'User data path is not configured')
    }

    const { mimeType, buffer, extension } = validateImageData(payload)

    try {
      const uploadsDir = ensureUploadsDir(userDataPath)
      const filename = generateImageFilename(extension)
      const filePath = path.join(uploadsDir, filename)

      fs.writeFileSync(filePath, buffer)

      // Return a local file URL that can be used in the app
      const localUrl = `file://${filePath}`
      // Also return a relative path for storage in DB
      const relativePath = path.join('uploads', 'images', filename)

      logger?.info?.('upload', 'image uploaded', { filename, size: buffer.length, mimeType })

      return {
        url: localUrl,
        path: relativePath,
        filename,
        mimeType,
        size: buffer.length,
      }
    } catch (error) {
      if (error?.ipcError?.code) throw error
      logger?.error?.('upload', 'image upload failed', { message: error?.message })
      throw createIpcError('IO_ERROR', 'Failed to save uploaded image', { message: error?.message })
    }
  })
}

module.exports = { registerUploadIpcHandlers }
