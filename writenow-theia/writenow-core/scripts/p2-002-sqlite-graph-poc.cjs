/* eslint-disable no-console */

/**
 * SQLite 图模拟 PoC for P2-002 (Graphiti evaluation).
 *
 * Why:
 * - Sprint `sprint-open-source-opt` 要求在引入 Graphiti/Neo4j 等重依赖前，先用现有 SQLite KG 表验证
 *   “关系检索 / 时序事实 / 一致性检查”的需求价值，并给出可复现的指标与输出。
 *
 * What:
 * - 使用 `better-sqlite3` 创建临时 SQLite DB，执行与产品一致的 `schema.sql`，写入可复现样例数据；
 * - 输出 3 个核心用例的查询结果，以及基准延迟（P50/P95）、资源占用（CPU/RAM/磁盘）。
 *
 * Usage:
 * - Ensure deps installed: `yarn --cwd writenow-theia install --frozen-lockfile`
 * - Run:
 *   - `node writenow-theia/writenow-core/scripts/p2-002-sqlite-graph-poc.cjs`
 *   - (optional) `node ... --dataset /abs/path/to/dataset.json --iterations 2000 --warmup 200`
 */

const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const process = require('node:process');

const Database = require('better-sqlite3');

function coerceString(value) {
  return typeof value === 'string' ? value.trim() : '';
}

function safeJsonParse(raw) {
  if (typeof raw !== 'string') return undefined;
  const trimmed = raw.trim();
  if (!trimmed) return undefined;
  try {
    return JSON.parse(trimmed);
  } catch {
    return undefined;
  }
}

function toIsoNow() {
  return new Date().toISOString();
}

function ensureDir(dirPath) {
  if (fs.existsSync(dirPath)) return;
  fs.mkdirSync(dirPath, { recursive: true });
}

function parseArgs(argv) {
  const args = { dataset: null, iterations: 1500, warmup: 200 };
  for (let i = 0; i < argv.length; i += 1) {
    const token = argv[i];
    if (token === '--dataset') {
      args.dataset = coerceString(argv[i + 1]);
      i += 1;
      continue;
    }
    if (token === '--iterations') {
      const n = Number.parseInt(coerceString(argv[i + 1]), 10);
      if (Number.isFinite(n) && n > 0) args.iterations = n;
      i += 1;
      continue;
    }
    if (token === '--warmup') {
      const n = Number.parseInt(coerceString(argv[i + 1]), 10);
      if (Number.isFinite(n) && n >= 0) args.warmup = n;
      i += 1;
      continue;
    }
  }
  return args;
}

function nearestRankPercentile(sorted, p) {
  if (!Array.isArray(sorted) || sorted.length === 0) return null;
  const clamped = Math.max(0, Math.min(100, p));
  const rank = Math.ceil((clamped / 100) * sorted.length);
  const idx = Math.max(0, Math.min(sorted.length - 1, rank - 1));
  return sorted[idx];
}

function isValidAt(meta, atIso) {
  if (!atIso) return true;
  const at = coerceString(atIso);
  if (!at) return true;

  const from = coerceString(meta?.valid_from) || null;
  const to = coerceString(meta?.valid_to) || null;

  // Why: treat validity window as [valid_from, valid_to). This keeps "until" semantics deterministic.
  if (from && at < from) return false;
  if (to && at >= to) return false;
  return true;
}

function measureCase(label, fn, options) {
  const warmup = typeof options?.warmup === 'number' ? options.warmup : 100;
  const iterations = typeof options?.iterations === 'number' ? options.iterations : 1000;

  for (let i = 0; i < warmup; i += 1) fn();

  const cpuStart = process.cpuUsage();
  const timesMs = [];
  for (let i = 0; i < iterations; i += 1) {
    const t0 = process.hrtime.bigint();
    fn();
    const t1 = process.hrtime.bigint();
    timesMs.push(Number(t1 - t0) / 1e6);
  }
  const cpu = process.cpuUsage(cpuStart);

  timesMs.sort((a, b) => a - b);
  const sum = timesMs.reduce((acc, v) => acc + v, 0);
  const avg = timesMs.length ? sum / timesMs.length : 0;

  return {
    label,
    iterations,
    p50Ms: nearestRankPercentile(timesMs, 50),
    p95Ms: nearestRankPercentile(timesMs, 95),
    avgMs: avg,
    cpuUserMs: cpu.user / 1000,
    cpuSystemMs: cpu.system / 1000,
  };
}

