export type WnShikiTheme = 'github-dark' | 'github-light';

export type WnShikiHighlighter = {
  codeToHtml: (code: string, options: { lang: string; theme: WnShikiTheme }) => string;
};

let cached: Promise<WnShikiHighlighter> | null = null;

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null;
}

function isHighlighter(value: unknown): value is WnShikiHighlighter {
  if (!isRecord(value)) return false;
  return typeof value.codeToHtml === 'function';
}

/**
 * Why: Shiki highlighter is expensive to initialize; cache a single instance and reuse
 * it across Markdown preview renders.
 */
export async function getWnShikiHighlighter(): Promise<WnShikiHighlighter> {
  if (cached) return cached;

  cached = (async () => {
    const mod = await import('shiki');
    const anyMod = mod as unknown;
    if (!isRecord(anyMod)) throw new Error('Shiki module is not an object');

    const createHighlighter = anyMod.createHighlighter;
    const getHighlighter = anyMod.getHighlighter;

    const factory = typeof createHighlighter === 'function' ? createHighlighter : typeof getHighlighter === 'function' ? getHighlighter : null;
    if (!factory) throw new Error('Shiki highlighter factory missing');

    const highlighter = (await factory({
      themes: ['github-dark', 'github-light'],
      langs: ['tsx', 'ts', 'jsx', 'js', 'json', 'bash', 'markdown', 'css', 'html', 'diff'],
    })) as unknown;

    if (!isHighlighter(highlighter)) throw new Error('Shiki highlighter missing codeToHtml');
    return highlighter;
  })();

  return cached;
}

