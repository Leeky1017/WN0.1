import type { ConstraintRule, ConstraintViolation } from '../types';

type FormatMode = 'list_only' | 'paragraph_only';

type FormatConfig = {
  mode: FormatMode;
};

function isFormatMode(value: unknown): value is FormatMode {
  return value === 'list_only' || value === 'paragraph_only';
}

function getConfig(rule: ConstraintRule): FormatConfig | null {
  const mode = rule.config.mode;
  if (!isFormatMode(mode)) return null;
  return { mode };
}

const listItemRegExp = /^(\s*([-+*]|\d+\.))\s+\S/;
const headingRegExp = /^\s*#{1,6}\s+\S/;

function findFirstNonConformingLine(
  text: string,
  predicate: (line: string) => boolean
): { start: number; end: number; line: string } | null {
  let offset = 0;
  const lines = text.split('\n');
  for (const line of lines) {
    const lineLength = line.length;
    const end = offset + lineLength;
    const content = line.trim();
    if (content && !predicate(line)) {
      return { start: offset, end, line };
    }
    offset = end + 1;
  }
  return null;
}

export function checkFormat(text: string, rule: ConstraintRule): ConstraintViolation[] {
  const config = getConfig(rule);
  if (!config) return [];

  if (config.mode === 'list_only') {
    const bad = findFirstNonConformingLine(text, (line) => listItemRegExp.test(line));
    if (!bad) return [];
    return [
      {
        ruleId: rule.id,
        type: rule.type,
        level: rule.level,
        message: '格式不符合：要求只输出列表',
        position: { start: bad.start, end: bad.end },
        suggestion: `将该行改为列表项（例如 "- ${bad.line.trim()}"）`,
      },
    ];
  }

  const bad = findFirstNonConformingLine(text, (line) => !(listItemRegExp.test(line) || headingRegExp.test(line)));
  if (!bad) return [];
  return [
    {
      ruleId: rule.id,
      type: rule.type,
      level: rule.level,
      message: '格式不符合：要求只输出段落（禁止标题/列表）',
      position: { start: bad.start, end: bad.end },
      suggestion: '移除标题或列表格式，改为普通段落文本',
    },
  ];
}