function readSchemaSql(schemaPath) {
  return fs.readFileSync(schemaPath, 'utf8');
}

function openDatabase(dbPath) {
  const db = new Database(dbPath);
  db.pragma('journal_mode = WAL');
  db.pragma('foreign_keys = ON');
  return db;
}

function seedDatabase(db, dataset) {
  const project = dataset?.project ?? null;
  const projectId = coerceString(project?.id);
  if (!projectId) throw new Error('dataset.project.id is required');

  const now = toIsoNow();
  db.prepare('INSERT INTO projects (id, name, description, style_guide, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?)').run(
    projectId,
    coerceString(project?.name) || 'P2-002 Sample',
    coerceString(project?.description) || null,
    null,
    now,
    now
  );

  const insertEntity = db.prepare(
    'INSERT INTO kg_entities (id, project_id, type, name, description, metadata_json, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?)'
  );
  const insertRelation = db.prepare(
    'INSERT INTO kg_relations (id, project_id, from_entity_id, to_entity_id, type, metadata_json, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?)'
  );

  const entities = Array.isArray(dataset?.entities) ? dataset.entities : [];
  for (const e of entities) {
    const id = coerceString(e?.id);
    const type = coerceString(e?.type);
    const name = coerceString(e?.name);
    if (!id || !type || !name) throw new Error(`invalid entity: ${JSON.stringify(e)}`);
    const description = coerceString(e?.description) || null;
    const metadataJson = typeof e?.metadata === 'undefined' ? null : JSON.stringify(e.metadata);
    insertEntity.run(id, projectId, type, name, description, metadataJson, now, now);
  }

  const relations = Array.isArray(dataset?.relations) ? dataset.relations : [];
  for (const r of relations) {
    const id = coerceString(r?.id);
    const from = coerceString(r?.from);
    const to = coerceString(r?.to);
    const type = coerceString(r?.type);
    if (!id || !from || !to || !type) throw new Error(`invalid relation: ${JSON.stringify(r)}`);
    const metadataJson = typeof r?.metadata === 'undefined' ? null : JSON.stringify(r.metadata);
    insertRelation.run(id, projectId, from, to, type, metadataJson, now, now);
  }

  return { projectId, entityCount: entities.length, relationCount: relations.length };
}

function getEntityByName(db, projectId, name) {
  const row = db
    .prepare('SELECT id, type, name, description, metadata_json FROM kg_entities WHERE project_id = ? AND name = ? LIMIT 1')
    .get(projectId, name);
  if (!row) return null;
  return { ...row, metadata: safeJsonParse(row.metadata_json) };
}

function searchEntities(db, projectId, query, limit = 20) {
  const q = coerceString(query);
  if (!q) return [];
  const like = `%${q}%`;
  const rows = db
    .prepare(
      'SELECT id, type, name, description, metadata_json FROM kg_entities WHERE project_id = ? AND (name LIKE ? OR description LIKE ?) ORDER BY updated_at DESC LIMIT ?'
    )
    .all(projectId, like, like, Math.max(1, Math.min(200, limit)));
  return rows.map((row) => ({ ...row, metadata: safeJsonParse(row.metadata_json) }));
}

function listRelationsByEntityId(db, projectId, entityId) {
  const rows = db
    .prepare('SELECT id, from_entity_id, to_entity_id, type, metadata_json FROM kg_relations WHERE project_id = ? AND (from_entity_id = ? OR to_entity_id = ?)')
    .all(projectId, entityId, entityId);
  return rows.map((row) => ({ ...row, metadata: safeJsonParse(row.metadata_json) }));
}

