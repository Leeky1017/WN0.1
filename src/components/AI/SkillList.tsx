import React, { useEffect, useState } from 'react';
import { Sparkles } from 'lucide-react';
import { useTranslation } from 'react-i18next';

import { useSkillsStore } from '../../stores/skillsStore';
import { SkillStudio } from '../SkillStudio';

type SkillListProps = {
  canRun: boolean;
  onRun: (skill: { id: string; name: string }) => Promise<void>;
};

/**
 * Renders the SKILL list from the indexed Skill System.
 * Why: the renderer must not maintain a separate hardcoded skill source; IPC + DB index are the SSOT for availability.
 */
export function SkillList(props: SkillListProps) {
  const { t } = useTranslation();
  const items = useSkillsStore((s) => s.items);
  const isLoading = useSkillsStore((s) => s.isLoading);
  const error = useSkillsStore((s) => s.error);
  const refresh = useSkillsStore((s) => s.refresh);
  const toggle = useSkillsStore((s) => s.toggle);
  const [studio, setStudio] = useState<{ mode: 'create' | 'edit'; skillId?: string } | null>(null);

  useEffect(() => {
    refresh({ includeDisabled: true }).catch(() => undefined);
  }, [refresh]);

  useEffect(() => {
    const api = window.writenow;
    const handler = (payload: unknown) => {
      const obj = payload && typeof payload === 'object' ? (payload as Record<string, unknown>) : null;
      const ids = Array.isArray(obj?.skillIds) ? obj?.skillIds : [];
      if (ids.length === 0) return;
      refresh({ includeDisabled: true }).catch(() => undefined);
    };

    try {
      api?.on?.('skills:changed', handler);
    } catch {
      // ignore
    }

    return () => {
      try {
        api?.off?.('skills:changed', handler);
      } catch {
        // ignore
      }
    };
  }, [refresh]);

  if (isLoading && items.length === 0) {
    return <div className="text-[12px] text-[var(--text-tertiary)] px-2 py-2">{t('skills.loading')}</div>;
  }

  if (error && items.length === 0) {
    return (
      <div className="px-2 py-2 space-y-2">
        <div className="text-[12px] text-[var(--text-tertiary)]">{t('skills.loadFailed', { error })}</div>
        <button
          type="button"
          onClick={() => refresh({ includeDisabled: true }).catch(() => undefined)}
          className="text-[12px] text-[var(--accent-primary)] hover:underline"
        >
          {t('common.retry')}
        </button>
      </div>
    );
  }

  if (items.length === 0) {
    return <div className="text-[12px] text-[var(--text-tertiary)] px-2 py-2">{t('skills.empty')}</div>;
  }

  return (
    <div className="flex flex-col gap-2">
      <div className="flex items-center justify-end gap-2">
        <button
          type="button"
          onClick={() => setStudio({ mode: 'create' })}
          className="text-[12px] px-2 py-1 rounded border border-[var(--border-subtle)] hover:bg-[var(--bg-hover)]"
          data-testid="skill-studio-new"
        >
          {t('skills.actions.new')}
        </button>
      </div>
      {items.map((skill) => {
        const runnable = props.canRun && skill.enabled && skill.valid;
        const scope = t(`skills.scope.${skill.scope}`, { defaultValue: skill.scope.toUpperCase() });
        const version = skill.version ?? '';
        const errorMessage = skill.valid ? null : skill.error?.message ?? t('skills.invalid');
        const canEdit = skill.scope !== 'builtin';

        return (
          <div
            key={skill.id}
            className="wn-elevated rounded-md border border-[var(--border-subtle)] px-2 py-2 flex items-start justify-between gap-3"
          >
            <button
              type="button"
              onClick={() => props.onRun({ id: skill.id, name: skill.name }).catch(() => undefined)}
              disabled={!runnable}
              data-testid={`ai-skill-${skill.id}`}
              className="flex-1 min-w-0 text-left flex items-start gap-2 group disabled:opacity-50 disabled:pointer-events-none"
              title={skill.description}
            >
              <div className="w-7 h-7 rounded-md bg-[var(--bg-tertiary)] border border-[var(--border-subtle)] flex items-center justify-center text-[var(--text-tertiary)] group-hover:text-[var(--accent-primary)] transition-colors flex-shrink-0">
                <Sparkles className="w-4 h-4" />
              </div>
              <div className="min-w-0">
                <div className="flex items-center gap-2 min-w-0">
                  <div className="text-[13px] text-[var(--text-secondary)] leading-tight truncate">{skill.name}</div>
                  <span className="text-[10px] px-1.5 py-0.5 rounded bg-[var(--bg-tertiary)] text-[var(--text-tertiary)] border border-[var(--border-subtle)] flex-shrink-0 uppercase tracking-wide">
                    {scope}
                  </span>
                  {version && (
                    <span className="text-[10px] px-1.5 py-0.5 rounded bg-[var(--bg-tertiary)] text-[var(--text-tertiary)] border border-[var(--border-subtle)] flex-shrink-0">
                      {t('skills.versionTag', { version })}
                    </span>
                  )}
                </div>
                {skill.description && <div className="text-xs text-[var(--text-tertiary)] truncate">{skill.description}</div>}
                {errorMessage && <div className="text-xs text-[var(--danger)] mt-1 break-words">{errorMessage}</div>}
              </div>
            </button>

            <div className="flex flex-col items-end gap-2 flex-shrink-0">
              {canEdit && (
                <button
                  type="button"
                  onClick={() => setStudio({ mode: 'edit', skillId: skill.id })}
                  className="text-[12px] px-2 py-1 rounded border border-[var(--border-subtle)] hover:bg-[var(--bg-hover)]"
                >
                  {t('common.edit')}
                </button>
              )}
              <label className="flex items-center gap-2 text-xs text-[var(--text-tertiary)] select-none">
                <span className="uppercase tracking-wide">{skill.enabled ? t('skills.toggle.on') : t('skills.toggle.off')}</span>
                <input type="checkbox" checked={skill.enabled} onChange={(e) => toggle(skill.id, e.target.checked).catch(() => undefined)} />
              </label>
            </div>
          </div>
        );
      })}

      {studio && (
        <SkillStudio
          mode={studio.mode}
          skillId={studio.mode === 'edit' ? studio.skillId : undefined}
          onClose={() => setStudio(null)}
        />
      )}
    </div>
  );
}
