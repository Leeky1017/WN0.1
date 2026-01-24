/* eslint-disable no-console */

console.info('[rpc-smoke] starting');

const assert = require('node:assert/strict');
const os = require('node:os');
const path = require('node:path');
const fs = require('node:fs/promises');

console.info('[rpc-smoke] require: theia rpc channel');
const { ForwardingChannel, ChannelMultiplexer } = require('@theia/core/lib/common/message-rpc/channel');
const { Uint8ArrayReadBuffer, Uint8ArrayWriteBuffer } = require('@theia/core/lib/common/message-rpc/uint8-array-message-buffer');
const { RpcProxyFactory } = require('@theia/core/lib/common/messaging/proxy-factory');

console.info('[rpc-smoke] require: writenow-backend-service');
const { WritenowBackendService } = require('../lib/node/writenow-backend-service');
console.info('[rpc-smoke] require: writenow-sqlite-db');
const { WritenowSqliteDb } = require('../lib/node/database/writenow-sqlite-db');
console.info('[rpc-smoke] require: vector-store');
const { VectorStore } = require('../lib/node/rag/vector-store');
console.info('[rpc-smoke] require: embedding-service');
const { EmbeddingServiceImpl } = require('../lib/node/embedding/embedding-service');
console.info('[rpc-smoke] require: projects-service');
const { ProjectsService } = require('../lib/node/services/projects-service');
console.info('[rpc-smoke] require: knowledge-graph-service');
const { KnowledgeGraphService } = require('../lib/node/services/knowledge-graph-service');
console.info('[rpc-smoke] require: files-service');
const { FilesService } = require('../lib/node/services/files-service');
console.info('[rpc-smoke] require: embedding-rpc-service');
const { EmbeddingRpcService } = require('../lib/node/services/embedding-rpc-service');
console.info('[rpc-smoke] require: index-service');
const { IndexService } = require('../lib/node/services/index-service');
console.info('[rpc-smoke] require: retrieval-service');
const { RetrievalService } = require('../lib/node/services/retrieval-service');
console.info('[rpc-smoke] require: search-service');
const { SearchService } = require('../lib/node/services/search-service');
console.info('[rpc-smoke] require: version-service');
const { VersionService } = require('../lib/node/services/version-service');
console.info('[rpc-smoke] require: context-service');
const { ContextService } = require('../lib/node/services/context-service');
console.info('[rpc-smoke] require: writenow-protocol');
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

function cosineSimilarity(a, b) {
  assert.ok(Array.isArray(a) && Array.isArray(b), 'vectors must be arrays');
  assert.equal(a.length, b.length, 'vector length mismatch');
  let dot = 0;
  let normA = 0;
  let normB = 0;
  for (let i = 0; i < a.length; i += 1) {
    const va = Number(a[i]) || 0;
    const vb = Number(b[i]) || 0;
    dot += va * vb;
    normA += va * va;
    normB += vb * vb;
  }
  const denom = Math.sqrt(normA) * Math.sqrt(normB);
  return denom > 0 ? dot / denom : 0;
}

