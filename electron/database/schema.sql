PRAGMA foreign_keys = ON;

-- 文章表
CREATE TABLE IF NOT EXISTS articles (
  id TEXT PRIMARY KEY,
  title TEXT NOT NULL,
  content TEXT NOT NULL,
  format TEXT DEFAULT 'markdown',    -- 'markdown' | 'richtext'
  workflow_stage TEXT DEFAULT 'draft',
  word_count INTEGER DEFAULT 0,
  project_id TEXT,                   -- 所属项目
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);

-- 文章全文索引
CREATE VIRTUAL TABLE IF NOT EXISTS articles_fts USING fts5(
  title, content, tokenize='unicode61'
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
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);

-- 用户记忆（外挂记忆）
CREATE TABLE IF NOT EXISTS user_memory (
  id TEXT PRIMARY KEY,
  type TEXT NOT NULL,                -- 'preference' | 'feedback' | 'style'
  content TEXT NOT NULL,
  project_id TEXT,                   -- NULL = 全局
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);

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
