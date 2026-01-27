/* eslint-disable no-console */
/**
 * Why: E2E-ish smoke for injected refs + prompt hashes without real AI.
 * We validate:
 * - injected.refs rejects absolute paths (INVALID_ARGUMENT)
 * - injected.refs is normalized (trim/dedupe/sort) and echoed in start response
 * - stablePrefixHash/promptHash are returned on start
 *
 * Notes:
 * - Uses real SQLite persistence (WritenowSqliteDb).
 * - Uses a dummy AI key + unreachable base URL; we cancel immediately after start.
 */
 
const assert = require('node:assert/strict')
const os = require('node:os')
const path = require('node:path')
const fs = require('node:fs/promises')
 
function createLogger() {
  return {
    error: (message) => console.error(message),
    warn: (message) => console.warn(message),
    info: (message) => console.info(message),
    debug: () => undefined,
  }
}
 
async function main() {
  process.env.WN_E2E = '1'
  process.env.WN_AI_API_KEY = 'dummy'
  process.env.WN_AI_BASE_URL = 'http://127.0.0.1:9'
  process.env.WN_AI_TIMEOUT_MS = '200'
 
  const { WritenowSqliteDb } = require('../lib/node/database/writenow-sqlite-db')
  const { AiService } = require('../lib/node/services/ai-service')
 
  const dataDir = await fs.mkdtemp(path.join(os.tmpdir(), 'writenow-theia-ai-refs-'))
  const logger = createLogger()
  const sqliteDb = new WritenowSqliteDb(logger, dataDir)
  sqliteDb.ensureReady()
 
  const now = new Date().toISOString()
  sqliteDb.db
    .prepare(
      `INSERT INTO skills (id, name, user_prompt_template, system_prompt, enabled, is_valid, created_at, updated_at)
       VALUES (?, ?, ?, ?, 1, 1, ?, ?)`,
    )
    .run('test:skill', 'Test Skill', 'U', 'S', now, now)
 
  const events = []
  const ai = new AiService(logger, sqliteDb)
  ai.setClient({
    onStreamEvent: (event) => {
      events.push(event)
    },
  })
 
  const invalid = await ai.streamResponse({
    skillId: 'test:skill',
    input: { text: 'Hello', language: 'zh-CN' },
    stream: true,
    prompt: { systemPrompt: 'SYS', userContent: 'USER' },
    injected: { memory: [], refs: ['/abs/path'], contextRules: { surrounding: 0 } },
  })
  assert.equal(invalid.ok, false)
  if (!invalid.ok) {
    assert.equal(invalid.error.code, 'INVALID_ARGUMENT')
    assert.match(invalid.error.message, /project-relative/i)
  }
 
  const ok = await ai.streamResponse({
    skillId: 'test:skill',
    input: { text: 'Hello', language: 'zh-CN' },
    stream: true,
    prompt: { systemPrompt: 'SYS', userContent: 'USER' },
    injected: {
      memory: [],
      refs: ['.writenow/rules/style.md', ' .writenow/rules/style.md ', '.writenow/characters/b.md', '.writenow/characters/a.md'],
      contextRules: { surrounding: 0 },
    },
  })
  assert.equal(ok.ok, true)
  if (ok.ok) {
    assert.ok(ok.data.prompt && ok.data.prompt.stablePrefixHash && ok.data.prompt.promptHash)
    assert.ok(ok.data.injected && ok.data.injected.contextRules)
    assert.equal(ok.data.injected.contextRules.surrounding, 0)
    assert.deepEqual(ok.data.injected.refs, [
      '.writenow/characters/a.md',
      '.writenow/characters/b.md',
      '.writenow/rules/style.md',
    ])
    await ai.cancel({ runId: ok.data.runId })
  }
 
  // Best-effort: allow async cleanup events to flush.
  await new Promise((r) => setTimeout(r, 50))
 
  console.info('[ai-injected-refs-smoke] ok', { events: events.length })
}
 
main().catch((error) => {
  console.error('[ai-injected-refs-smoke] failed', error)
  process.exit(1)
})