async function main() {
  process.env.WN_E2E = '1';
  process.env.WN_EMBEDDING_ALLOW_REMOTE = '1';
  const dataDir = await fs.mkdtemp(path.join(os.tmpdir(), 'writenow-theia-rpc-smoke-'));

  const logger = createLogger();
  const sqliteDb = new WritenowSqliteDb(logger, dataDir);
  const vectorStore = new VectorStore(logger, sqliteDb);
  const embeddingService = new EmbeddingServiceImpl(logger, dataDir);
  const indexService = new IndexService(logger, sqliteDb, embeddingService, vectorStore);
  const searchService = new SearchService(logger, sqliteDb, embeddingService, vectorStore);
  const embeddingRpcService = new EmbeddingRpcService(logger, embeddingService, vectorStore);
  const contextService = new ContextService(logger, dataDir);
  const knowledgeGraphService = new KnowledgeGraphService(logger, sqliteDb);
  const backend = new WritenowBackendService(
    logger,
    sqliteDb,
    new ProjectsService(logger, sqliteDb),
    knowledgeGraphService,
    new FilesService(logger, dataDir, sqliteDb, indexService),
    new VersionService(logger, sqliteDb),
    indexService,
    embeddingRpcService,
    new RetrievalService(logger, sqliteDb, embeddingService, indexService, vectorStore),
    searchService,
    contextService,
  );

  try {
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

    // --- knowledge graph CRUD ---
    const kgEntity1 = await proxy.invoke('kg:entity:create', { projectId: bootstrap.data.currentProjectId, type: 'Character', name: 'Alice' });
    assert.equal(kgEntity1.ok, true);
    assert.ok(kgEntity1.data.entity.id);

    const kgEntity2 = await proxy.invoke('kg:entity:create', { projectId: bootstrap.data.currentProjectId, type: 'Character', name: 'Bob' });
    assert.equal(kgEntity2.ok, true);
    assert.ok(kgEntity2.data.entity.id);

    const kgEntityUpdate = await proxy.invoke('kg:entity:update', {
      projectId: bootstrap.data.currentProjectId,
      id: kgEntity1.data.entity.id,
      description: 'Friend of Bob',
    });
    assert.equal(kgEntityUpdate.ok, true);
    assert.equal(kgEntityUpdate.data.entity.description, 'Friend of Bob');

    const kgRelation = await proxy.invoke('kg:relation:create', {
      projectId: bootstrap.data.currentProjectId,
      fromEntityId: kgEntity1.data.entity.id,
      toEntityId: kgEntity2.data.entity.id,
      type: 'knows',
    });
    assert.equal(kgRelation.ok, true);
    assert.ok(kgRelation.data.relation.id);

    const kgRelationUpdate = await proxy.invoke('kg:relation:update', {
      projectId: bootstrap.data.currentProjectId,
      id: kgRelation.data.relation.id,
      type: 'trusts',
    });
    assert.equal(kgRelationUpdate.ok, true);
    assert.equal(kgRelationUpdate.data.relation.type, 'trusts');

    const kgGraph = await proxy.invoke('kg:graph:get', { projectId: bootstrap.data.currentProjectId });
    assert.equal(kgGraph.ok, true);
    assert.ok(Array.isArray(kgGraph.data.entities) && kgGraph.data.entities.length >= 2);
    assert.ok(Array.isArray(kgGraph.data.relations) && kgGraph.data.relations.length >= 1);

    const kgRelationDelete = await proxy.invoke('kg:relation:delete', { projectId: bootstrap.data.currentProjectId, id: kgRelation.data.relation.id });
    assert.equal(kgRelationDelete.ok, true);

    const kgEntityDelete = await proxy.invoke('kg:entity:delete', { projectId: bootstrap.data.currentProjectId, id: kgEntity2.data.entity.id });
    assert.equal(kgEntityDelete.ok, true);
    console.info('[rpc-smoke] knowledge graph: ok');

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

    // --- embedding:encode verification (model download + dimension + similarity) ---
    const modelCacheDir = process.env.WN_MODEL_CACHE_DIR || path.join(dataDir, 'models');
    const modelRoot = path.join(modelCacheDir, 'shibing624', 'text2vec-base-chinese');
    const embedTexts = ['那是 个快乐的人', '那是 个非常幸福的人', '今天是晴天'];
    const startedAt = Date.now();
    const embed = await proxy.invoke('embedding:encode', { texts: embedTexts, model: 'text2vec-base-chinese' });
    const embedMs = Date.now() - startedAt;
    assert.equal(embed.ok, true);
    assert.equal(embed.data.model, 'text2vec-base-chinese');
    assert.equal(embed.data.dimension, 768);
    assert.equal(embed.data.vectors.length, embedTexts.length);
    for (const vec of embed.data.vectors) {
      assert.ok(Array.isArray(vec));
      assert.equal(vec.length, 768);
    }

    const sim01 = cosineSimilarity(embed.data.vectors[0], embed.data.vectors[1]);
    const sim02 = cosineSimilarity(embed.data.vectors[0], embed.data.vectors[2]);
    assert.ok(sim01 > sim02, 'expected similar sentences to be closer than unrelated');
    assert.ok(sim01 > 0.4, `expected similarity to be reasonably high (got ${sim01})`);

    await fs.access(path.join(modelRoot, 'config.json'));
    await fs.access(path.join(modelRoot, 'tokenizer.json'));
    const onnxDir = path.join(modelRoot, 'onnx');
    const onnxCandidates = ['model_O4.onnx', 'model_qint8_avx512_vnni.onnx', 'model.onnx'];
    let onnxSelected = null;
    for (const candidate of onnxCandidates) {
      try {
        await fs.access(path.join(onnxDir, candidate));
        onnxSelected = candidate;
        break;
      } catch {
        // ignore
      }
    }
    assert.ok(onnxSelected, 'expected at least one ONNX model file in cache');
    console.info('[rpc-smoke] embedding ok', { ms: embedMs, dim: embed.data.dimension, sim01, sim02, modelCacheDir, onnxSelected });

    // --- rag indexing + retrieval verification (semantic enabled) ---
    const card = await proxy.invoke('file:create', { name: 'Entity Card' });
    assert.equal(card.ok, true);

    const cardContent = `---\ntype: character\nname: Alice\naliases:\n  - 小爱\n---\n\n# Alice\n\nAlice is a test character.\n`;
    const cardWrite = await proxy.invoke('file:write', { path: card.data.path, content: cardContent });
    assert.equal(cardWrite.ok, true);

    const storyWithEntity = `# RPC Smoke\n\nAlice appears in this story.\n`;
    const storyWrite = await proxy.invoke('file:write', { path: created.data.path, content: storyWithEntity });
    assert.equal(storyWrite.ok, true);

    // Flush the indexer deterministically in E2E mode before semantic assertions.
    const rag = await proxy.invoke('rag:retrieve', { queryText: '@Alice', budget: { maxChars: 1500, maxChunks: 6 } });
    assert.equal(rag.ok, true);
    assert.ok(rag.data.passages.length > 0, 'expected at least one passage');
    assert.ok(rag.data.characters.some((c) => c.name === 'Alice'), 'expected Alice in recalled characters');

    const fulltext = await proxy.invoke('search:fulltext', { query: 'Alice', limit: 10 });
    assert.equal(fulltext.ok, true);
    assert.ok(fulltext.data.items.length >= 1, 'expected fulltext hits');

    const semantic = await proxy.invoke('search:semantic', { query: 'Alice', limit: 10 });
    assert.equal(semantic.ok, true);
    assert.ok(semantic.data.items.some((hit) => hit.id === created.data.path), 'expected semantic hits to include the story');

    const chunkCount = sqliteDb.db.prepare('SELECT COUNT(*) AS total FROM article_chunks WHERE article_id = ?').get(created.data.path);
    assert.ok(Number(chunkCount.total) >= 1, 'expected chunk rows for main article');
    const entityCount = sqliteDb.db.prepare('SELECT COUNT(*) AS total FROM entity_cards WHERE id = ?').get('character:Alice');
    assert.ok(Number(entityCount.total) === 1, 'expected entity card row for Alice');

    const chunkVecCount = sqliteDb.db.prepare('SELECT COUNT(*) AS total FROM article_chunks_vec WHERE article_id = ?').get(created.data.path);
    assert.ok(Number(chunkVecCount.total) >= 1, 'expected chunk vec rows for main article');

    // --- semantic-only rag:retrieve backtest (force keyword recall to skip via invalid FTS syntax) ---
    const semanticStory = await proxy.invoke('file:create', { name: 'Semantic Story' });
    assert.equal(semanticStory.ok, true);
    const semanticStoryContent = `# Semantic Story\n\n那是 个非常幸福的人。\n`;
    const semanticStoryWrite = await proxy.invoke('file:write', { path: semanticStory.data.path, content: semanticStoryContent });
    assert.equal(semanticStoryWrite.ok, true);

    const ragSemanticOnly = await proxy.invoke('rag:retrieve', { queryText: '\"那是 个快乐的人', budget: { maxChars: 1200, maxChunks: 6 } });
    assert.equal(ragSemanticOnly.ok, true);
    assert.ok(ragSemanticOnly.data.passages.length > 0, 'expected semantic-only passages');
    assert.ok(
      ragSemanticOnly.data.passages.some((p) => p.articleId === semanticStory.data.path),
      'expected semantic story to be recalled in passages'
    );
    assert.ok(
      ragSemanticOnly.data.passages.some((p) => typeof p.score === 'number' && p.score > 0.35),
      'expected at least one semantic passage score (keyword score is fixed at 0.35)'
    );

    const semanticStoryVecCount = sqliteDb.db.prepare('SELECT COUNT(*) AS total FROM article_chunks_vec WHERE article_id = ?').get(semanticStory.data.path);
    assert.ok(Number(semanticStoryVecCount.total) >= 1, 'expected chunk vec rows for semantic story');

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

    // --- embedding timeout verification ---
    process.env.WN_EMBEDDING_TIMEOUT_MS = '10000';
    process.env.WN_E2E_EMBEDDING_DELAY_MS = '11000';
    const timed = await proxy.invoke('embedding:encode', { texts: ['timeout test'], model: 'text2vec-base-chinese' });
    assert.equal(timed.ok, false);
    assert.equal(timed.error.code, 'TIMEOUT');
    delete process.env.WN_E2E_EMBEDDING_DELAY_MS;
    delete process.env.WN_EMBEDDING_TIMEOUT_MS;

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
      semanticOnly: { passages: ragSemanticOnly.data.passages.length },
      snapshots: [snap1.data.snapshotId, snap2.data.snapshotId],
    });
  } finally {
    await embeddingService.close();
  }
}

main().catch((error) => {
  console.error('[rpc-smoke] failed', error);
  process.exitCode = 1;
});
