import React, { useEffect, useMemo, useState } from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import remarkMath from 'remark-math';
import rehypeKatex from 'rehype-katex';
import { useTranslation } from 'react-i18next';

import 'katex/dist/katex.min.css';

import { MermaidDiagram } from './preview/MermaidDiagram';
import { ShikiCodeBlock } from './preview/ShikiCodeBlock';

export type MarkdownPreviewProps = {
  markdown: string;
};

const LARGE_DOC_THRESHOLD = 150_000;
const PREVIEW_DEBOUNCE_MS = 120;
const PREVIEW_DEBOUNCE_LARGE_MS = 420;

function asText(children: React.ReactNode): string {
  if (typeof children === 'string') return children;
  if (Array.isArray(children)) return children.map((c) => (typeof c === 'string' ? c : '')).join('');
  return '';
}

/**
 * Why: Markdown preview must be full-fidelity (GFM + KaTeX + Mermaid + code highlight)
 * while staying responsive for large documents (debounce + lite-mode strategy).
 */
export function MarkdownPreview({ markdown }: MarkdownPreviewProps) {
  const { t } = useTranslation();
  const [debounced, setDebounced] = useState(markdown);
  const isLarge = markdown.length >= LARGE_DOC_THRESHOLD;

  useEffect(() => {
    const delay = isLarge ? PREVIEW_DEBOUNCE_LARGE_MS : PREVIEW_DEBOUNCE_MS;
    const id = window.setTimeout(() => setDebounced(markdown), delay);
    return () => window.clearTimeout(id);
  }, [isLarge, markdown]);

  const remarkPlugins = useMemo(() => {
    if (isLarge) return [remarkGfm];
    return [remarkGfm, remarkMath];
  }, [isLarge]);

  const rehypePlugins = useMemo(() => {
    if (isLarge) return [];
    return [rehypeKatex];
  }, [isLarge]);

  return (
    <div className="wn-markdown">
      {isLarge && (
        <div className="text-[11px] text-[var(--text-tertiary)] mb-3">
          {t('editor.preview.liteModeHint')}
        </div>
      )}
      <ReactMarkdown
        remarkPlugins={remarkPlugins}
        rehypePlugins={rehypePlugins}
        components={{
          code: ({ inline, className, children }) => {
            const text = asText(children);
            if (inline) return <code>{text}</code>;

            const match = /language-(\S+)/.exec(className || '');
            const language = match ? match[1] : undefined;
            if (language === 'mermaid') return <MermaidDiagram code={text} isLite={isLarge} />;
            return <ShikiCodeBlock code={text} language={language} isLite={isLarge} />;
          },
        }}
      >
        {debounced}
      </ReactMarkdown>
    </div>
  );
}
