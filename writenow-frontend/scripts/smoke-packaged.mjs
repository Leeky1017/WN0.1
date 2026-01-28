import { spawn } from 'node:child_process'
import fs from 'node:fs'
import os from 'node:os'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

const FRONTEND_ROOT = path.resolve(__dirname, '..')
const FALLBACK_PRODUCT_NAME = 'WriteNow'

function resolveBackendEntry(baseDir) {
  const candidates = [
    path.join(baseDir, 'lib', 'backend', 'main.js'),
    path.join(baseDir, 'lib', 'backend', 'main.cjs'),
    path.join(baseDir, 'src-gen', 'backend', 'main.js'),
    path.join(baseDir, 'backend', 'main.js'),
    path.join(baseDir, 'main.js'),
  ]
  const entryPath = candidates.find((candidate) => fs.existsSync(candidate))
  if (!entryPath) {
    throw new Error(`Unable to locate Theia backend entry under ${baseDir} (tried: ${candidates.join(', ')})`)
  }
  return entryPath
}

function findLatestUnpackedDir(outputDir) {
  if (!fs.existsSync(outputDir)) return null
  const entries = fs.readdirSync(outputDir, { withFileTypes: true })
  const candidates = entries
    .filter((e) => e.isDirectory() && (e.name.endsWith('-unpacked') || e.name === 'mac'))
    .map((e) => path.join(outputDir, e.name))

  if (candidates.length === 0) return null
  candidates.sort((a, b) => fs.statSync(b).mtimeMs - fs.statSync(a).mtimeMs)
  return candidates[0]
}

function resolveResourcesDir(appDir) {
  const direct = path.join(appDir, 'resources')
  if (fs.existsSync(direct)) return direct

  // mac: <dir>/<App>.app/Contents/Resources
  const entries = fs.readdirSync(appDir, { withFileTypes: true })
  const app = entries.find((e) => e.isDirectory() && e.name.endsWith('.app'))
  if (app) {
    const resources = path.join(appDir, app.name, 'Contents', 'Resources')
    if (fs.existsSync(resources)) return resources
  }

  // or appDir itself is .app
  if (appDir.endsWith('.app')) {
    const resources = path.join(appDir, 'Contents', 'Resources')
    if (fs.existsSync(resources)) return resources
  }

  throw new Error(`Unable to locate resources directory under ${appDir}`)
}

function resolveExecutable(appDir, preferredNames) {
  // mac
  if (process.platform === 'darwin') {
    const macApp = appDir.endsWith('.app')
      ? appDir
      : (() => {
          const entries = fs.readdirSync(appDir, { withFileTypes: true })
          const found = entries.find((e) => e.isDirectory() && e.name.endsWith('.app'))
          return found ? path.join(appDir, found.name) : ''
        })()
    if (!macApp) throw new Error(`Unable to locate .app bundle under ${appDir}`)
    const macosDir = path.join(macApp, 'Contents', 'MacOS')
    const entries = fs.readdirSync(macosDir, { withFileTypes: true })
    const exe = entries.find((e) => e.isFile())
    if (!exe) throw new Error(`Unable to locate macOS executable under ${macosDir}`)
    return path.join(macosDir, exe.name)
  }

  // windows
  if (process.platform === 'win32') {
    const entries = fs.readdirSync(appDir, { withFileTypes: true })
    const exe = entries.find((e) => e.isFile() && e.name.toLowerCase().endsWith('.exe'))
    if (!exe) throw new Error(`Unable to locate .exe under ${appDir}`)
    return path.join(appDir, exe.name)
  }

  // linux
  const entries = fs.readdirSync(appDir, { withFileTypes: true })
  const ignored = new Set(['chrome-sandbox', 'chrome_crashpad_handler'])
  const executables = entries
    .filter((e) => e.isFile() && !e.name.includes('.') && !ignored.has(e.name))
    .map((e) => path.join(appDir, e.name))
    .filter((p) => {
      try {
        const mode = fs.statSync(p).mode
        return (mode & 0o111) !== 0
      } catch {
        return false
      }
    })

  const preferredLower = (Array.isArray(preferredNames) ? preferredNames : [])
    .map((name) => (typeof name === 'string' ? name.trim().toLowerCase() : ''))
    .filter(Boolean)
  const preferred = executables.find((p) => preferredLower.includes(path.basename(p).toLowerCase()))
  return preferred ?? executables[0] ?? ''
}

function readTextSafe(filePath) {
  try {
    return fs.readFileSync(filePath, 'utf8')
  } catch {
    return ''
  }
}

function tailText(text, maxChars) {
  if (!text) return ''
  if (text.length <= maxChars) return text
  return text.slice(-maxChars)
}

async function waitFor(check, timeoutMs, intervalMs) {
  const deadline = Date.now() + timeoutMs
  while (true) {
    if (await check()) return
    if (Date.now() > deadline) throw new Error(`Timeout after ${timeoutMs}ms`)
    await new Promise((resolve) => setTimeout(resolve, intervalMs))
  }
}

