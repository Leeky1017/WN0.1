import { describe, expect, test } from 'vitest';

import { parseSkillDefinitionV2 } from './parser';
import { validateSkillDefinitionV2 } from './validator';

describe('Skill V2 SKILL.md parser/validator', () => {
  test('parses and validates minimal SKILL.md', () => {
    const input = `---
id: builtin:polish
name: 润色文本
version: 1.0.0
tags: [rewrite]
prompt:
  system: |
    You are WriteNow's writing assistant.
  user: |
    请对下面的文本进行润色。
---

## Intent
Keep meaning, improve clarity.
`;

    const parsed = parseSkillDefinitionV2(input);
    expect(parsed.ok).toBe(true);
    if (!parsed.ok) return;

    const validated = validateSkillDefinitionV2(parsed.data, { model: 'claude-3-5-sonnet-latest' });
    expect(validated.ok).toBe(true);
    if (!validated.ok) return;

    expect(validated.data.frontmatter.id).toBe('builtin:polish');
    expect(validated.data.frontmatter.tags).toEqual(['rewrite']);
    expect(validated.data.markdown.intent).toContain('Keep meaning');
  });

  test('fails when YAML frontmatter is missing', () => {
    const parsed = parseSkillDefinitionV2('## Intent\nHello\n');
    expect(parsed.ok).toBe(false);
    if (parsed.ok) return;
    expect(parsed.error.code).toBe('INVALID_ARGUMENT');
  });

  test('fails when required fields are missing', () => {
    const input = `---
name: Missing Id
version: 1.0.0
tags: [rewrite]
prompt: { system: "S", user: "U" }
---
`;

    const parsed = parseSkillDefinitionV2(input);
    expect(parsed.ok).toBe(true);
    if (!parsed.ok) return;

    const validated = validateSkillDefinitionV2(parsed.data);
    expect(validated.ok).toBe(false);
    if (validated.ok) return;
    expect(validated.error.code).toBe('INVALID_ARGUMENT');
    expect(validated.error.details).toMatchObject({ field: 'id' });
  });

  test('fails on invalid semver', () => {
    const input = `---
id: test:bad
name: Bad Version
version: "1.0"
tags: [rewrite]
prompt: { system: "S", user: "U" }
---
`;

    const parsed = parseSkillDefinitionV2(input);
    expect(parsed.ok).toBe(true);
    if (!parsed.ok) return;

    const validated = validateSkillDefinitionV2(parsed.data);
    expect(validated.ok).toBe(false);
    if (validated.ok) return;
    expect(validated.error.code).toBe('INVALID_ARGUMENT');
    expect(validated.error.message).toContain('SemVer');
  });

  test('fails on oversized prompt budget', () => {
    const huge = 'a'.repeat(25_000);
    const input = `---
id: test:huge
name: Huge Prompt
version: 1.0.0
tags: [rewrite]
prompt:
  system: |
    ${huge}
  user: |
    hello
---
`;

    const parsed = parseSkillDefinitionV2(input);
    expect(parsed.ok).toBe(true);
    if (!parsed.ok) return;

    const validated = validateSkillDefinitionV2(parsed.data, { maxInstructionTokens: 5000 });
    expect(validated.ok).toBe(false);
    if (validated.ok) return;
    expect(validated.error.code).toBe('INVALID_ARGUMENT');
    expect(validated.error.message).toContain('token');
  });

  test('validates references slots and rejects traversal', () => {
    const input = `---
id: test:refs
name: Refs
version: 1.0.0
tags: [rewrite]
prompt: { system: "S", user: "U" }
references:
  slots:
    platform:
      directory: references
      pattern: "*.md"
      required: true
      load: on_demand
      maxTokens: 1200
---
`;

    const parsed = parseSkillDefinitionV2(input);
    expect(parsed.ok).toBe(true);
    if (!parsed.ok) return;

    const validated = validateSkillDefinitionV2(parsed.data);
    expect(validated.ok).toBe(true);

    const bad = parseSkillDefinitionV2(
      `---
id: test:refs-bad
name: Bad refs
version: 1.0.0
tags: [rewrite]
prompt: { system: "S", user: "U" }
references:
  slots:
    platform:
      directory: ../escape
      pattern: "*.md"
      load: on_demand
---
`
    );
    expect(bad.ok).toBe(true);
    if (!bad.ok) return;

    const badValidated = validateSkillDefinitionV2(bad.data);
    expect(badValidated.ok).toBe(false);
    if (badValidated.ok) return;
    expect(badValidated.error.code).toBe('INVALID_ARGUMENT');
    expect(badValidated.error.message).toContain('reference slot');
  });
});
