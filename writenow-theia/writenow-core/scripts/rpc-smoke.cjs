/* eslint-disable no-console */

const assert = require('node:assert/strict');
const os = require('node:os');
const path = require('node:path');
const fs = require('node:fs/promises');

const { ForwardingChannel, ChannelMultiplexer } = require('@theia/core/lib/common/message-rpc/channel');
const { Uint8ArrayReadBuffer, Uint8ArrayWriteBuffer } = require('@theia/core/lib/common/message-rpc/uint8-array-message-buffer');
const { RpcProxyFactory } = require('@theia/core/lib/common/messaging/proxy-factory');

const { WritenowBackendService } = require('../lib/node/writenow-backend-service');
const { WritenowSqliteDb } = require('../lib/node/database/writenow-sqlite-db');
const { VectorStore } = require('../lib/node/rag/vector-store');
const { ProjectsService } = require('../lib/node/services/projects-service');
const { FilesService } = require('../lib/node/services/files-service');
const { IndexService } = require('../lib/node/services/index-service');
const { RetrievalService } = require('../lib/node/services/retrieval-service');
const { SearchService } = require('../lib/node/services/search-service');
const { VersionService } = require('../lib/node/services/version-service');
const { WRITENOW_RPC_PATH } = require('../lib/common/writenow-protocol');

class ChannelPipe {
  constructor() {
    this.left = new ForwardingChannel(
      'left',
      () => this.right.onCloseEmitter.fire({ reason: 'Left channel has been closed' }),
      () => {
        const leftWrite = new Uint8ArrayWriteBuffer();
        leftWrite.onCommit((buffer) => {
          this.right.onMessageEmitter.fire(() => new Uint8ArrayReadBuffer(buffer));
        });
        return leftWrite;
      }
    );

    this.right = new ForwardingChannel(
      'right',
      () => this.left.onCloseEmitter.fire({ reason: 'Right channel has been closed' }),
      () => {
        const rightWrite = new Uint8ArrayWriteBuffer();
        rightWrite.onCommit((buffer) => {
          this.left.onMessageEmitter.fire(() => new Uint8ArrayReadBuffer(buffer));
        });
        return rightWrite;
      }
    );
  }
}

function createLogger() {
  return {
    error: (message) => console.error(message),
    warn: (message) => console.warn(message),
    info: (message) => console.info(message),
    debug: (_message) => undefined,
  };
}

