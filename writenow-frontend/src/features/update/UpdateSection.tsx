/**
 * UpdateSection (Settings)
 * Why: Expose update:* management in a user-discoverable place (Settings), with observable states and safe actions.
 */

import { useCallback, useEffect, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';

import { SidebarPanelSection } from '@/components/layout/sidebar-panel';
import { Button } from '@/components/ui';
import { toast } from '@/components/ui/toaster';
import { invoke } from '@/lib/rpc';
import type { UpdateState, UpdateStatus } from '@/types/ipc-generated';

function formatIsoToLocal(iso?: string): string {
  if (!iso) return '—';
  const date = new Date(iso);
  if (!Number.isFinite(date.getTime())) return iso;
  return date.toLocaleString();
}

function formatBytes(bytes: number): string {
  if (!Number.isFinite(bytes) || bytes <= 0) return '0 B';
  const kb = 1024;
  const mb = kb * 1024;
  const gb = mb * 1024;
  if (bytes >= gb) return `${(bytes / gb).toFixed(2)} GB`;
  if (bytes >= mb) return `${(bytes / mb).toFixed(1)} MB`;
  if (bytes >= kb) return `${Math.round(bytes / kb)} KB`;
  return `${Math.round(bytes)} B`;
}

function getStatusText(t: (key: string) => string, status: UpdateStatus): string {
  return t(`update.statusText.${status}`);
}

export function UpdateSection() {
  const { t } = useTranslation();

  const [state, setState] = useState<UpdateState | null>(null);
  const [loading, setLoading] = useState(false);
  const [actionError, setActionError] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    setLoading(true);
    setActionError(null);
    try {
      const next = await invoke('update:getState', {});
      setState(next);
    } catch (error) {
      setActionError(error instanceof Error ? error.message : String(error));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  // Poll state during long-running operations (checking / downloading).
  useEffect(() => {
    if (!state) return;
    if (state.status !== 'checking' && state.status !== 'downloading') return;
    const intervalMs = state.status === 'downloading' ? 500 : 1000;
    const id = setInterval(() => {
      void refresh();
    }, intervalMs);
    return () => clearInterval(id);
  }, [refresh, state]);

  const status: UpdateStatus = state?.status ?? 'idle';
  const statusText = useMemo(() => getStatusText(t, status), [status, t]);

  const currentVersion = state?.currentVersion ?? __VERSION__;
  const latest = state?.latest ?? null;
  const skippedVersion = state?.skippedVersion ?? null;
  const progress = state?.progress ?? null;

  const canCheck = !loading && (status === 'idle' || status === 'not_available' || status === 'available' || status === 'error');
  const canDownload = !loading && status === 'available' && Boolean(latest?.version);
  const canInstall = !loading && status === 'downloaded' && Boolean(state?.downloadId);

  const handleCheck = useCallback(async () => {
    if (!canCheck) return;
    setActionError(null);
    setState((prev) => ({
      status: 'checking',
      currentVersion: prev?.currentVersion ?? __VERSION__,
      lastCheckedAt: prev?.lastCheckedAt,
      latest: prev?.latest,
      skippedVersion: prev?.skippedVersion,
      downloadId: prev?.downloadId,
      progress: prev?.progress,
      error: undefined,
    }));
    try {
      await invoke('update:check', {});
      await refresh();
    } catch (error) {
      setActionError(error instanceof Error ? error.message : String(error));
      setState((prev) => (prev ? { ...prev, status: 'error' } : prev));
    }
  }, [canCheck, refresh]);

  const handleDownload = useCallback(async () => {
    const version = latest?.version;
    if (!version || !canDownload) return;
    setActionError(null);
    setState((prev) => (prev ? { ...prev, status: 'downloading', error: undefined } : prev));
    try {
      const res = await invoke('update:download', { version });
      setState((prev) => (prev ? { ...prev, downloadId: res.downloadId, status: 'downloading' } : prev));
    } catch (error) {
      setActionError(error instanceof Error ? error.message : String(error));
      setState((prev) => (prev ? { ...prev, status: 'error' } : prev));
    }
  }, [canDownload, latest]);

  const handleInstall = useCallback(async () => {
    const downloadId = state?.downloadId;
    if (!downloadId || !canInstall) return;
    setActionError(null);
    try {
      const res = await invoke('update:install', { downloadId });
      if (res.willRestart) {
        toast.success(t('update.install'));
      } else {
        toast.message(t('update.install'));
      }
      await refresh();
    } catch (error) {
      setActionError(error instanceof Error ? error.message : String(error));
    }
  }, [canInstall, refresh, state?.downloadId, t]);

  const handleSkipLatest = useCallback(async () => {
    const version = latest?.version;
    if (!version || loading) return;
    setActionError(null);
    try {
      await invoke('update:skipVersion', { version });
      toast.message(`${t('update.skip')}: ${version}`);
      await refresh();
    } catch (error) {
      setActionError(error instanceof Error ? error.message : String(error));
    }
  }, [latest, loading, refresh, t]);

  const handleClearSkipped = useCallback(async () => {
    if (!skippedVersion || loading) return;
    setActionError(null);
    try {
      await invoke('update:clearSkipped', {});
      toast.message(t('update.clearSkipped'));
      await refresh();
    } catch (error) {
      setActionError(error instanceof Error ? error.message : String(error));
    }
  }, [loading, refresh, skippedVersion, t]);

  return (
    <SidebarPanelSection title={t('settings.section.update')}>
      <div className="px-2 space-y-3" data-testid="settings-update-section">
        <div className="grid grid-cols-2 gap-2 text-[10px] text-[var(--fg-muted)]">
          <div>
            <div className="text-[10px] text-[var(--fg-subtle)]">{t('update.currentVersion')}</div>
            <div className="text-[11px] text-[var(--fg-default)] tabular-nums">{currentVersion}</div>
          </div>
          <div>
            <div className="text-[10px] text-[var(--fg-subtle)]">{t('update.lastCheckedAt')}</div>
            <div className="text-[11px] text-[var(--fg-default)]">{formatIsoToLocal(state?.lastCheckedAt)}</div>
          </div>
        </div>

        <div
          role="status"
          aria-live="polite"
          className="text-[11px] text-[var(--fg-default)]"
          data-testid="update-status"
          data-status={status}
        >
          <span className="text-[var(--fg-subtle)]">{t('update.status')}：</span>
          <span className="font-medium">{statusText}</span>
          <span className="ml-2 text-[10px] text-[var(--fg-muted)]">({status})</span>
        </div>

        {latest?.version && (
          <div className="rounded-md border border-[var(--border-subtle)] bg-[var(--bg-input)] p-2">
            <div className="text-[10px] text-[var(--fg-subtle)]">{t('update.latestVersion')}</div>
            <div className="mt-0.5 text-[11px] text-[var(--fg-default)] tabular-nums">
              {latest.version}
              {latest.publishedAt ? <span className="ml-2 text-[10px] text-[var(--fg-muted)]">{formatIsoToLocal(latest.publishedAt)}</span> : null}
            </div>
            {latest.notes ? (
              <div className="mt-1 text-[10px] text-[var(--fg-muted)] leading-relaxed line-clamp-4">
                {latest.notes}
              </div>
            ) : null}
          </div>
        )}

        {skippedVersion ? (
          <div className="flex items-center justify-between rounded-md border border-[var(--border-subtle)] bg-[var(--bg-elevated)] px-2 py-1.5">
            <div className="text-[10px] text-[var(--fg-muted)]">
              {t('update.skippedVersion')}: <span className="text-[var(--fg-default)] tabular-nums">{skippedVersion}</span>
            </div>
            <Button
              variant="secondary"
              size="sm"
              onClick={() => void handleClearSkipped()}
              disabled={loading}
              data-testid="update-clear-skipped"
            >
              {t('update.clearSkipped')}
            </Button>
          </div>
        ) : null}

        {status === 'downloading' && progress ? (
          <div className="space-y-1">
            <div className="h-2 w-full rounded-full bg-[var(--bg-elevated)] border border-[var(--border-subtle)] overflow-hidden">
              <div className="h-full bg-[var(--accent-default)]" style={{ width: `${Math.max(0, Math.min(100, progress.percent))}%` }} />
            </div>
            <div className="text-[10px] text-[var(--fg-muted)] tabular-nums">
              {Math.round(progress.percent)}% · {formatBytes(progress.transferred)} / {formatBytes(progress.total)} · {formatBytes(progress.bytesPerSecond)}/s
            </div>
          </div>
        ) : null}

        {(actionError || state?.error) ? (
          <div
            role="alert"
            className="text-[11px] text-[var(--error)] px-2 py-1 rounded-md border border-[var(--error)]/40 bg-[var(--bg-elevated)]"
            data-testid="update-error"
          >
            {actionError ?? state?.error?.message ?? t('update.statusText.error')}
          </div>
        ) : null}

        <div className="flex flex-wrap items-center gap-2">
          <Button variant="secondary" size="sm" onClick={() => void refresh()} disabled={loading} data-testid="update-refresh">
            {t('update.refresh')}
          </Button>
          <Button variant="primary" size="sm" onClick={() => void handleCheck()} disabled={!canCheck} data-testid="update-check">
            {t('update.check')}
          </Button>
          <Button variant="secondary" size="sm" onClick={() => void handleDownload()} disabled={!canDownload} data-testid="update-download">
            {t('update.download')}
          </Button>
          <Button variant="danger" size="sm" onClick={() => void handleInstall()} disabled={!canInstall} data-testid="update-install">
            {t('update.install')}
          </Button>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => void handleSkipLatest()}
            disabled={loading || !latest?.version}
            data-testid="update-skip"
          >
            {t('update.skip')}
          </Button>
        </div>
      </div>
    </SidebarPanelSection>
  );
}

export default UpdateSection;

