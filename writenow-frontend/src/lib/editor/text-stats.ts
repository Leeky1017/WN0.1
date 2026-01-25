/**
 * Text stats helpers for StatusBar.
 * Why: Word count expectations differ for CJK vs whitespace-delimited languages. We match the existing WriteNow
 * behavior: count each CJK character as one "word" and count non-CJK words by whitespace.
 */

export type TextStats = {
  chars: number;
  words: number;
  readingMinutes: number;
};

export function computeTextStats(text: string): TextStats {
  const normalized = typeof text === 'string' ? text : '';
  const chars = normalized.length;

  // Chinese word count: treat each CJK character as one word.
  const cjkChars = (normalized.match(/[\u4e00-\u9fff\u3400-\u4dbf]/g) ?? []).length;
  const nonCjkWords = normalized
    .replace(/[\u4e00-\u9fff\u3400-\u4dbf]/g, ' ')
    .split(/\s+/)
    .filter((w) => w.length > 0).length;

  const words = cjkChars + nonCjkWords;

  // Reading time: approximate (language-mixed) baseline.
  const readingMinutes = Math.max(1, Math.ceil(words / 250));

  return { chars, words, readingMinutes };
}

