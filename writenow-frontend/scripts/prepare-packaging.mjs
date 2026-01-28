import { spawnSync } from 'node:child_process'
import { createHash } from 'node:crypto'
import fs from 'node:fs'
import path from 'node:path'
import { pipeline } from 'node:stream/promises'
import { Transform, Readable } from 'node:stream'
import { fileURLToPath } from 'node:url'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

const FRONTEND_ROOT = path.resolve(__dirname, '..')
const REPO_ROOT = path.resolve(FRONTEND_ROOT, '..')

function readJson(filePath) {
  const raw = fs.readFileSync(filePath, 'utf8')
  return JSON.parse(raw)
}

function run(command, args, options) {
  const res = spawnSync(command, args, {
    cwd: options?.cwd,
    env: options?.env ?? process.env,
    stdio: 'inherit',
    shell: process.platform === 'win32',
  })

  if (res.error) throw res.error
  if (typeof res.status === 'number' && res.status !== 0) {
    throw new Error(`Command failed: ${command} ${args.join(' ')} (exit=${res.status})`)
  }
}

function ensureDir(dirPath) {
  if (fs.existsSync(dirPath)) return
  fs.mkdirSync(dirPath, { recursive: true })
}

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
  return { entryPath, cwd: baseDir }
}

function ensureBackendSchemaSql(entryPath) {
  const destDir = path.dirname(entryPath)
  const destPath = path.join(destDir, 'schema.sql')
  if (fs.existsSync(destPath)) return

  const candidates = [
    path.join(REPO_ROOT, 'writenow-theia', 'writenow-core', 'src', 'node', 'database', 'schema.sql'),
    path.join(REPO_ROOT, 'writenow-theia', 'writenow-core', 'lib', 'node', 'database', 'schema.sql'),
  ]

  const sourcePath = candidates.find((candidate) => fs.existsSync(candidate))
  if (!sourcePath) {
    throw new Error(`Unable to locate schema.sql for packaging (tried: ${candidates.join(', ')})`)
  }

  fs.copyFileSync(sourcePath, destPath)
}

function resolveElectronVersion() {
  const candidates = [
    path.join(FRONTEND_ROOT, 'node_modules', 'electron', 'package.json'),
    path.join(FRONTEND_ROOT, 'node_modules', 'electron', 'dist', 'version'),
  ]

  for (const candidate of candidates) {
    if (!fs.existsSync(candidate)) continue
    try {
      if (candidate.endsWith('package.json')) {
        const parsed = readJson(candidate)
        const version = typeof parsed?.version === 'string' ? parsed.version.trim() : ''
        if (version) return version
      } else {
        const version = fs.readFileSync(candidate, 'utf8').trim()
        if (version) return version
      }
    } catch {
      // ignore
    }
  }

  throw new Error('Unable to resolve Electron version (expected writenow-frontend/node_modules/electron to be installed)')
}

async function sha256File(filePath) {
  const hash = createHash('sha256')
  const stream = fs.createReadStream(filePath)
  for await (const chunk of stream) hash.update(chunk)
  return hash.digest('hex')
}

async function downloadToPath({ url, destPath, expectedSha256, expectedSizeBytes }) {
  const tempPath = `${destPath}.part`
  ensureDir(path.dirname(destPath))

  try {
    if (fs.existsSync(tempPath)) fs.rmSync(tempPath, { force: true })
  } catch {
    // ignore
  }

  const res = await fetch(url)
  if (!res.ok || !res.body) {
    throw new Error(`Download failed (status=${res.status})`)
  }

  let receivedBytes = 0
  const progressStream = new Transform({
    transform(chunk, _encoding, callback) {
      receivedBytes += chunk.length
      callback(null, chunk)
    },
  })

  await pipeline(
    Readable.fromWeb(res.body),
    progressStream,
    fs.createWriteStream(tempPath),
  )

  if (typeof expectedSizeBytes === 'number') {
    const stat = fs.statSync(tempPath)
    if (stat.size !== expectedSizeBytes) {
      throw new Error(`Size mismatch (expected=${expectedSizeBytes}, actual=${stat.size})`)
    }
  }

  if (expectedSha256) {
    const actual = await sha256File(tempPath)
    if (actual.toLowerCase() !== expectedSha256.toLowerCase()) {
      throw new Error(`SHA256 mismatch (expected=${expectedSha256}, actual=${actual})`)
    }
  }

  try {
    if (fs.existsSync(destPath)) fs.rmSync(destPath, { force: true })
  } catch {
    // ignore
  }
  fs.renameSync(tempPath, destPath)
}

