import type { IsoDateString, JsonValue } from './models';

export type ContextLayer = 'rules' | 'settings' | 'retrieved' | 'immediate';

export type ContextSource =
  | {
      kind: 'file';
      path: string;
    }
  | {
      kind: 'module';
      id: string;
    }
  | {
      kind: 'conversation';
      id: string;
      path: string;
    };

export type ContextFragmentBase = {
  id: string;
  layer: ContextLayer;
  source: ContextSource;
  content: string;
  priority: number;
  required?: boolean;
  meta?: JsonValue;
};

export type ContextFragmentInput = ContextFragmentBase & {
  tokenCount?: number;
};

export type ContextFragment = ContextFragmentBase & {
  tokenCount: number;
};

export type TokenUsage = {
  used: number;
  budget: number;
};

export type TokenStats = {
  total: {
    used: number;
    limit: number;
  };
  layers: Record<ContextLayer, TokenUsage>;
  estimated: boolean;
};

export type BudgetRemovedEvidence = {
  fragmentId: string;
  layer: ContextLayer;
  source: ContextSource;
  tokenCount: number;
  reason: string;
};

export type BudgetCompressedEvidence = {
  fromFragmentId: string;
  toFragmentId: string;
  savedTokens: number;
  reason: string;
};

export type BudgetEvidence = {
  removed: BudgetRemovedEvidence[];
  compressed: BudgetCompressedEvidence[];
};

export type PromptMessageRole = 'system' | 'user' | 'assistant';

export type PromptMessage = {
  role: PromptMessageRole;
  content: string;
};

export type AssembleResult = {
  systemPrompt: string;
  userContent: string;
  messages: PromptMessage[];
  fragments: ContextFragment[];
  tokenStats: TokenStats;
  budgetEvidence: BudgetEvidence | null;
};

export type EditorContext = {
  selectedText: string | null;
  cursorLine: number;
  cursorColumn: number;
  currentParagraph: string;
  surroundingParagraphs: {
    before: string[];
    after: string[];
  };
  detectedEntities: string[];
};

export type ConversationIndex = {
  id: string;
  articleId: string;
  createdAt: IsoDateString;
  updatedAt: IsoDateString;
  messageCount: number;
  summary: string;
  keyTopics: string[];
  skillsUsed: string[];
  userPreferences: {
    accepted: string[];
    rejected: string[];
  };
  fullPath: string;
};
