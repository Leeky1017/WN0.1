PRAGMA foreign_keys = ON;

-- 文章表
CREATE TABLE IF NOT EXISTS articles (
  id TEXT PRIMARY KEY,
  title TEXT NOT NULL,
  content TEXT NOT NULL,
  characters TEXT NOT NULL DEFAULT '',
  tags TEXT NOT NULL DEFAULT '',
  format TEXT DEFAULT 'markdown',    -- 'markdown' | 'richtext'
  workflow_stage TEXT DEFAULT 'draft',
  word_count INTEGER DEFAULT 0,
  project_id TEXT,                   -- 所属项目
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);

-- 文章全文索引
CREATE VIRTUAL TABLE IF NOT EXISTS articles_fts USING fts5(
  title,
  content,
  characters,
  tags,
  content='articles',
  content_rowid='rowid',
  tokenize='unicode61'
);

-- 版本快照
CREATE TABLE IF NOT EXISTS article_snapshots (
  id TEXT PRIMARY KEY,
  article_id TEXT NOT NULL,
  content TEXT NOT NULL,
  name TEXT,                         -- 用户自定义版本名
  reason TEXT,                       -- 保存原因
  actor TEXT DEFAULT 'user',         -- 'user' | 'ai' | 'auto'
  created_at TEXT NOT NULL,
  FOREIGN KEY (article_id) REFERENCES articles(id)
);

-- 段落分块（RAG 检索粒度）
CREATE TABLE IF NOT EXISTS article_chunks (
  id TEXT PRIMARY KEY,               -- 稳定 chunk id（由内容/位置派生）
  article_id TEXT NOT NULL,
  idx INTEGER NOT NULL,              -- 段落序号（从 0 开始）
  content TEXT NOT NULL,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  FOREIGN KEY (article_id) REFERENCES articles(id) ON DELETE CASCADE
);
CREATE INDEX IF NOT EXISTS idx_article_chunks_article_id ON article_chunks(article_id);

