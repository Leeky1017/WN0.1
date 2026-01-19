import type { JsonValue, Skill } from './models';

export type AiProvider = 'anthropic' | 'openai';

export type AiModelId = string;

export type AiConfig = {
  provider: AiProvider;
  model: AiModelId;
  apiBaseUrl?: string;
  apiKey?: string;
  temperature?: number;
  maxTokens?: number;
};

export type AiSkillId = Skill['id'];

export type AiSkill = Skill;

export type AiSkillRunId = string;

export type AiStreamDeltaEvent = {
  type: 'delta';
  runId: AiSkillRunId;
  text: string;
};

export type AiStreamDoneEvent = {
  type: 'done';
  runId: AiSkillRunId;
  result: {
    text: string;
    meta?: JsonValue;
  };
};

export type AiStreamErrorEvent = {
  type: 'error';
  runId: AiSkillRunId;
  error: {
    code: string;
    message: string;
    details?: JsonValue;
  };
};

export type AiStreamEvent = AiStreamDeltaEvent | AiStreamDoneEvent | AiStreamErrorEvent;