async function launchAndWaitReady(appDir, preferredNames) {
  const exePath = resolveExecutable(appDir, preferredNames)
  if (!exePath) throw new Error(`Unable to resolve executable under ${appDir}`)

  const userDataDir = fs.mkdtempSync(path.join(os.tmpdir(), 'writenow-packaging-smoke-'))
  const tmpDir = path.join(userDataDir, 'tmp')
  const runtimeDir = path.join(userDataDir, 'runtime')
  fs.mkdirSync(tmpDir, { recursive: true })
  fs.mkdirSync(runtimeDir, { recursive: true })
  const env = {
    ...process.env,
    WN_E2E: '1',
    WN_DISABLE_GPU: '1',
    WN_OPEN_DEVTOOLS: '0',
    WN_USER_DATA_DIR: userDataDir,
    // Why: Some CI/WSL environments have restricted /tmp; keep Chromium temp usage under the isolated userData.
    TMPDIR: tmpDir,
    TMP: tmpDir,
    TEMP: tmpDir,
    XDG_RUNTIME_DIR: runtimeDir,
  }

  const child = spawn(exePath, [], { cwd: appDir, env, stdio: ['ignore', 'pipe', 'pipe'] })
  const logPath = path.join(userDataDir, 'logs', 'main.log')
  console.log(`[packaging-smoke] launching ${exePath}`)
  console.log(`[packaging-smoke] userData: ${userDataDir}`)

  let stdoutTail = ''
  let stderrTail = ''
  child.stdout?.on('data', (chunk) => {
    stdoutTail = tailText(`${stdoutTail}${chunk.toString()}`, 4000)
  })
  child.stderr?.on('data', (chunk) => {
    stderrTail = tailText(`${stderrTail}${chunk.toString()}`, 4000)
  })

  let exitInfo = null
  child.once('exit', (code, signal) => {
    exitInfo = { code, signal }
  })

  try {
    await waitFor(
      () => {
        if (exitInfo) {
          const text = readTextSafe(logPath)
          const hint = text ? `\n--- main.log tail ---\n${tailText(text, 4000)}` : ''
          throw new Error(`App exited early (code=${exitInfo.code ?? 'null'} signal=${exitInfo.signal ?? 'null'})${hint}`)
        }
        if (!fs.existsSync(logPath)) return false
        const text = readTextSafe(logPath)
        if (text.includes('[renderer] render-process-gone')) {
          throw new Error('Renderer crashed during launch')
        }
        if (text.includes('[renderer] did-fail-load')) {
          throw new Error('Renderer failed to load during launch')
        }
        if (text.includes('[main] failed to start')) {
          throw new Error('Main process failed to start during launch')
        }
        return text.includes('[backend] ready') && text.includes('[renderer] did-finish-load')
      },
      60_000,
      250,
    )
  } catch (error) {
    const text = readTextSafe(logPath)
    const hint = text ? `\n--- main.log tail ---\n${tailText(text, 4000)}` : ''
    const message = error instanceof Error ? error.message : String(error)
    const outHint = stdoutTail ? `\n--- app stdout tail ---\n${stdoutTail}` : ''
    const errHint = stderrTail ? `\n--- app stderr tail ---\n${stderrTail}` : ''
    throw new Error(`${message}${hint}${outHint}${errHint}`)
  } finally {
    try {
      child.kill('SIGTERM')
    } catch {
      // ignore
    }

    try {
      await waitFor(() => child.exitCode !== null, 8_000, 200)
    } catch {
      try {
        child.kill('SIGKILL')
      } catch {
        // ignore
      }
    }
  }
}

async function main() {
  const pkg = JSON.parse(fs.readFileSync(path.join(FRONTEND_ROOT, 'package.json'), 'utf8'))
  const version = pkg.version ?? '0.0.0'
  const preferredExeNames = [pkg.name ?? '', FALLBACK_PRODUCT_NAME].filter(Boolean)
  const outputDir = (process.env.WN_PACKAGING_OUTPUT_DIR ?? '').trim() || path.join(FRONTEND_ROOT, 'release', version)

  const unpackedDir = (process.env.WN_PACKAGED_APP_DIR ?? '').trim() || findLatestUnpackedDir(outputDir)
  if (!unpackedDir) {
    throw new Error(
      `Unable to find unpacked output under ${outputDir}. Run: npm run package -- --dir (or set WN_PACKAGED_APP_DIR)`,
    )
  }

  const resourcesDir = resolveResourcesDir(unpackedDir)
  const asarPath = path.join(resourcesDir, 'app.asar')
  const theiaDir = path.join(resourcesDir, 'theia-backend')
  const licensesPath = path.join(resourcesDir, 'licenses', 'THIRD_PARTY_ASSETS.md')
  const modelsDir = path.join(resourcesDir, 'models')

  if (!fs.existsSync(asarPath)) throw new Error(`Missing app.asar: ${asarPath}`)
  if (!fs.existsSync(theiaDir)) throw new Error(`Missing theia-backend: ${theiaDir}`)
  if (!fs.existsSync(licensesPath)) throw new Error(`Missing licenses manifest: ${licensesPath}`)
  if (!fs.existsSync(modelsDir)) throw new Error(`Missing models dir: ${modelsDir}`)

  const betterSqlite3Dir = path.join(theiaDir, 'node_modules', 'better-sqlite3')
  if (!fs.existsSync(betterSqlite3Dir)) {
    throw new Error(`Missing better-sqlite3 in theia-backend node_modules: ${betterSqlite3Dir}`)
  }

  const backendEntry = resolveBackendEntry(theiaDir)
  const schemaPath = path.join(path.dirname(backendEntry), 'schema.sql')
  if (!fs.existsSync(schemaPath)) throw new Error(`Missing schema.sql next to backend entry: ${schemaPath}`)

  // Optional: launch check (needs a GUI environment on Linux CI).
  if ((process.env.WN_SMOKE_LAUNCH ?? '').trim() === '1') {
    await launchAndWaitReady(unpackedDir, preferredExeNames)
  }
}

main().catch((error) => {
  const message = error instanceof Error ? error.message : String(error)
  console.error(`[packaging-smoke] failed: ${message}`)
  process.exit(1)
})

