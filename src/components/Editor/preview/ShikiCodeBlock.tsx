import React, { useEffect, useMemo, useState } from 'react';

import type { WnShikiTheme } from './shiki';
import { getWnShikiHighlighter } from './shiki';
import { getWnPreviewTheme } from './theme';

export type ShikiCodeBlockProps = {
  code: string;
  language?: string;
  isLite?: boolean;
};

function toShikiTheme(appTheme: 'dark' | 'light'): WnShikiTheme {
  return appTheme === 'light' ? 'github-light' : 'github-dark';
}

function normalizeLanguage(language?: string): string {
  const raw = (language || '').trim().toLowerCase();
  if (!raw) return 'text';
  if (raw === 'js') return 'javascript';
  if (raw === 'ts') return 'typescript';
  if (raw === 'md') return 'markdown';
  return raw;
}

/**
 * Why: Code highlighting must stay in sync with app theme (Light/Dark) while keeping
 * preview responsive (async init + cached highlighter).
 */
export function ShikiCodeBlock({ code, language, isLite = false }: ShikiCodeBlockProps) {
  const [html, setHtml] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const theme = toShikiTheme(getWnPreviewTheme());
  const lang = useMemo(() => normalizeLanguage(language), [language]);
  const trimmed = useMemo(() => code.replace(/\n$/, ''), [code]);

  useEffect(() => {
    if (isLite) return;
    let cancelled = false;

    Promise.resolve().then(() => {
      if (cancelled) return;
      setHtml(null);
      setError(null);
    });

    getWnShikiHighlighter()
      .then((highlighter) => {
        if (cancelled) return;
        const rendered = highlighter.codeToHtml(trimmed, { lang, theme });
        setError(null);
        setHtml(rendered);
      })
      .catch((e) => {
        if (cancelled) return;
        setHtml(null);
        setError(e instanceof Error ? e.message : String(e));
      });

    return () => {
      cancelled = true;
    };
  }, [isLite, lang, theme, trimmed]);

  if (isLite || error || !html) {
    return (
      <pre className="wn-elevated p-3 overflow-x-auto">
        <code className="font-mono text-[13px] leading-[1.6]">{trimmed}</code>
      </pre>
    );
  }

  return <div dangerouslySetInnerHTML={{ __html: html }} />;
}