-- 人物/设定卡片（最小可用：从 markdown 卡片文件同步）
CREATE TABLE IF NOT EXISTS entity_cards (
  id TEXT PRIMARY KEY,               -- `${type}:${name}`
  type TEXT NOT NULL,                -- 'character' | 'setting'
  name TEXT NOT NULL,
  aliases TEXT NOT NULL DEFAULT '[]',-- JSON string[]
  content TEXT NOT NULL,             -- 卡片全文（用于 embedding/检索）
  source_article_id TEXT,            -- 来源文件（documents/*.md）
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_entity_cards_type ON entity_cards(type);
CREATE INDEX IF NOT EXISTS idx_entity_cards_name ON entity_cards(name);

-- 项目表
CREATE TABLE IF NOT EXISTS projects (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  description TEXT,
  style_guide TEXT,                  -- 写作风格指南
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);

-- 人物设定
CREATE TABLE IF NOT EXISTS characters (
  id TEXT PRIMARY KEY,
  project_id TEXT NOT NULL,
  name TEXT NOT NULL,
  description TEXT,
  traits TEXT,                       -- JSON: 性格特点
  relationships TEXT,                -- JSON: 人物关系
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  FOREIGN KEY (project_id) REFERENCES projects(id)
);

-- 大纲（文章级，按 project + article 存储 JSON）
CREATE TABLE IF NOT EXISTS outlines (
  project_id TEXT NOT NULL,
  article_id TEXT NOT NULL,
  outline_json TEXT NOT NULL,        -- JSON: OutlineNode[]
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  PRIMARY KEY (project_id, article_id),
  FOREIGN KEY (project_id) REFERENCES projects(id)
);
CREATE INDEX IF NOT EXISTS idx_outlines_project_id ON outlines(project_id);
CREATE INDEX IF NOT EXISTS idx_outlines_article_id ON outlines(article_id);

-- 知识图谱：实体与关系（项目级）
CREATE TABLE IF NOT EXISTS kg_entities (
  id TEXT PRIMARY KEY,
  project_id TEXT NOT NULL,
  type TEXT NOT NULL,               -- 'Character' | 'Location' | 'Event' | 'TimePoint' | 'Item' | ...
  name TEXT NOT NULL,
  description TEXT,
  metadata_json TEXT,               -- JSON: 扩展字段
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  FOREIGN KEY (project_id) REFERENCES projects(id)
);
CREATE INDEX IF NOT EXISTS idx_kg_entities_project_id ON kg_entities(project_id);
CREATE INDEX IF NOT EXISTS idx_kg_entities_type ON kg_entities(type);
CREATE INDEX IF NOT EXISTS idx_kg_entities_name ON kg_entities(name);

CREATE TABLE IF NOT EXISTS kg_relations (
  id TEXT PRIMARY KEY,
  project_id TEXT NOT NULL,
  from_entity_id TEXT NOT NULL,
  to_entity_id TEXT NOT NULL,
  type TEXT NOT NULL,
  metadata_json TEXT,               -- JSON: 扩展字段
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  FOREIGN KEY (project_id) REFERENCES projects(id),
  FOREIGN KEY (from_entity_id) REFERENCES kg_entities(id) ON DELETE CASCADE,
  FOREIGN KEY (to_entity_id) REFERENCES kg_entities(id) ON DELETE CASCADE
);
CREATE INDEX IF NOT EXISTS idx_kg_relations_project_id ON kg_relations(project_id);
CREATE INDEX IF NOT EXISTS idx_kg_relations_from_entity_id ON kg_relations(from_entity_id);
CREATE INDEX IF NOT EXISTS idx_kg_relations_to_entity_id ON kg_relations(to_entity_id);

-- SKILL 定义
CREATE TABLE IF NOT EXISTS skills (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  description TEXT,
  tag TEXT,                          -- 分类标签
  system_prompt TEXT,
  user_prompt_template TEXT NOT NULL,
  context_rules TEXT,                -- JSON: 上下文注入规则
  model TEXT DEFAULT 'claude-sonnet',
  is_builtin INTEGER DEFAULT 0,
  enabled INTEGER NOT NULL DEFAULT 1,
  is_valid INTEGER NOT NULL DEFAULT 1,
  error_code TEXT,
  error_message TEXT,
  source_uri TEXT,
  source_hash TEXT,
  version TEXT,
  scope TEXT,
  package_id TEXT,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);

-- 用户记忆（外挂记忆）
CREATE TABLE IF NOT EXISTS user_memory (
  id TEXT PRIMARY KEY,
  type TEXT NOT NULL,                -- 'preference' | 'feedback' | 'style'
  content TEXT NOT NULL,
  project_id TEXT,                   -- NULL = 全局
  confidence REAL NOT NULL DEFAULT 1.0,
  evidence_json TEXT NOT NULL DEFAULT '[]',
  metadata_json TEXT NOT NULL DEFAULT '{}',
  revision INTEGER NOT NULL DEFAULT 1,
  deleted_at TEXT,                   -- NULL=active, ISO timestamp=tombstone
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_user_memory_scope_active_updated
  ON user_memory(project_id, deleted_at, updated_at DESC);

CREATE INDEX IF NOT EXISTS idx_user_memory_type_active_updated
  ON user_memory(type, deleted_at, updated_at DESC);

-- SKILL 反馈事件（采纳/拒绝/部分采纳）
CREATE TABLE IF NOT EXISTS skill_run_feedback (
  id TEXT PRIMARY KEY,
  run_id TEXT NOT NULL,
  project_id TEXT NOT NULL,
  skill_id TEXT NOT NULL,
  action TEXT NOT NULL,              -- 'accept' | 'reject' | 'partial'
  evidence_ref TEXT,                 -- JSON string
  created_at TEXT NOT NULL,
  FOREIGN KEY (project_id) REFERENCES projects(id),
  FOREIGN KEY (skill_id) REFERENCES skills(id)
);
CREATE INDEX IF NOT EXISTS idx_skill_run_feedback_run_id ON skill_run_feedback(run_id);
CREATE INDEX IF NOT EXISTS idx_skill_run_feedback_project_id ON skill_run_feedback(project_id);
CREATE INDEX IF NOT EXISTS idx_skill_run_feedback_skill_id ON skill_run_feedback(skill_id);

-- 创作统计
CREATE TABLE IF NOT EXISTS writing_stats (
  date TEXT PRIMARY KEY,             -- YYYY-MM-DD
  word_count INTEGER DEFAULT 0,
  writing_minutes INTEGER DEFAULT 0,
  articles_created INTEGER DEFAULT 0,
  skills_used INTEGER DEFAULT 0
);

-- 写作约束配置表
CREATE TABLE IF NOT EXISTS writing_constraints (
  id TEXT PRIMARY KEY,
  project_id TEXT,
  type TEXT NOT NULL,
  config TEXT NOT NULL,
  level TEXT DEFAULT 'warning',
  enabled INTEGER DEFAULT 1,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  FOREIGN KEY (project_id) REFERENCES projects(id)
);

-- 术语表
CREATE TABLE IF NOT EXISTS terminology (
  id TEXT PRIMARY KEY,
  project_id TEXT,
  term TEXT NOT NULL,
  aliases TEXT,
  definition TEXT,
  created_at TEXT NOT NULL,
  FOREIGN KEY (project_id) REFERENCES projects(id)
);

-- 禁用词表（便于批量管理）
CREATE TABLE IF NOT EXISTS forbidden_words (
  id TEXT PRIMARY KEY,
  project_id TEXT,
  word TEXT NOT NULL,
  category TEXT,
  created_at TEXT NOT NULL,
  FOREIGN KEY (project_id) REFERENCES projects(id)
);

-- 用户设置
CREATE TABLE IF NOT EXISTS settings (
  key TEXT PRIMARY KEY,
  value TEXT NOT NULL
);

-- P2-001: 历史对话 Full → Compact（Compact 存 SQLite，Full 以文件引用回溯）
CREATE TABLE IF NOT EXISTS conversation_compacts (
  project_id TEXT NOT NULL,
  conversation_id TEXT NOT NULL,
  article_id TEXT NOT NULL,
  full_ref TEXT NOT NULL,             -- project-relative: ".writenow/conversations/<id>.json"
  compact_json TEXT NOT NULL,         -- stable JSON string (deterministic)
  summary TEXT NOT NULL,
  summary_quality TEXT NOT NULL,      -- 'placeholder' | 'heuristic' | 'l2'
  message_count INTEGER NOT NULL,
  token_estimate INTEGER NOT NULL,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  compacted_at TEXT NOT NULL,
  PRIMARY KEY (project_id, conversation_id)
);
CREATE INDEX IF NOT EXISTS idx_conversation_compacts_project_article_updated
  ON conversation_compacts(project_id, article_id, updated_at DESC);

CREATE TABLE IF NOT EXISTS conversation_compaction_events (
  id TEXT PRIMARY KEY,
  project_id TEXT NOT NULL,
  conversation_id TEXT NOT NULL,
  article_id TEXT NOT NULL,
  triggered_at TEXT NOT NULL,
  reason TEXT NOT NULL,               -- e.g. 'threshold' | 'analysis_update'
  threshold_json TEXT NOT NULL,
  stats_json TEXT NOT NULL,
  full_ref TEXT NOT NULL,
  compact_ref TEXT NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_conversation_compaction_events_project_time
  ON conversation_compaction_events(project_id, triggered_at DESC);

