export type ConstraintType =
  | 'forbidden_words'
  | 'word_count'
  | 'format'
  | 'terminology'
  | 'tone'
  | 'coverage';

export type ConstraintLevel = 'error' | 'warning' | 'info';

export type ConstraintScope = 'global' | 'project';

export type ConstraintRule = {
  id: string;
  type: ConstraintType;
  enabled: boolean;
  config: Record<string, unknown>;
  level: ConstraintLevel;
  scope: ConstraintScope;
  projectId?: string;
};

export type ConstraintViolation = {
  ruleId: string;
  type: ConstraintType;
  level: ConstraintLevel;
  message: string;
  position?: { start: number; end: number };
  suggestion?: string;
};

export type JudgeResult = {
  passed: boolean;
  violations: ConstraintViolation[];
  l1Passed: boolean;
  l2Passed: boolean;
  checkedAt: string;
  durationMs: number;
};

export type IJudge = {
  check(text: string, rules: ConstraintRule[]): Promise<JudgeResult>;
};
