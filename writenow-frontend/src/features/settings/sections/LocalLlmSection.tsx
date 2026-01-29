/**
 * LocalLlmSection - Local LLM Tab completion settings.
 *
 * Why: Extracted from SettingsPanel for better maintainability.
 */

import { useCallback, useMemo } from 'react';
import { useTranslation } from 'react-i18next';

import { Button } from '@/components/ui';
import { useLocalLlm } from '@/lib/electron';

import {
  SettingError,
  SettingInput,
  SettingItem,
  SettingSection,
  SettingSelect,
  SettingSwitch,
} from '../components';

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

export function LocalLlmSection() {
  const { t } = useTranslation();
  const localLlm = useLocalLlm();

  const localLlmSettings = localLlm.settings;
  const state = localLlm.state;
  const models = localLlm.models;
  const installedModelIds = localLlm.installedModelIds;

  const selectedModelId = localLlmSettings?.modelId ?? '';
  const selectedModel = useMemo(
    () => models.find((m) => m.id === selectedModelId) ?? null,
    [models, selectedModelId],
  );

  const selectedInstalled = selectedModelId ? installedModelIds.includes(selectedModelId) : false;
  const downloading = state?.status === 'downloading';
  const progress = state?.progress ?? null;
  const totalBytes = progress?.totalBytes ?? selectedModel?.sizeBytes;
  const receivedBytes = progress?.receivedBytes ?? 0;
  const percent = totalBytes
    ? Math.min(100, Math.max(0, Math.round((receivedBytes / totalBytes) * 100)))
    : null;

  const modelOptions = useMemo(
    () => models.map((m) => ({ value: m.id, label: m.label })),
    [models],
  );

  const applyNumberSetting = useCallback(
    async (key: 'maxTokens' | 'temperature' | 'timeoutMs' | 'idleDelayMs', raw: string) => {
      const value = Number(raw);
      if (!Number.isFinite(value)) return;
      if (key === 'maxTokens') {
        await localLlm.updateSettings({ maxTokens: value });
        return;
      }
      if (key === 'temperature') {
        await localLlm.updateSettings({ temperature: value });
        return;
      }
      if (key === 'timeoutMs') {
        await localLlm.updateSettings({ timeoutMs: value });
        return;
      }
      await localLlm.updateSettings({ idleDelayMs: value });
    },
    [localLlm],
  );

  const handleDownload = useCallback(async () => {
    if (!selectedModelId) return;
    const hintSize = selectedModel?.sizeBytes ? formatBytes(selectedModel.sizeBytes) : '';
    const storageHint = 'app.getPath("userData")/models';
    const confirmed = window.confirm(
      t('settings.localLlm.downloadConfirm', { size: hintSize, path: storageHint }),
    );
    if (!confirmed) return;
    await localLlm.ensureModel({ modelId: selectedModelId, allowDownload: true });
  }, [localLlm, selectedModel, selectedModelId, t]);

  const handleDisableAndClean = useCallback(async () => {
    if (!selectedModelId) return;
    const confirmed = window.confirm(t('settings.localLlm.disableConfirm'));
    if (!confirmed) return;
    await localLlm.updateSettings({ enabled: false });
    await localLlm.removeModel({ modelId: selectedModelId });
  }, [localLlm, selectedModelId, t]);

  if (!localLlm.supported) {
    return (
      <SettingSection title={t('settings.section.localLlm')}>
        <div className="text-[11px] text-[var(--fg-muted)]">
          {t('settings.localLlm.notSupported')}
        </div>
      </SettingSection>
    );
  }

  return (
    <SettingSection title={t('settings.section.localLlm')}>
      <SettingSwitch
        label={t('settings.localLlm.enable')}
        description={t('settings.localLlm.enableDesc')}
        checked={Boolean(localLlmSettings?.enabled)}
        onCheckedChange={(checked) => void localLlm.updateSettings({ enabled: checked })}
        disabled={!localLlmSettings}
        data-testid="settings-local-llm-enable"
      />

      {/* Model Selection */}
      <SettingItem label={t('settings.localLlm.model')}>
        <SettingSelect
          value={selectedModelId}
          options={modelOptions}
          onChange={(v) => void localLlm.updateSettings({ modelId: v })}
          disabled={!localLlmSettings || models.length === 0}
          data-testid="settings-local-llm-model-select"
        />
      </SettingItem>

      {/* Model Info */}
      <div className="text-[10px] text-[var(--fg-muted)] leading-relaxed space-y-0.5">
        <div>
          {t('settings.localLlm.storagePath')}
          <code>app.getPath("userData")/models</code>
        </div>
        {selectedModel?.sha256 && (
          <div>
            SHA256：<code className="break-all">{selectedModel.sha256}</code>
          </div>
        )}
      </div>

      {/* Action Buttons */}
      <div className="flex items-center gap-2 flex-wrap">
        {!selectedInstalled && selectedModel?.url && (
          <Button
            variant="primary"
            size="sm"
            loading={downloading}
            disabled={downloading || localLlm.loading}
            onClick={() => void handleDownload()}
            data-testid="settings-local-llm-download"
          >
            {t('settings.localLlm.download')}
          </Button>
        )}

        {selectedInstalled && (
          <Button
            variant="secondary"
            size="sm"
            disabled={downloading || localLlm.loading}
            onClick={() =>
              void localLlm.ensureModel({ modelId: selectedModelId, allowDownload: false })
            }
            data-testid="settings-local-llm-verify"
          >
            {t('settings.localLlm.verify')}
          </Button>
        )}

        <Button
          variant="danger"
          size="sm"
          disabled={downloading || localLlm.loading || !selectedModelId}
          onClick={() => void handleDisableAndClean()}
          data-testid="settings-local-llm-disable"
        >
          {t('settings.localLlm.disableClean')}
        </Button>
      </div>

      {/* Status */}
      <div className="text-[11px] text-[var(--fg-muted)]">
        {t('settings.localLlm.status')}
        <span className="text-[var(--fg-default)]">{state?.status ?? 'unknown'}</span>
        {state?.modelId && (
          <span className="text-[var(--fg-subtle)]">（{state.modelId}）</span>
        )}
      </div>

      {/* Download Progress */}
      {downloading && (
        <div className="space-y-1">
          <div className="h-2 w-full rounded-full bg-[var(--bg-elevated)] border border-[var(--border-subtle)] overflow-hidden">
            <div
              className="h-full bg-[var(--accent-default)] transition-[width] duration-200"
              style={{ width: percent === null ? '25%' : `${percent}%` }}
            />
          </div>
          <div className="text-[10px] text-[var(--fg-muted)]">
            {formatBytes(receivedBytes)}
            {totalBytes ? ` / ${formatBytes(totalBytes)}` : ''}
            {percent === null ? '' : `（${percent}%）`}
          </div>
        </div>
      )}

      {/* Advanced Settings Grid */}
      <div className="grid grid-cols-2 gap-3 pt-2 border-t border-[var(--border-subtle)]">
        <SettingItem label={t('settings.localLlm.idleDelay')}>
          <SettingInput
            type="number"
            min={200}
            step={50}
            key={`idleDelayMs:${localLlmSettings?.idleDelayMs ?? ''}`}
            defaultValue={localLlmSettings ? String(localLlmSettings.idleDelayMs) : ''}
            onBlur={(e) => void applyNumberSetting('idleDelayMs', e.currentTarget.value)}
          />
        </SettingItem>

        <SettingItem label={t('settings.localLlm.timeout')}>
          <SettingInput
            type="number"
            min={1000}
            step={500}
            key={`timeoutMs:${localLlmSettings?.timeoutMs ?? ''}`}
            defaultValue={localLlmSettings ? String(localLlmSettings.timeoutMs) : ''}
            onBlur={(e) => void applyNumberSetting('timeoutMs', e.currentTarget.value)}
          />
        </SettingItem>

        <SettingItem label={t('settings.localLlm.maxTokens')}>
          <SettingInput
            type="number"
            min={8}
            step={8}
            key={`maxTokens:${localLlmSettings?.maxTokens ?? ''}`}
            defaultValue={localLlmSettings ? String(localLlmSettings.maxTokens) : ''}
            onBlur={(e) => void applyNumberSetting('maxTokens', e.currentTarget.value)}
          />
        </SettingItem>

        <SettingItem label={t('settings.localLlm.temperature')}>
          <SettingInput
            type="number"
            min={0}
            step={0.1}
            key={`temperature:${localLlmSettings?.temperature ?? ''}`}
            defaultValue={localLlmSettings ? String(localLlmSettings.temperature) : ''}
            onBlur={(e) => void applyNumberSetting('temperature', e.currentTarget.value)}
          />
        </SettingItem>
      </div>

      <SettingError message={localLlm.error} />
    </SettingSection>
  );
}
