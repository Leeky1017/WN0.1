import React, { useEffect, useMemo, useRef, useState } from 'react';
import { Copy, AlertTriangle } from 'lucide-react';
import { useTranslation } from 'react-i18next';

import { clipboardOps, IpcError } from '../../lib/ipc';
import { toUserMessage } from '../../lib/errors';
import { generatePublishContent } from '../../lib/publish';
import type { PublishPlatform } from '../../lib/publish';
import { useEditorStore } from '../../stores/editorStore';

function getTitleFromPath(path: string | null): string {
  const raw = typeof path === 'string' ? path.trim() : '';
  if (!raw) return 'Untitled';
  return raw.toLowerCase().endsWith('.md') ? raw.slice(0, -3) : raw;
}

export function PublishView() {
  const { t } = useTranslation();
  const currentPath = useEditorStore((s) => s.currentPath);
  const content = useEditorStore((s) => s.content);

  const [platform, setPlatform] = useState<PublishPlatform>('wechat');
  const [stripLinks, setStripLinks] = useState(false);
  const [copyMessage, setCopyMessage] = useState<string | null>(null);
  const clearTimerRef = useRef<number | null>(null);

  const title = getTitleFromPath(currentPath);

  const result = useMemo(() => {
    return generatePublishContent(platform, { title, markdown: content }, { stripLinks });
  }, [content, platform, stripLinks, title]);

  const platformOptions: Array<{ id: PublishPlatform; label: string }> = [
    { id: 'wechat', label: t('publish.platform.wechat') },
    { id: 'zhihu', label: t('publish.platform.zhihu') },
    { id: 'xiaohongshu', label: t('publish.platform.xiaohongshu') },
    { id: 'toutiao', label: t('publish.platform.toutiao') },
    { id: 'medium', label: t('publish.platform.medium') },
  ];

  useEffect(() => {
    return () => {
      if (clearTimerRef.current) window.clearTimeout(clearTimerRef.current);
    };
  }, []);

  function showCopyMessage(message: string) {
    setCopyMessage(message);
    if (clearTimerRef.current) window.clearTimeout(clearTimerRef.current);
    clearTimerRef.current = window.setTimeout(() => setCopyMessage(null), 3000);
  }

  async function handleCopy() {
    try {
      if (result.format === 'html') {
        await clipboardOps.writeHtml(result.content, content);
      } else {
        await clipboardOps.writeText(result.content);
      }
      showCopyMessage(t('common.copied'));
    } catch (error) {
      const message =
        error instanceof IpcError
          ? toUserMessage(error.code, error.message)
          : error instanceof Error
            ? error.message
            : String(error);
      showCopyMessage(t('publish.copyFailed', { error: message }));
    }
  }

  const selectedPlatformLabel = platformOptions.find((p) => p.id === platform)?.label ?? platform;

  return (
    <>
      <div className="h-11 flex items-center justify-between px-3 border-b border-[var(--border-subtle)]">
        <span className="text-[11px] uppercase text-[var(--text-tertiary)] font-medium tracking-wide">{t('publish.title')}</span>
      </div>

      <div className="flex-1 overflow-y-auto p-3 space-y-3">
        <div className="space-y-2">
          <div className="text-[11px] uppercase text-[var(--text-tertiary)] font-medium tracking-wide">{t('publish.title')}</div>
          <div className="flex flex-wrap gap-2">
            {platformOptions.map((p) => (
              <button
                key={p.id}
                type="button"
                onClick={() => setPlatform(p.id)}
                className={`h-7 px-2.5 rounded-md text-[12px] transition-colors ${
                  platform === p.id
                    ? 'bg-[var(--bg-active)] text-[var(--text-primary)]'
                    : 'bg-[var(--bg-tertiary)] hover:bg-[var(--bg-hover)] text-[var(--text-secondary)]'
                }`}
              >
                {p.label}
              </button>
            ))}
          </div>
        </div>

        <label className="flex items-center gap-2 text-[12px] text-[var(--text-secondary)] select-none">
          <input
            type="checkbox"
            checked={stripLinks}
            onChange={(e) => setStripLinks(e.target.checked)}
            className="accent-[var(--accent-primary)]"
          />
          {t('publish.options.stripLinks')}
        </label>

        {result.warnings.length > 0 && (
          <div className="wn-elevated rounded-md p-3">
            <div className="flex items-center gap-2 text-[12px] text-[var(--text-secondary)] mb-2">
              <AlertTriangle className="w-4 h-4 text-yellow-400" />
              <span>{t('publish.warnings')}</span>
            </div>
            <ul className="space-y-1">
              {result.warnings.map((key) => (
                <li key={key} className="text-[12px] text-[var(--text-tertiary)] leading-[1.5]">
                  • {t(key)}
                </li>
              ))}
            </ul>
          </div>
        )}

        <div className="wn-elevated rounded-md p-3">
          <div className="flex items-center justify-between gap-2 mb-2">
            <div className="text-[12px] text-[var(--text-secondary)]">{t('publish.preview')}</div>
            <button
              type="button"
              onClick={() => handleCopy().catch(() => undefined)}
              className="h-7 px-2.5 rounded-md bg-[var(--accent-primary)] hover:bg-[var(--accent-hover)] text-white text-[12px] transition-colors flex items-center gap-1.5"
              aria-label={t('publish.copyFor', { platform: selectedPlatformLabel })}
            >
              <Copy className="w-3.5 h-3.5" />
              {t('publish.copyFor', { platform: selectedPlatformLabel })}
            </button>
          </div>
          <textarea
            value={result.content}
            readOnly
            className="w-full min-h-[220px] bg-[var(--bg-tertiary)] border border-[var(--border-default)] rounded-md p-2 text-[12px] text-[var(--text-secondary)] font-mono leading-[1.5] outline-none"
          />
          {copyMessage && <div className="mt-2 text-[12px] text-[var(--text-tertiary)]">{copyMessage}</div>}
        </div>
      </div>
    </>
  );
}