async function main() {
  process.env.WN_E2E = '1';
  const dataDir = await fs.mkdtemp(path.join(os.tmpdir(), 'writenow-theia-rpc-smoke-'));

  const logger = createLogger();
  const sqliteDb = new WritenowSqliteDb(logger, dataDir);
  const vectorStore = new VectorStore(logger, sqliteDb);
  const indexService = new IndexService(logger, sqliteDb, vectorStore);
  const searchService = new SearchService(logger, sqliteDb);
  const backend = new WritenowBackendService(
    logger,
    sqliteDb,
    new ProjectsService(logger, sqliteDb),
    new FilesService(logger, dataDir, sqliteDb, indexService),
    new VersionService(logger, sqliteDb),
    indexService,
    new RetrievalService(logger, sqliteDb, indexService, vectorStore),
    searchService,
  );

  const pipe = new ChannelPipe();
  const clientMultiplexer = new ChannelMultiplexer(pipe.left);
  const serverMultiplexer = new ChannelMultiplexer(pipe.right);

  const serverFactory = new RpcProxyFactory(backend);
  serverMultiplexer.onDidOpenChannel(({ id, channel }) => {
    if (id === WRITENOW_RPC_PATH) {
      serverFactory.listen(channel);
    }
  });

  const rpcChannel = await clientMultiplexer.open(WRITENOW_RPC_PATH);
  const clientFactory = new RpcProxyFactory();
  clientFactory.listen(rpcChannel);
  const proxy = clientFactory.createProxy();

  // --- DB init verification ---
  const dbPath = path.join(dataDir, 'data', 'writenow.db');
  await fs.access(dbPath);
  const schemaRow = sqliteDb.db.prepare('SELECT value FROM settings WHERE key = ?').get('schema_version');
  assert.ok(schemaRow && typeof schemaRow.value === 'string');
  assert.equal(Number.parseInt(schemaRow.value, 10), 7);
  const tableNames = sqliteDb.db
    .prepare("SELECT name FROM sqlite_master WHERE type='table' OR type='virtual_table' ORDER BY name")
    .all()
    .map((row) => row.name)
    .filter(Boolean);
  for (const required of ['articles', 'articles_fts', 'projects', 'article_snapshots', 'article_chunks', 'entity_cards', 'settings']) {
    assert.ok(tableNames.includes(required), `missing table: ${required}`);
  }

  // --- projects CRUD ---
  const bootstrap = await proxy.invoke('project:bootstrap', {});
  assert.equal(bootstrap.ok, true);
  assert.ok(bootstrap.data.currentProjectId);

  const createdProject = await proxy.invoke('project:create', { name: 'RPC Smoke Project' });
  assert.equal(createdProject.ok, true);
  assert.ok(createdProject.data.project.id);

  const projects = await proxy.invoke('project:list', {});
  assert.equal(projects.ok, true);
  assert.ok(projects.data.projects.length >= 1);

  const updatedProject = await proxy.invoke('project:update', { id: createdProject.data.project.id, description: 'updated' });
  assert.equal(updatedProject.ok, true);

  // Keep the default project; delete the newly created one.
  const deletedProject = await proxy.invoke('project:delete', { id: createdProject.data.project.id });
  assert.equal(deletedProject.ok, true);

  const created = await proxy.invoke('file:create', { name: 'RPC Smoke' });
  assert.equal(created.ok, true);
  assert.ok(created.data.path.endsWith('.md'));

  const contentA = '# RPC Smoke\n\nHello from rpc-smoke.';
  const write = await proxy.invoke('file:write', { path: created.data.path, content: contentA });
  assert.equal(write.ok, true);

  const read = await proxy.invoke('file:read', { path: created.data.path });
  assert.equal(read.ok, true);
  assert.equal(read.data.content, contentA);

  // --- version history verification ---
  const snap1 = await proxy.invoke('version:create', { articleId: created.data.path, content: contentA, name: 'v1', actor: 'user' });
  assert.equal(snap1.ok, true);
  assert.ok(snap1.data.snapshotId);

  const contentB = '# RPC Smoke\n\nHello v2.';
  await proxy.invoke('file:write', { path: created.data.path, content: contentB });
  const snap2 = await proxy.invoke('version:create', { articleId: created.data.path, content: contentB, name: 'v2', actor: 'user' });
  assert.equal(snap2.ok, true);
  assert.ok(snap2.data.snapshotId);

  const versions = await proxy.invoke('version:list', { articleId: created.data.path, limit: 10 });
  assert.equal(versions.ok, true);
  assert.ok(versions.data.items.length >= 2);

  const diff = await proxy.invoke('version:diff', { fromSnapshotId: snap1.data.snapshotId, toSnapshotId: snap2.data.snapshotId });
  assert.equal(diff.ok, true);
  assert.ok(diff.data.diff.includes('-Hello from rpc-smoke.') || diff.data.diff.includes('+Hello v2.'));

  const restored = await proxy.invoke('version:restore', { snapshotId: snap1.data.snapshotId });
  assert.equal(restored.ok, true);
  assert.equal(restored.data.content, contentA);

  // --- rag indexing + retrieval verification ---
  const card = await proxy.invoke('file:create', { name: 'Entity Card' });
  assert.equal(card.ok, true);

  const cardContent = `---\ntype: character\nname: Alice\naliases:\n  - 小爱\n---\n\n# Alice\n\nAlice is a test character.\n`;
  const cardWrite = await proxy.invoke('file:write', { path: card.data.path, content: cardContent });
  assert.equal(cardWrite.ok, true);

  const storyWithEntity = `# RPC Smoke\n\nAlice appears in this story.\n`;
  const storyWrite = await proxy.invoke('file:write', { path: created.data.path, content: storyWithEntity });
  assert.equal(storyWrite.ok, true);

  const fulltext = await proxy.invoke('search:fulltext', { query: 'Alice', limit: 10 });
  assert.equal(fulltext.ok, true);
  assert.ok(fulltext.data.items.length >= 1, 'expected fulltext hits');

  const semantic = await proxy.invoke('search:semantic', { query: 'Alice', limit: 10 });
  assert.equal(semantic.ok, false);
  assert.equal(semantic.error.code, 'MODEL_NOT_READY');

  const rag = await proxy.invoke('rag:retrieve', { queryText: '@Alice', budget: { maxChars: 1500, maxChunks: 6 } });
  assert.equal(rag.ok, true);
  assert.ok(rag.data.passages.length > 0, 'expected at least one passage');
  assert.ok(rag.data.characters.some((c) => c.name === 'Alice'), 'expected Alice in recalled characters');

  const chunkCount = sqliteDb.db.prepare('SELECT COUNT(*) AS total FROM article_chunks WHERE article_id = ?').get(created.data.path);
  assert.ok(Number(chunkCount.total) >= 1, 'expected chunk rows for main article');
  const entityCount = sqliteDb.db.prepare('SELECT COUNT(*) AS total FROM entity_cards WHERE id = ?').get('character:Alice');
  assert.ok(Number(entityCount.total) === 1, 'expected entity card row for Alice');

  // --- sqlite-vec verification (native module smoke against app DB) ---
  const { load: loadSqliteVec } = require('sqlite-vec');
  loadSqliteVec(sqliteDb.db);
  sqliteDb.db.exec(`
      CREATE VIRTUAL TABLE IF NOT EXISTS writenow_core_embeddings
      USING vec0(embedding float[3])
  `);
  const vector = '[0.1, 0.2, 0.3]';
  sqliteDb.db.prepare('INSERT INTO writenow_core_embeddings (embedding) VALUES (vec_f32(?))').run(vector);
  const vecHits = sqliteDb.db
    .prepare(
      `SELECT rowid, distance
       FROM writenow_core_embeddings
       WHERE embedding MATCH vec_f32(?)
       ORDER BY distance
       LIMIT 1`
    )
    .all(vector);
  assert.ok(Array.isArray(vecHits) && vecHits.length >= 1, 'expected vec query results');

  const invalidRead = await proxy.invoke('file:read', { path: '../escape.md' });
  assert.equal(invalidRead.ok, false);
  assert.equal(invalidRead.error.code, 'INVALID_ARGUMENT');

  // --- persistence verification (simulate restart) ---
  const sqliteDb2 = new WritenowSqliteDb(logger, dataDir);
  sqliteDb2.ensureReady();
  const projectsAfter = sqliteDb2.db.prepare('SELECT COUNT(*) AS total FROM projects').get();
  assert.ok(Number(projectsAfter.total) >= 1);

  console.info('[rpc-smoke] ok', {
    dataDir,
    dbPath,
    projectId: bootstrap.data.currentProjectId,
    file: created.data.path,
    rag: { passages: rag.data.passages.length, characters: rag.data.characters.length, vecHits: vecHits.length },
    snapshots: [snap1.data.snapshotId, snap2.data.snapshotId],
  });
}

main().catch((error) => {
  console.error('[rpc-smoke] failed', error);
  process.exitCode = 1;
});