async function maybeBundleLocalLlmModel() {
  const enabled = (process.env.WN_BUNDLE_LOCAL_LLM_MODEL ?? '').trim() === '1'
  if (!enabled) return

  const modelId = (process.env.WN_BUNDLE_LOCAL_LLM_MODEL_ID ?? '').trim() || 'qwen2.5-0.5b-instruct-q4_k_m'

  const known = {
    'qwen2.5-0.5b-instruct-q4_k_m': {
      filename: 'Qwen2.5-0.5B-Instruct-Q4_K_M.gguf',
      url: 'https://huggingface.co/medmekk/Qwen2.5-0.5B-Instruct.GGUF/resolve/main/Qwen2.5-0.5B-Instruct-Q4_K_M.gguf?download=true',
      sizeBytes: 397_807_936,
      sha256: '750f8f144f0504208add7897f01c7d2350a7363d8855eab59e137a1041e90394',
    },
    'qwen2.5-0.5b-instruct-q2_k': {
      filename: 'Qwen2.5-0.5B-Instruct-Q2_K.gguf',
      url: 'https://huggingface.co/medmekk/Qwen2.5-0.5B-Instruct.GGUF/resolve/main/Qwen2.5-0.5B-Instruct-Q2_K.gguf?download=true',
      sizeBytes: 338_607_424,
      sha256: '0183050b0aa6a58c451fb558d3fdfa550c3dd6ba835561805778d30bdd79e44a',
    },
  }

  const descriptor = known[modelId]
  if (!descriptor) {
    throw new Error(
      `Unknown modelId=${modelId}. Supported: ${Object.keys(known).join(', ')} (set WN_BUNDLE_LOCAL_LLM_MODEL_ID)`,
    )
  }

  const modelsDir = path.join(FRONTEND_ROOT, 'resources', 'models')
  const destPath = path.join(modelsDir, descriptor.filename)

  if (fs.existsSync(destPath)) {
    const actual = await sha256File(destPath)
    if (actual.toLowerCase() === descriptor.sha256.toLowerCase()) return
    fs.rmSync(destPath, { force: true })
  }

  console.log(`[packaging] downloading bundled model ${modelId} → ${path.relative(FRONTEND_ROOT, destPath)}`)
  await downloadToPath({
    url: descriptor.url,
    destPath,
    expectedSha256: descriptor.sha256,
    expectedSizeBytes: descriptor.sizeBytes,
  })
}

async function main() {
  const resourcesDir = path.join(FRONTEND_ROOT, 'resources')
  ensureDir(resourcesDir)
  ensureDir(path.join(resourcesDir, 'models'))
  ensureDir(path.join(resourcesDir, 'licenses'))

  const electronVersion = resolveElectronVersion()

  if ((process.env.WN_SKIP_THEIA_BUILD ?? '').trim() !== '1') {
    console.log('[packaging] building Theia backend (browser-app)')
    run('npm', ['run', 'theia:build:browser'], { cwd: REPO_ROOT })
  }

  if ((process.env.WN_SKIP_ELECTRON_REBUILD ?? '').trim() !== '1') {
    console.log(`[packaging] electron-rebuild Theia native modules (electron=${electronVersion})`)
    run(
      'npx',
      [
        'electron-rebuild',
        '--version',
        electronVersion,
        '--module-dir',
        path.join(REPO_ROOT, 'writenow-theia'),
        '--which-module',
        'better-sqlite3,native-keymap,sqlite-vec',
        '--force',
      ],
      { cwd: FRONTEND_ROOT },
    )
  }

  const theiaBackendDir = path.join(REPO_ROOT, 'writenow-theia', 'browser-app')
  const { entryPath } = resolveBackendEntry(theiaBackendDir)
  ensureBackendSchemaSql(entryPath)

  await maybeBundleLocalLlmModel()
}

main().catch((error) => {
  const message = error instanceof Error ? error.message : String(error)
  console.error(`[packaging] failed: ${message}`)
  process.exit(1)
})

