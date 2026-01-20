export function buildTonePrompt(tone: string, text: string): string {
  return [
    '你是一个写作质量检查器。',
    '判断文本语气是否符合要求，只输出 JSON，不要输出其他内容。',
    'JSON 格式：{"pass": true/false, "reason": "原因"}',
    '',
    `要求语气：${tone}`,
    '文本：',
    text,
  ].join('\n');
}

