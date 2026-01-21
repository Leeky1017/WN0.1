import React, { useEffect, useId, useMemo, useState } from 'react';

import { getWnPreviewTheme } from './theme';

export type MermaidDiagramProps = {
  code: string;
  isLite?: boolean;
};

type MermaidTheme = 'default' | 'dark';

function toMermaidTheme(theme: 'dark' | 'light'): MermaidTheme {
  return theme === 'light' ? 'default' : 'dark';
}

let mermaidInit = { done: false, theme: null as MermaidTheme | null };

/**
 * Why: Mermaid render must be safe-by-default (securityLevel=strict) and theme-aware.
 */
export function MermaidDiagram({ code, isLite = false }: MermaidDiagramProps) {
  const id = useId();
  const [svg, setSvg] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const trimmed = useMemo(() => code.trim(), [code]);
  const theme = toMermaidTheme(getWnPreviewTheme());

  useEffect(() => {
    if (isLite) return;
    if (!trimmed) return;
    let cancelled = false;
    setError(null);
    setSvg(null);

    const run = async () => {
      const mod = await import('mermaid');
      const mermaid = (mod && 'default' in mod ? (mod.default as unknown) : (mod as unknown)) as {
        initialize?: (cfg: Record<string, unknown>) => void;
        render?: (id: string, text: string) => Promise<{ svg: string }>;
      };

      if (typeof mermaid.initialize !== 'function' || typeof mermaid.render !== 'function') {
        throw new Error('Mermaid API unavailable');
      }

      if (!mermaidInit.done || mermaidInit.theme !== theme) {
        mermaid.initialize({ startOnLoad: false, securityLevel: 'strict', theme });
        mermaidInit = { done: true, theme };
      }

      const out = await mermaid.render(`wn-mermaid-${id.replace(/:/g, '')}`, trimmed);
      if (cancelled) return;
      setSvg(out.svg);
    };

    run().catch((e) => {
      if (cancelled) return;
      setError(e instanceof Error ? e.message : String(e));
    });

    return () => {
      cancelled = true;
    };
  }, [id, isLite, theme, trimmed]);

  if (isLite) {
    return (
      <pre className="wn-elevated p-3 overflow-x-auto">
        <code className="font-mono text-[13px] leading-[1.6]">{trimmed}</code>
      </pre>
    );
  }

  if (error) {
    return (
      <div className="wn-mermaid">
        <div className="text-[11px] text-[var(--text-tertiary)] mb-2">Mermaid render failed: {error}</div>
        <pre className="overflow-x-auto">
          <code className="font-mono text-[13px] leading-[1.6]">{trimmed}</code>
        </pre>
      </div>
    );
  }

  if (!svg) {
    return (
      <div className="wn-mermaid text-[12px] text-[var(--text-tertiary)]">
        Rendering Mermaid…
      </div>
    );
  }

  return <div className="wn-mermaid" dangerouslySetInnerHTML={{ __html: svg }} />;
}
