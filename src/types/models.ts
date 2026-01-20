export type IsoDateString = string;
export type YyyyMmDdDateString = string;

export type JsonPrimitive = string | number | boolean | null;
export type JsonValue = JsonPrimitive | JsonValue[] | { [key: string]: JsonValue };

export type ArticleFormat = 'markdown' | 'richtext';

export type DbArticleRow = {
  id: string;
  title: string;
  content: string;
  format: ArticleFormat;
  workflow_stage: string;
  word_count: number;
  project_id: string | null;
  created_at: IsoDateString;
  updated_at: IsoDateString;
};

export type Article = {
  id: string;
  title: string;
  content: string;
  format: ArticleFormat;
  workflowStage: string;
  wordCount: number;
  projectId: string | null;
  createdAt: IsoDateString;
  updatedAt: IsoDateString;
};

export type DbArticleSnapshotRow = {
  id: string;
  article_id: string;
  content: string;
  name: string | null;
  reason: string | null;
  actor: 'user' | 'ai' | 'auto';
  created_at: IsoDateString;
};

export type ArticleSnapshot = {
  id: string;
  articleId: string;
  content: string;
  name?: string;
  reason?: string;
  actor: 'user' | 'ai' | 'auto';
  createdAt: IsoDateString;
};

export type DbProjectRow = {
  id: string;
  name: string;
  description: string | null;
  style_guide: string | null;
  created_at: IsoDateString;
  updated_at: IsoDateString;
};

export type Project = {
  id: string;
  name: string;
  description?: string;
  styleGuide?: string;
  createdAt: IsoDateString;
  updatedAt: IsoDateString;
};

export type DbCharacterRow = {
  id: string;
  project_id: string;
  name: string;
  description: string | null;
  traits: string | null;
  relationships: string | null;
  created_at: IsoDateString;
  updated_at: IsoDateString;
};

export type Character = {
  id: string;
  projectId: string;
  name: string;
  description?: string;
  traits?: JsonValue;
  relationships?: JsonValue;
  createdAt: IsoDateString;
  updatedAt: IsoDateString;
};

export type KnowledgeGraphEntityType = 'Character' | 'Location' | 'Event' | 'TimePoint' | 'Item' | (string & {});

export type DbKnowledgeGraphEntityRow = {
  id: string;
  project_id: string;
  type: string;
  name: string;
  description: string | null;
  metadata_json: string | null;
  created_at: IsoDateString;
  updated_at: IsoDateString;
};

export type KnowledgeGraphEntity = {
  id: string;
  projectId: string;
  type: KnowledgeGraphEntityType;
  name: string;
  description?: string;
  metadata?: JsonValue;
  createdAt: IsoDateString;
  updatedAt: IsoDateString;
};

export type DbKnowledgeGraphRelationRow = {
  id: string;
  project_id: string;
  from_entity_id: string;
  to_entity_id: string;
  type: string;
  metadata_json: string | null;
  created_at: IsoDateString;
  updated_at: IsoDateString;
};

export type KnowledgeGraphRelation = {
  id: string;
  projectId: string;
  fromEntityId: string;
  toEntityId: string;
  type: string;
  metadata?: JsonValue;
  createdAt: IsoDateString;
  updatedAt: IsoDateString;
};

export type DbSkillRow = {
  id: string;
  name: string;
  description: string | null;
  tag: string | null;
  system_prompt: string | null;
  user_prompt_template: string;
  context_rules: string | null;
  model: string;
  is_builtin: 0 | 1;
  created_at: IsoDateString;
  updated_at: IsoDateString;
};

export type Skill = {
  id: string;
  name: string;
  description?: string;
  tag?: string;
  systemPrompt?: string;
  userPromptTemplate: string;
  contextRules?: JsonValue;
  model: string;
  isBuiltin: boolean;
  createdAt: IsoDateString;
  updatedAt: IsoDateString;
};

export type DbUserMemoryRow = {
  id: string;
  type: 'preference' | 'feedback' | 'style';
  content: string;
  project_id: string | null;
  created_at: IsoDateString;
  updated_at: IsoDateString;
};

export type UserMemory = {
  id: string;
  type: 'preference' | 'feedback' | 'style';
  content: string;
  projectId: string | null;
  createdAt: IsoDateString;
  updatedAt: IsoDateString;
};

export type DbWritingStatsRow = {
  date: YyyyMmDdDateString;
  word_count: number;
  writing_minutes: number;
  articles_created: number;
  skills_used: number;
};

export type WritingStats = {
  date: YyyyMmDdDateString;
  wordCount: number;
  writingMinutes: number;
  articlesCreated: number;
  skillsUsed: number;
};

export type DbSettingRow = {
  key: string;
  value: string;
};

export type Setting = {
  key: string;
  value: string;
};