function listRelationsBetween(db, projectId, a, b) {
  const rows = db
    .prepare(
      `SELECT id, from_entity_id, to_entity_id, type, metadata_json
       FROM kg_relations
       WHERE project_id = ?
         AND ((from_entity_id = ? AND to_entity_id = ?) OR (from_entity_id = ? AND to_entity_id = ?))`
    )
    .all(projectId, a, b, b, a);
  return rows.map((row) => ({ ...row, metadata: safeJsonParse(row.metadata_json) }));
}

function listFactsForEntity(db, projectId, entityId) {
  const rows = db
    .prepare(
      `SELECT r.id AS relation_id, r.type AS relation_type, r.metadata_json AS relation_metadata_json,
              f.id AS fact_id, f.type AS fact_type, f.name AS fact_name, f.description AS fact_description, f.metadata_json AS fact_metadata_json
       FROM kg_relations r
       JOIN kg_entities f ON f.id = r.to_entity_id AND f.project_id = r.project_id
       WHERE r.project_id = ? AND r.from_entity_id = ? AND r.type = 'HAS_FACT'`
    )
    .all(projectId, entityId);

  return rows.map((row) => ({
    relationId: row.relation_id,
    relationType: row.relation_type,
    relationMetadata: safeJsonParse(row.relation_metadata_json),
    factId: row.fact_id,
    factType: row.fact_type,
    factName: row.fact_name,
    factDescription: row.fact_description,
    factMetadata: safeJsonParse(row.fact_metadata_json),
  }));
}

function listEventsAfterChapter(db, projectId, chapterIndexExclusive) {
  const rows = db
    .prepare('SELECT id, name, description, metadata_json FROM kg_entities WHERE project_id = ? AND type = ?')
    .all(projectId, 'Event');

  const filtered = rows
    .map((row) => ({ ...row, metadata: safeJsonParse(row.metadata_json) }))
    .filter((row) => typeof row.metadata?.chapterIndex === 'number' && row.metadata.chapterIndex > chapterIndexExclusive)
    .sort((a, b) => coerceString(a.metadata?.occurred_at).localeCompare(coerceString(b.metadata?.occurred_at)));

  return filtered;
}

function expandGraph(db, projectId, startEntityId, depth, options) {
  const maxDepth = Math.max(0, Math.min(2, Number.isFinite(depth) ? depth : 1));
  const atIso = coerceString(options?.atIso) || null;

  const seenEntities = new Set([startEntityId]);
  const seenRelations = new Map();

  let frontier = [startEntityId];
  for (let step = 1; step <= maxDepth; step += 1) {
    const next = [];
    for (const id of frontier) {
      const rels = listRelationsByEntityId(db, projectId, id);
      for (const rel of rels) {
        if (!isValidAt(rel.metadata, atIso)) continue;
        if (!seenRelations.has(rel.id)) seenRelations.set(rel.id, rel);
        const neighbor = rel.from_entity_id === id ? rel.to_entity_id : rel.from_entity_id;
        if (!seenEntities.has(neighbor)) {
          seenEntities.add(neighbor);
          next.push(neighbor);
        }
      }
    }
    frontier = next;
  }

  const entityIds = Array.from(seenEntities.values());
  const placeholders = entityIds.map(() => '?').join(', ');
  const entities = db
    .prepare(`SELECT id, type, name, description, metadata_json FROM kg_entities WHERE project_id = ? AND id IN (${placeholders})`)
    .all(projectId, ...entityIds)
    .map((row) => ({ ...row, metadata: safeJsonParse(row.metadata_json) }));

  return { entities, relations: Array.from(seenRelations.values()) };
}

