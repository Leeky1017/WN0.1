export function buildCoveragePrompt(points: string[], text: string): string {
  const normalized = points.map((p) => p.trim()).filter(Boolean);
  return [
    '你是一个写作质量检查器。',
    '判断文本是否覆盖所有要点，只输出 JSON，不要输出其他内容。',
    'JSON 格式：{"pass": true/false, "missing": ["未覆盖要点"], "reason": "原因"}',
    '',
    '要点：',
    ...normalized.map((p, idx) => `${idx + 1}. ${p}`),
    '',
    '文本：',
    text,
  ].join('\n');
}

