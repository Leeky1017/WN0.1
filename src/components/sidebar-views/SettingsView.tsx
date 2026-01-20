import React, { useEffect, useMemo, useState } from 'react';
import { RefreshCw } from 'lucide-react';
import { useTranslation } from 'react-i18next';

import type { UpdateState } from '../../types/ipc';
import { IpcError, updateOps } from '../../lib/ipc';
import { toUserMessage } from '../../lib/errors';

function isUpdateState(value: unknown): value is UpdateState {
  if (!value || typeof value !== 'object') return false;
  const obj = value as Record<string, unknown>;
  return typeof obj.status === 'string' && typeof obj.currentVersion === 'string';
}

function formatTime(language: string, iso?: string): string {
  if (!iso) return '-';
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return '-';
  return date.toLocaleString(language, { year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit' });
}

export function SettingsView() {
  const { i18n, t } = useTranslation();
  const [updateState, setUpdateState] = useState<UpdateState | null>(null);
  const [updateBusy, setUpdateBusy] = useState(false);
  const [updateMessage, setUpdateMessage] = useState<string | null>(null);

  useEffect(() => {
    let mounted = true;

    updateOps
      .getState()
      .then((state) => {
        if (!mounted) return;
        setUpdateState(state);
      })
      .catch(() => undefined);

    const api = window.writenow;
    const handler = (next: unknown) => {
      if (!mounted) return;
      if (isUpdateState(next)) setUpdateState(next);
    };

    try {
      api?.on?.('update:stateChanged', handler);
    } catch {
      // ignore
    }

    return () => {
      mounted = false;
      try {
        api?.off?.('update:stateChanged', handler);
      } catch {
        // ignore
      }
    };
  }, []);

  const updateStatusLabel = useMemo(() => {
    const status = updateState?.status ?? 'idle';
    const key = `settings.update.status.${status}`;
    const translated = t(key);
    return translated !== key ? translated : status;
  }, [t, updateState?.status]);

  const latestVersion = updateState?.latest?.version ?? '-';

  const updateDetail = useMemo(() => {
    if (!updateState?.error) return null;
    if (updateState.error.code === 'UNSUPPORTED') return t('settings.update.unsupported');
    return toUserMessage(updateState.error.code, updateState.error.message);
  }, [t, updateState?.error]);

  async function handleCheckUpdate() {
    setUpdateMessage(null);
    setUpdateBusy(true);
    try {
      await updateOps.check({ channel: 'stable', allowPrerelease: false });
    } catch (error) {
      const message =
        error instanceof IpcError
          ? error.code === 'UNSUPPORTED'
            ? t('settings.update.unsupported')
            : toUserMessage(error.code, error.message)
          : error instanceof Error
            ? error.message
            : String(error);
      setUpdateMessage(message);
    } finally {
      setUpdateBusy(false);
    }
  }

  async function handleInstall() {
    if (!updateState?.downloadId) return;
    setUpdateMessage(null);
    setUpdateBusy(true);
    try {
      await updateOps.install(updateState.downloadId);
    } catch (error) {
      const message =
        error instanceof IpcError
          ? error.code === 'UNSUPPORTED'
            ? t('settings.update.unsupported')
            : toUserMessage(error.code, error.message)
          : error instanceof Error
            ? error.message
            : String(error);
      setUpdateMessage(message);
    } finally {
      setUpdateBusy(false);
    }
  }

  function handleLater() {
    setUpdateMessage(null);
  }

  async function handleSkip() {
    const version = updateState?.latest?.version;
    if (!version) return;
    setUpdateMessage(null);
    setUpdateBusy(true);
    try {
      await updateOps.skipVersion(version);
    } catch (error) {
      const message =
        error instanceof IpcError
          ? error.code === 'UNSUPPORTED'
            ? t('settings.update.unsupported')
            : toUserMessage(error.code, error.message)
          : error instanceof Error
            ? error.message
            : String(error);
      setUpdateMessage(message);
    } finally {
      setUpdateBusy(false);
    }
  }

  async function handleClearSkipped() {
    setUpdateMessage(null);
    setUpdateBusy(true);
    try {
      await updateOps.clearSkipped();
    } catch (error) {
      const message =
        error instanceof IpcError
          ? error.code === 'UNSUPPORTED'
            ? t('settings.update.unsupported')
            : toUserMessage(error.code, error.message)
          : error instanceof Error
            ? error.message
            : String(error);
      setUpdateMessage(message);
    } finally {
      setUpdateBusy(false);
    }
  }

  const canInstall = updateState?.status === 'downloaded' && Boolean(updateState.downloadId);
  const canSkip = Boolean(updateState?.latest?.version) && updateState?.latest?.version !== updateState?.skippedVersion;
  const canClearSkipped = Boolean(updateState?.skippedVersion);

  return (
    <>
      <div className="h-11 flex items-center justify-between px-3 border-b border-[var(--border-subtle)]">
        <span className="text-[11px] uppercase text-[var(--text-tertiary)] font-medium tracking-wide">{t('settings.title')}</span>
      </div>

      <div className="overflow-y-auto p-3 space-y-4">
        <div className="wn-elevated rounded-md p-3">
          <div className="text-[12px] text-[var(--text-secondary)] mb-2">{t('settings.language.title')}</div>
          <div className="flex flex-col gap-2">
            <label className="flex items-center gap-2 text-[12px] text-[var(--text-secondary)]">
              <input
                type="radio"
                name="language"
                checked={i18n.language === 'zh-CN'}
                onChange={() => i18n.changeLanguage('zh-CN').catch(() => undefined)}
              />
              {t('settings.language.zhCN')}
            </label>
            <label className="flex items-center gap-2 text-[12px] text-[var(--text-secondary)]">
              <input
                type="radio"
                name="language"
                checked={i18n.language === 'en'}
                onChange={() => i18n.changeLanguage('en').catch(() => undefined)}
              />
              {t('settings.language.en')}
            </label>
          </div>
        </div>

        <div className="wn-elevated rounded-md p-3">
          <div className="flex items-center justify-between gap-2 mb-2">
            <div className="text-[12px] text-[var(--text-secondary)]">{t('settings.update.title')}</div>
            <button
              type="button"
              onClick={() => handleCheckUpdate().catch(() => undefined)}
              className="h-7 px-2.5 rounded-md bg-[var(--bg-tertiary)] hover:bg-[var(--bg-hover)] text-[12px] text-[var(--text-secondary)] transition-colors flex items-center gap-1.5 disabled:opacity-60"
              disabled={updateBusy}
            >
              <RefreshCw className={`w-3.5 h-3.5 ${updateBusy ? 'animate-spin' : ''}`} />
              {t('settings.update.check')}
            </button>
          </div>

          <div className="grid grid-cols-2 gap-2 text-[12px] text-[var(--text-tertiary)]">
            <div>
              {t('settings.update.currentVersion')}: <span className="text-[var(--text-secondary)]">{updateState?.currentVersion ?? '-'}</span>
            </div>
            <div>
              {t('settings.update.latestVersion')}: <span className="text-[var(--text-secondary)]">{latestVersion}</span>
            </div>
            <div>
              {t('settings.update.lastCheckedAt')}: <span className="text-[var(--text-secondary)]">{formatTime(i18n.language, updateState?.lastCheckedAt)}</span>
            </div>
            <div>
              {t('settings.update.title')}: <span className="text-[var(--text-secondary)]">{updateStatusLabel}</span>
            </div>
          </div>

          {updateState?.status === 'downloading' && updateState.progress && (
            <div className="mt-3">
              <div className="text-[12px] text-[var(--text-tertiary)] mb-1">
                {t('settings.update.status.downloading')} {Math.round(updateState.progress.percent)}%
              </div>
              <div className="h-1.5 bg-[var(--bg-tertiary)] rounded">
                <div
                  className="h-1.5 bg-[var(--accent-primary)] rounded"
                  style={{ width: `${Math.max(0, Math.min(100, updateState.progress.percent))}%` }}
                />
              </div>
            </div>
          )}

          <div className="flex flex-wrap gap-2 mt-3">
            <button
              type="button"
              onClick={() => handleInstall().catch(() => undefined)}
              disabled={!canInstall || updateBusy}
              className="h-7 px-2.5 rounded-md bg-[var(--accent-primary)] hover:bg-[var(--accent-hover)] text-white text-[12px] transition-colors disabled:opacity-60"
            >
              {t('settings.update.install')}
            </button>
            {canInstall && (
              <button
                type="button"
                onClick={handleLater}
                disabled={updateBusy}
                className="h-7 px-2.5 rounded-md bg-[var(--bg-tertiary)] hover:bg-[var(--bg-hover)] text-[12px] text-[var(--text-secondary)] transition-colors disabled:opacity-60"
              >
                {t('settings.update.later')}
              </button>
            )}
            <button
              type="button"
              onClick={() => handleSkip().catch(() => undefined)}
              disabled={!canSkip || updateBusy}
              className="h-7 px-2.5 rounded-md bg-[var(--bg-tertiary)] hover:bg-[var(--bg-hover)] text-[12px] text-[var(--text-secondary)] transition-colors disabled:opacity-60"
            >
              {t('settings.update.skip')}
            </button>
            <button
              type="button"
              onClick={() => handleClearSkipped().catch(() => undefined)}
              disabled={!canClearSkipped || updateBusy}
              className="h-7 px-2.5 rounded-md bg-[var(--bg-tertiary)] hover:bg-[var(--bg-hover)] text-[12px] text-[var(--text-secondary)] transition-colors disabled:opacity-60"
            >
              {t('settings.update.clearSkipped')}
            </button>
          </div>

          {(updateMessage || updateDetail) && (
            <div className="mt-3 text-[12px] text-[var(--text-tertiary)]">
              {updateMessage ? updateMessage : updateDetail}
            </div>
          )}
        </div>
      </div>
    </>
  );
}
