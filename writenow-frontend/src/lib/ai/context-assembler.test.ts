import { describe, expect, it } from 'vitest'

import type { SkillFileDefinition } from '@/types/ipc-generated'
import { assembleSkillRunRequest } from './context-assembler'

function fnv1a32Hex(text: string): string {
  const raw = typeof text === 'string' ? text : ''
  let hash = 0x811c9dc5
  for (let i = 0; i < raw.length; i += 1) {
    hash ^= raw.charCodeAt(i)
    hash = Math.imul(hash, 0x01000193)
  }
  return (hash >>> 0).toString(16).padStart(8, '0')
}

describe('ContextAssembler (stable prefix)', () => {
  it('keeps stable systemPrompt when instruction changes', async () => {
    const definition: SkillFileDefinition = {
      frontmatter: {
        prompt: {
          system: 'You are a writing assistant.',
          user: ['TEXT:', '{{text}}', '', '{{#context}}', 'CONTEXT:', '{{context}}', '{{/context}}'].join('\n'),
        },
        output: { format: 'plain text', constraints: ['no explanations'] },
        context_rules: { surrounding: 0, user_preferences: false, style_guide: false, characters: false, outline: false, recent_summary: 0, knowledge_graph: false },
      },
      markdown: '',
    }

    const first = await assembleSkillRunRequest({
      skillId: 'builtin:polish',
      definition,
      text: 'Hello',
      instruction: 'FIRST',
      selection: null,
      editor: null,
      projectId: undefined,
      articleId: undefined,
    })

    const second = await assembleSkillRunRequest({
      skillId: 'builtin:polish',
      definition,
      text: 'Hello',
      instruction: 'SECOND',
      selection: null,
      editor: null,
      projectId: undefined,
      articleId: undefined,
    })

    expect(first.prompt.systemPrompt).toEqual(second.prompt.systemPrompt)
    expect(fnv1a32Hex(first.prompt.systemPrompt)).toEqual(fnv1a32Hex(second.prompt.systemPrompt))

    expect(first.prompt.userContent).toContain('FIRST')
    expect(second.prompt.userContent).toContain('SECOND')

    const promptHash1 = fnv1a32Hex(`${first.prompt.systemPrompt}\n\n---\n\n${first.prompt.userContent}`)
    const promptHash2 = fnv1a32Hex(`${second.prompt.systemPrompt}\n\n---\n\n${second.prompt.userContent}`)
    expect(promptHash1).not.toEqual(promptHash2)
  })

  it('rejects unknown context_rules fields', async () => {
    const definition: SkillFileDefinition = {
      frontmatter: {
        prompt: { system: 'S', user: '{{text}}' },
        context_rules: { surrounding: 10, bogus: true },
      },
      markdown: '',
    }

    await expect(
      assembleSkillRunRequest({
        skillId: 'builtin:test',
        definition,
        text: 'Hello',
        instruction: '',
        selection: null,
        editor: null,
        projectId: undefined,
        articleId: undefined,
      }),
    ).rejects.toMatchObject({ code: 'INVALID_ARGUMENT' })
  })
})