async function main() {
  const args = parseArgs(process.argv.slice(2));
  const datasetPath = args.dataset
    ? path.resolve(process.cwd(), args.dataset)
    : path.resolve(__dirname, 'p2-002-sqlite-graph-poc.dataset.json');

  const datasetRaw = fs.readFileSync(datasetPath, 'utf8');
  const dataset = JSON.parse(datasetRaw);

  const workRoot = fs.mkdtempSync(path.join(os.tmpdir(), 'writenow-p2-002-kg-poc-'));
  const dbPath = path.join(workRoot, 'kg-poc.db');

  const schemaPath = path.resolve(__dirname, '../src/node/database/schema.sql');
  const schemaSql = readSchemaSql(schemaPath);

  const db = openDatabase(dbPath);
  try {
    db.exec(schemaSql);

    const seeded = seedDatabase(db, dataset);
    const sqliteVersion = db.prepare('select sqlite_version() as v').get()?.v ?? '(unknown)';

    // Disk size only exists after sqlite flushes; checkpoint to stabilize.
    db.pragma('wal_checkpoint(TRUNCATE)');
    const diskBytes = fs.existsSync(dbPath) ? fs.statSync(dbPath).size : 0;

    console.info(`# P2-002 SQLite 图模拟 PoC 输出`);
    console.info(``);
    console.info(`## Environment`);
    console.info(`- node: ${process.version}`);
    console.info(`- sqlite: ${sqliteVersion}`);
    console.info(`- platform: ${process.platform} ${process.arch}`);
    console.info(``);
    console.info(`## Dataset`);
    console.info(`- projectId: \`${seeded.projectId}\``);
    console.info(`- entities: ${seeded.entityCount}`);
    console.info(`- relations: ${seeded.relationCount}`);
    console.info(`- dbPath: \`${dbPath}\``);
    console.info(`- dbSizeBytes: ${diskBytes}`);
    console.info(``);

    console.info(`## Scenarios`);

    // 1) 人物关系一致性
    const zhangsan = getEntityByName(db, seeded.projectId, '张三');
    const lisi = getEntityByName(db, seeded.projectId, '李四');
    if (!zhangsan || !lisi) throw new Error('seed missing 张三/李四');

    const timeline = listRelationsBetween(db, seeded.projectId, zhangsan.id, lisi.id)
      .map((rel) => ({
        type: rel.type,
        valid_from: coerceString(rel.metadata?.valid_from) || null,
        valid_to: coerceString(rel.metadata?.valid_to) || null,
        source: coerceString(rel.metadata?.source) || null,
        met_at: coerceString(rel.metadata?.met_at) || null,
      }))
      .sort((a, b) => coerceString(a.valid_from).localeCompare(coerceString(b.valid_from)));

    console.info(`### 1) 人物关系一致性`);
    console.info(`- Query: “张三和李四是什么关系？什么时候认识的？”`);
    console.info(`- Timeline:`);
    for (const item of timeline) {
      console.info(`  - ${item.type} | from=${item.valid_from ?? '(null)'} | to=${item.valid_to ?? '(null)'} | source=${item.source ?? '(null)'}`);
    }
    console.info(``);

    // 2) 设定冲突检测（年龄）
    const wangwu = getEntityByName(db, seeded.projectId, '王五');
    if (!wangwu) throw new Error('seed missing 王五');
    const facts = listFactsForEntity(db, seeded.projectId, wangwu.id).filter((f) => f.factMetadata?.kind === 'age');

    console.info(`### 2) 设定冲突检测`);
    console.info(`- Query: “第二章说王五 28 岁，第四章说 35 岁，哪个正确？”`);
    console.info(`- Facts (age):`);
    for (const fact of facts) {
      const meta = fact.factMetadata ?? {};
      console.info(
        `  - ${fact.factName} | value=${meta.value ?? '(n/a)'} | from=${coerceString(meta.valid_from) || '(null)'} | to=${coerceString(meta.valid_to) || '(null)'} | source=${coerceString(meta.source) || '(null)'}`
      );
    }
    const atChapter2 = '2030-02-15T00:00:00Z';
    const atChapter4 = '2030-04-15T00:00:00Z';
    const factsAt2 = facts.filter((f) => isValidAt(f.factMetadata, atChapter2));
    const factsAt4 = facts.filter((f) => isValidAt(f.factMetadata, atChapter4));
    console.info(`- Valid @ ${atChapter2}: ${factsAt2.map((f) => f.factName).join(', ') || '(none)'}`);
    console.info(`- Valid @ ${atChapter4}: ${factsAt4.map((f) => f.factName).join(', ') || '(none)'}`);
    console.info(``);

    // 3) 事件链检索（第三章之后）
    const eventsAfter3 = listEventsAfterChapter(db, seeded.projectId, 3);
    console.info(`### 3) 事件链检索`);
    console.info(`- Query: “第三章之后发生了哪些关键事件？按时间排序。”`);
    console.info(`- Events:`);
    for (const evt of eventsAfter3) {
      console.info(`  - ${evt.name} | chapter=${evt.metadata?.chapterIndex ?? '(n/a)'} | occurred_at=${coerceString(evt.metadata?.occurred_at) || '(null)'} | source=${coerceString(evt.metadata?.source) || '(null)'}`);
    }
    console.info(``);

    console.info(`## Query demo (SQLite graph simulation)`);
    const demoSearch = searchEntities(db, seeded.projectId, '王', 10);
    console.info(`- entitySearch("王") → ${demoSearch.map((e) => `${e.type}:${e.name}`).join(', ')}`);
    const hop1 = expandGraph(db, seeded.projectId, zhangsan.id, 1, {});
    const hop2 = expandGraph(db, seeded.projectId, zhangsan.id, 2, {});
    console.info(`- expand(张三, 1-hop) → entities=${hop1.entities.length}, relations=${hop1.relations.length}`);
    console.info(`- expand(张三, 2-hop) → entities=${hop2.entities.length}, relations=${hop2.relations.length}`);
    console.info(``);

    console.info(`## Benchmarks (ms)`);
    const results = [
      measureCase('entitySearch: q=王', () => searchEntities(db, seeded.projectId, '王', 20), args),
      measureCase('expand: 张三 1-hop', () => expandGraph(db, seeded.projectId, zhangsan.id, 1, {}), args),
      measureCase('expand: 张三 2-hop', () => expandGraph(db, seeded.projectId, zhangsan.id, 2, {}), args),
      measureCase('facts: 王五 age', () => listFactsForEntity(db, seeded.projectId, wangwu.id), args),
      measureCase('events: chapter>3', () => listEventsAfterChapter(db, seeded.projectId, 3), args),
    ];

    console.info(`| case | iterations | p50Ms | p95Ms | avgMs | cpuUserMs | cpuSystemMs |`);
    console.info(`|------|------------|-------|-------|-------|-----------|-------------|`);
    for (const row of results) {
      console.info(
        `| ${row.label} | ${row.iterations} | ${row.p50Ms?.toFixed(4)} | ${row.p95Ms?.toFixed(4)} | ${row.avgMs.toFixed(4)} | ${row.cpuUserMs.toFixed(
          1
        )} | ${row.cpuSystemMs.toFixed(1)} |`
      );
    }

    const mem = process.memoryUsage();
    console.info(``);
    console.info(`## Resource snapshot`);
    console.info(`- rssBytes: ${mem.rss}`);
    console.info(`- heapUsedBytes: ${mem.heapUsed}`);
    console.info(`- externalBytes: ${mem.external}`);

    console.info(``);
    console.info(`[p2-002-sqlite-graph-poc] done`);
  } finally {
    try {
      db.close();
    } catch {
      // ignore
    }
  }
}

Promise.resolve()
  .then(() => main())
  .catch((error) => {
    console.error('[p2-002-sqlite-graph-poc] failed', error);
    process.exit(1);
  });

