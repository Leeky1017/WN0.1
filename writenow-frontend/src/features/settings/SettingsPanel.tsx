/**
 * SettingsPanel (sidebar)
 * Why: Host user-facing configuration, including Local LLM Tab completion opt-in + model management.
 */

import { useCallback, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';

import { SidebarPanelSection } from '@/components/layout/sidebar-panel';
import { Button, Input, Switch } from '@/components/ui';
import { UpdateSection } from '@/features/update';
import { normalizeAppLanguage, setStoredLanguage, type AppLanguage } from '@/lib/i18n/i18n';
import { useRpcConnection } from '@/lib/hooks';
import { useLocalLlm } from '@/lib/electron';
import { rpcClient } from '@/lib/rpc';
import { aiClient } from '@/lib/rpc/ai-client';
import { skillsClient } from '@/lib/rpc/skills-client';
import { getRpcWsUrl, getUserRpcWsUrlOverride, setUserRpcWsUrlOverride } from '@/lib/rpc/rpcUrl';
import { useAiProxySettings } from '@/lib/rpc/useAiProxySettings';
import type { Theme } from '@/lib/theme/themeManager';
import type { EditorMode } from '@/stores';

import { useSettings } from './useSettings';

const THEME_OPTIONS = [
  { value: 'system', label: '跟随系统' },
  { value: 'midnight', label: 'Midnight（默认）' },
  { value: 'dark', label: 'Dark' },
  { value: 'light', label: 'Light' },
  { value: 'high-contrast', label: 'High Contrast' },
] as const satisfies readonly { value: Theme; label: string }[];

const EDITOR_MODE_OPTIONS = [
  { value: 'richtext', label: '富文本（TipTap）' },
  { value: 'markdown', label: 'Markdown' },
] as const satisfies readonly { value: EditorMode; label: string }[];

const LANGUAGE_OPTIONS = [
  { value: 'zh-CN', label: '简体中文' },
  { value: 'en', label: 'English' },
] as const satisfies readonly { value: AppLanguage; label: string }[];

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

export function SettingsPanel() {
  const { t, i18n } = useTranslation();
  const appSettings = useSettings();
  const localLlm = useLocalLlm();

  const localLlmSettings = localLlm.settings;
  const state = localLlm.state;
  const models = localLlm.models;
  const installedModelIds = localLlm.installedModelIds;

  const selectedModelId = localLlmSettings?.modelId ?? '';
  const selectedModel = useMemo(() => models.find((m) => m.id === selectedModelId) ?? null, [models, selectedModelId]);

  const selectedInstalled = selectedModelId ? installedModelIds.includes(selectedModelId) : false;
  const downloading = state?.status === 'downloading';
  const progress = state?.progress ?? null;
  const totalBytes = progress?.totalBytes ?? selectedModel?.sizeBytes;
  const receivedBytes = progress?.receivedBytes ?? 0;
  const percent = totalBytes ? Math.min(100, Math.max(0, Math.round((receivedBytes / totalBytes) * 100))) : null;

  const [rpcUrlOverride, setRpcUrlOverride] = useState(() => getUserRpcWsUrlOverride() ?? '');
  const resolvedRpcUrl = getRpcWsUrl();
  const rpc = useRpcConnection({ autoConnect: false, url: resolvedRpcUrl });
  const [rpcApplying, setRpcApplying] = useState(false);
  const [rpcApplyError, setRpcApplyError] = useState<string | null>(null);

  const language = useMemo(() => normalizeAppLanguage(i18n.language), [i18n.language]);
  const handleLanguageChange = useCallback(
    async (next: AppLanguage) => {
      setStoredLanguage(next);
      await i18n.changeLanguage(next);
    },
    [i18n],
  );

  const handleApplyRpcUrl = useCallback(async () => {
    setRpcApplyError(null);
    setRpcApplying(true);
    try {
      setUserRpcWsUrlOverride(rpcUrlOverride);
      setRpcUrlOverride(getUserRpcWsUrlOverride() ?? '');
      const nextUrl = getRpcWsUrl();
      await rpcClient.connect(nextUrl);
      // Keep other shared JSON-RPC clients consistent with the main backend URL.
      await Promise.all([aiClient.connect(nextUrl), skillsClient.connect(nextUrl)]);
    } catch (error) {
      setRpcApplyError(error instanceof Error ? error.message : '连接失败');
    } finally {
      setRpcApplying(false);
    }
  }, [rpcUrlOverride]);

  const applyMemoryThreshold = useCallback(
    async (raw: string) => {
      const value = Number(raw);
      if (!Number.isFinite(value)) return;
      await appSettings.updateMemorySettings({ preferenceLearningThreshold: value });
    },
    [appSettings],
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
      `将下载本地模型${hintSize ? `（约 ${hintSize}）` : ''}到 ${storageHint}。\n下载完成后离线可用。\n\n继续？`,
    );
    if (!confirmed) return;
    await localLlm.ensureModel({ modelId: selectedModelId, allowDownload: true });
  }, [localLlm, selectedModel, selectedModelId]);

  const handleDisableAndClean = useCallback(async () => {
    if (!selectedModelId) return;
    const confirmed = window.confirm('将禁用本地续写，并删除已下载的模型文件（不会删除自定义路径）。继续？');
    if (!confirmed) return;
    await localLlm.updateSettings({ enabled: false });
    await localLlm.removeModel({ modelId: selectedModelId });
  }, [localLlm, selectedModelId]);

  return (
    <div className="p-3 space-y-3">
      <SidebarPanelSection title={t('settings.section.appearance')}>
        <div className="px-2 space-y-3">
          <div className="space-y-1">
            <div className="text-[10px] text-[var(--fg-muted)]">{t('settings.label.language')}</div>
            <select
              value={language}
              aria-label={t('settings.label.language')}
              data-testid="settings-language-select"
              onChange={(e) => void handleLanguageChange(normalizeAppLanguage(e.target.value))}
              className="w-full h-8 rounded-md border border-[var(--border-default)] bg-[var(--bg-input)] text-[12px] px-2"
            >
              {LANGUAGE_OPTIONS.map((opt) => (
                <option key={opt.value} value={opt.value}>
                  {opt.label}
                </option>
              ))}
            </select>
            <div className="text-[10px] text-[var(--fg-muted)] leading-relaxed">{t('settings.label.languageHint')}</div>
          </div>

          <div className="space-y-1">
            <div className="text-[10px] text-[var(--fg-muted)]">{t('settings.label.theme')}</div>
            <select
              value={appSettings.theme}
              onChange={(e) => {
                const next = THEME_OPTIONS.find((opt) => opt.value === e.target.value)?.value;
                if (!next) return;
                appSettings.setTheme(next);
              }}
              className="w-full h-8 rounded-md border border-[var(--border-default)] bg-[var(--bg-input)] text-[12px] px-2"
            >
              {THEME_OPTIONS.map((opt) => (
                <option key={opt.value} value={opt.value}>
                  {opt.label}
                </option>
              ))}
            </select>
          </div>

          <div className="space-y-1">
            <div className="text-[10px] text-[var(--fg-muted)]">{t('settings.label.editorMode')}</div>
            <select
              value={appSettings.defaultEditorMode}
              onChange={(e) => {
                const next = EDITOR_MODE_OPTIONS.find((opt) => opt.value === e.target.value)?.value;
                if (!next) return;
                appSettings.setDefaultEditorMode(next);
              }}
              className="w-full h-8 rounded-md border border-[var(--border-default)] bg-[var(--bg-input)] text-[12px] px-2"
            >
              {EDITOR_MODE_OPTIONS.map((opt) => (
                <option key={opt.value} value={opt.value}>
                  {opt.label}
                </option>
              ))}
            </select>
          </div>
        </div>
      </SidebarPanelSection>

      <UpdateSection />

      <SidebarPanelSection title={t('settings.section.ai')}>
        <div className="px-2 space-y-2">
          <div className="text-[10px] text-[var(--fg-muted)] leading-relaxed">
            API Key 将用于请求云端模型；本地续写（Tab）与 AI 代理可独立配置。
          </div>
          <Input
            inputSize="sm"
            type="password"
            key={`aiApiKey:${appSettings.aiApiKey ? 'set' : 'empty'}`}
            defaultValue={appSettings.aiApiKey}
            onBlur={(e) => void appSettings.setAiApiKey(e.currentTarget.value)}
            placeholder="sk-..."
          />
          <div className="flex items-center gap-2">
            <Button
              variant="secondary"
              size="sm"
              disabled={!appSettings.aiApiKey}
              onClick={() => void appSettings.setAiApiKey('')}
            >
              清除
            </Button>
          </div>
        </div>
      </SidebarPanelSection>

      <SidebarPanelSection title={t('settings.section.memory')}>
        <div className="px-2 space-y-3">
          {appSettings.memoryLoading && (
            <div className="text-[11px] text-[var(--fg-muted)]">正在加载记忆设置…</div>
          )}

          <div className="flex items-center justify-between">
            <div className="flex flex-col">
              <div className="text-[12px] font-semibold text-[var(--fg-default)]">记忆注入</div>
              <div className="text-[10px] text-[var(--fg-muted)] mt-0.5">将相关记忆注入到 AI 上下文中（可随时关闭）</div>
            </div>
            <Switch
              checked={Boolean(appSettings.memorySettings?.injectionEnabled)}
              onCheckedChange={(checked) => void appSettings.updateMemorySettings({ injectionEnabled: checked })}
              disabled={!appSettings.memorySettings || appSettings.memoryLoading}
            />
          </div>

          <div className="flex items-center justify-between">
            <div className="flex flex-col">
              <div className="text-[12px] font-semibold text-[var(--fg-default)]">偏好学习</div>
              <div className="text-[10px] text-[var(--fg-muted)] mt-0.5">根据你的接受/拒绝行为自动总结偏好</div>
            </div>
            <Switch
              checked={Boolean(appSettings.memorySettings?.preferenceLearningEnabled)}
              onCheckedChange={(checked) => void appSettings.updateMemorySettings({ preferenceLearningEnabled: checked })}
              disabled={!appSettings.memorySettings || appSettings.memoryLoading}
            />
          </div>

          <div className="flex items-center justify-between">
            <div className="flex flex-col">
              <div className="text-[12px] font-semibold text-[var(--fg-default)]">隐私模式</div>
              <div className="text-[10px] text-[var(--fg-muted)] mt-0.5">开启后将减少/停用偏好学习与记忆写入</div>
            </div>
            <Switch
              checked={Boolean(appSettings.memorySettings?.privacyModeEnabled)}
              onCheckedChange={(checked) => void appSettings.updateMemorySettings({ privacyModeEnabled: checked })}
              disabled={!appSettings.memorySettings || appSettings.memoryLoading}
            />
          </div>

          <div className="space-y-1">
            <div className="text-[10px] text-[var(--fg-muted)]">学习阈值</div>
            <Input
              inputSize="sm"
              type="number"
              min={0}
              step={0.05}
              key={`preferenceLearningThreshold:${appSettings.memorySettings?.preferenceLearningThreshold ?? ''}`}
              defaultValue={
                appSettings.memorySettings ? String(appSettings.memorySettings.preferenceLearningThreshold) : ''
              }
              onBlur={(e) => void applyMemoryThreshold(e.currentTarget.value)}
              disabled={!appSettings.memorySettings || appSettings.memoryLoading || !appSettings.memorySettings?.preferenceLearningEnabled}
            />
            <div className="text-[10px] text-[var(--fg-muted)] leading-relaxed">
              阈值越高越“谨慎”，学习条目更少；阈值越低越“积极”，更容易写入偏好。
            </div>
          </div>

          {appSettings.memoryError && (
            <div className="text-[11px] text-[var(--error)] px-2 py-1 rounded-md border border-[var(--error)]/40 bg-[var(--bg-elevated)]">
              {appSettings.memoryError}
            </div>
          )}
        </div>
      </SidebarPanelSection>

      <SidebarPanelSection title={t('settings.section.connectionAdvanced')} defaultCollapsed>
        <div className="px-2 space-y-2">
          <div className="text-[10px] text-[var(--fg-muted)] leading-relaxed">
            {t('settings.connection.priority')}
            <br />
            {t('settings.connection.currentUsing')}<code className="break-all">{resolvedRpcUrl}</code>
            <br />
            {t('settings.connection.status')}<span className="text-[var(--fg-default)]">{rpc.status}</span>
          </div>

          <Input
            inputSize="sm"
            value={rpcUrlOverride}
            onChange={(e) => setRpcUrlOverride(e.currentTarget.value)}
            placeholder="ws://localhost:3000/standalone-rpc"
          />

          <div className="flex items-center gap-2">
            <Button variant="primary" size="sm" loading={rpcApplying} onClick={() => void handleApplyRpcUrl()}>
              {t('settings.connection.applyReconnect')}
            </Button>
            <Button
              variant="secondary"
              size="sm"
              disabled={!rpcUrlOverride || rpcApplying}
              onClick={() => setRpcUrlOverride('')}
            >
              {t('settings.connection.clear')}
            </Button>
          </div>

          {(rpcApplyError || rpc.error) && (
            <div className="text-[11px] text-[var(--error)] px-2 py-1 rounded-md border border-[var(--error)]/40 bg-[var(--bg-elevated)]">
              {rpcApplyError ?? rpc.error}
            </div>
          )}
        </div>
      </SidebarPanelSection>

      <SidebarPanelSection title={t('settings.section.localLlm')}>
        {!localLlm.supported && (
          <div className="px-2 py-2 text-[11px] text-[var(--fg-muted)]">
            当前构建未暴露 `electronAPI.localLlm`，无法启用本地续写。
          </div>
        )}

        {localLlm.supported && (
          <div className="space-y-3">
            <div className="flex items-center justify-between px-2">
              <div className="flex flex-col">
                <div className="text-[12px] font-semibold text-[var(--fg-default)]">启用（停顿触发 / 灰色预览 / Tab 接受 / Esc 取消）</div>
                <div className="text-[10px] text-[var(--fg-muted)] mt-0.5">默认关闭；不会自动下载模型，需你确认后手动下载。</div>
              </div>
              <Switch
                checked={Boolean(localLlmSettings?.enabled)}
                onCheckedChange={(checked) => {
                  void localLlm.updateSettings({ enabled: checked });
                }}
                disabled={!localLlmSettings}
              />
            </div>

            <div className="px-2 space-y-2">
              <div className="text-[11px] font-semibold text-[var(--fg-muted)]">模型</div>
              <select
                value={selectedModelId}
                onChange={(e) => void localLlm.updateSettings({ modelId: e.target.value })}
                className="w-full h-8 rounded-md border border-[var(--border-default)] bg-[var(--bg-input)] text-[12px] px-2"
                disabled={!localLlmSettings || models.length === 0}
              >
                {models.map((m) => (
                  <option key={m.id} value={m.id}>
                    {m.label}
                  </option>
                ))}
              </select>

              <div className="text-[10px] text-[var(--fg-muted)] leading-relaxed">
                <div>存储位置：<code>app.getPath("userData")/models</code></div>
                {selectedModel?.sha256 && <div>SHA256：<code className="break-all">{selectedModel.sha256}</code></div>}
              </div>

              <div className="flex items-center gap-2">
                {!selectedInstalled && selectedModel?.url && (
                  <Button
                    variant="primary"
                    size="sm"
                    loading={downloading}
                    disabled={downloading || localLlm.loading}
                    onClick={() => void handleDownload()}
                  >
                    下载模型
                  </Button>
                )}

                {selectedInstalled && (
                  <Button
                    variant="secondary"
                    size="sm"
                    disabled={downloading || localLlm.loading}
                    onClick={() => void localLlm.ensureModel({ modelId: selectedModelId, allowDownload: false })}
                  >
                    校验/加载
                  </Button>
                )}

                <Button
                  variant="danger"
                  size="sm"
                  disabled={downloading || localLlm.loading || !selectedModelId}
                  onClick={() => void handleDisableAndClean()}
                >
                  禁用并清理
                </Button>
              </div>

              <div className="text-[11px] text-[var(--fg-muted)]">
                状态：<span className="text-[var(--fg-default)]">{state?.status ?? 'unknown'}</span>
                {state?.modelId ? <span className="text-[var(--fg-subtle)]">（{state.modelId}）</span> : null}
              </div>

              {downloading && (
                <div className="space-y-1">
                  <div className="h-2 w-full rounded-full bg-[var(--bg-elevated)] border border-[var(--border-subtle)] overflow-hidden">
                    <div
                      className="h-full bg-[var(--accent-default)]"
                      style={{ width: percent === null ? '25%' : `${percent}%` }}
                    />
                  </div>
                  <div className="text-[10px] text-[var(--fg-muted)]">
                    {formatBytes(receivedBytes)}
                    {totalBytes ? ` / ${formatBytes(totalBytes)}` : ''}{percent === null ? '' : `（${percent}%）`}
                  </div>
                </div>
              )}

              {localLlm.error && (
                <div className="text-[11px] text-[var(--error)] px-2 py-1 rounded-md border border-[var(--error)]/40 bg-[var(--bg-elevated)]">
                  {localLlm.error}
                </div>
              )}
            </div>

            <div className="px-2 grid grid-cols-2 gap-2">
              <div className="space-y-1">
                <div className="text-[10px] text-[var(--fg-muted)]">停顿阈值 (ms)</div>
                <Input
                  inputSize="sm"
                  key={`idleDelayMs:${localLlmSettings?.idleDelayMs ?? ''}`}
                  defaultValue={localLlmSettings ? String(localLlmSettings.idleDelayMs) : ''}
                  onBlur={(e) => void applyNumberSetting('idleDelayMs', e.currentTarget.value)}
                  type="number"
                  min={200}
                  step={50}
                />
              </div>
              <div className="space-y-1">
                <div className="text-[10px] text-[var(--fg-muted)]">超时 (ms)</div>
                <Input
                  inputSize="sm"
                  key={`timeoutMs:${localLlmSettings?.timeoutMs ?? ''}`}
                  defaultValue={localLlmSettings ? String(localLlmSettings.timeoutMs) : ''}
                  onBlur={(e) => void applyNumberSetting('timeoutMs', e.currentTarget.value)}
                  type="number"
                  min={1000}
                  step={500}
                />
              </div>
              <div className="space-y-1">
                <div className="text-[10px] text-[var(--fg-muted)]">Max tokens</div>
                <Input
                  inputSize="sm"
                  key={`maxTokens:${localLlmSettings?.maxTokens ?? ''}`}
                  defaultValue={localLlmSettings ? String(localLlmSettings.maxTokens) : ''}
                  onBlur={(e) => void applyNumberSetting('maxTokens', e.currentTarget.value)}
                  type="number"
                  min={8}
                  step={8}
                />
              </div>
              <div className="space-y-1">
                <div className="text-[10px] text-[var(--fg-muted)]">Temperature</div>
                <Input
                  inputSize="sm"
                  key={`temperature:${localLlmSettings?.temperature ?? ''}`}
                  defaultValue={localLlmSettings ? String(localLlmSettings.temperature) : ''}
                  onBlur={(e) => void applyNumberSetting('temperature', e.currentTarget.value)}
                  type="number"
                  min={0}
                  step={0.1}
                />
              </div>
            </div>
          </div>
        )}
      </SidebarPanelSection>

      <AiProxySection />
    </div>
  );
}

/**
 * AI Proxy (Advanced) section
 * Why: Allow users to configure optional LiteLLM proxy for multi-model support.
 */
function AiProxySection() {
  const { t } = useTranslation();
  const aiProxy = useAiProxySettings();
  const [testing, setTesting] = useState(false);
  const [testResult, setTestResult] = useState<{ success: boolean; message: string } | null>(null);

  // Use derived values from settings, with fallback empty strings
  const baseUrl = aiProxy.settings?.baseUrl ?? '';
  const hasApiKey = aiProxy.settings?.hasApiKey ?? false;

  const handleToggle = useCallback(
    async (enabled: boolean) => {
      await aiProxy.updateSettings({ enabled });
    },
    [aiProxy],
  );

  const handleBaseUrlChange = useCallback(
    async (value: string) => {
      await aiProxy.updateSettings({ baseUrl: value });
    },
    [aiProxy],
  );

  const handleApiKeyChange = useCallback(
    async (value: string) => {
      // Only save if user entered a non-empty, non-placeholder key
      if (value && value !== '••••••••') {
        await aiProxy.updateSettings({ apiKey: value });
      }
    },
    [aiProxy],
  );

  const handleTest = useCallback(async () => {
    if (!baseUrl) {
      setTestResult({ success: false, message: '请先输入代理地址' });
      return;
    }
    setTesting(true);
    setTestResult(null);
    const result = await aiProxy.testConnection(baseUrl);
    setTestResult(result);
    setTesting(false);
  }, [aiProxy, baseUrl]);

  return (
    <SidebarPanelSection title={t('settings.section.aiProxyAdvanced')} defaultCollapsed>
      <div className="space-y-3">
        <div className="px-2 py-2 text-[10px] text-[var(--fg-muted)] leading-relaxed">
          启用后，AI 请求将通过代理服务器转发，支持多模型切换、缓存、故障转移等高级功能。
          <br />
          推荐使用 <a href="https://docs.litellm.ai/" target="_blank" rel="noopener noreferrer" className="underline">LiteLLM</a> 作为代理。
        </div>

        <div className="flex items-center justify-between px-2">
          <div className="flex flex-col">
            <div className="text-[12px] font-semibold text-[var(--fg-default)]">启用代理</div>
            <div className="text-[10px] text-[var(--fg-muted)] mt-0.5">开启后 AI 请求将走代理转发</div>
          </div>
          <Switch
            checked={Boolean(aiProxy.settings?.enabled)}
            onCheckedChange={(checked) => void handleToggle(checked)}
            disabled={aiProxy.loading}
          />
        </div>

        <div className="px-2 space-y-2">
          <div className="space-y-1">
            <div className="text-[10px] text-[var(--fg-muted)]">代理地址 (Base URL)</div>
            <Input
              inputSize="sm"
              key={`baseUrl:${baseUrl}`}
              defaultValue={baseUrl}
              onBlur={(e) => void handleBaseUrlChange(e.currentTarget.value)}
              placeholder="http://localhost:4000"
            />
          </div>

          <div className="space-y-1">
            <div className="text-[10px] text-[var(--fg-muted)]">API Key（可选）</div>
            <Input
              inputSize="sm"
              type="password"
              key={`apiKey:${hasApiKey}`}
              defaultValue={hasApiKey ? '••••••••' : ''}
              onBlur={(e) => void handleApiKeyChange(e.currentTarget.value)}
              placeholder="sk-..."
            />
          </div>

          <div className="flex items-center gap-2">
            <Button
              variant="secondary"
              size="sm"
              loading={testing}
              disabled={testing || !baseUrl}
              onClick={() => void handleTest()}
            >
              测试连接
            </Button>
          </div>

          {testResult && (
            <div
              className={`text-[11px] px-2 py-1 rounded-md border ${
                testResult.success
                  ? 'text-[var(--success)] border-[var(--success)]/40 bg-[var(--bg-elevated)]'
                  : 'text-[var(--error)] border-[var(--error)]/40 bg-[var(--bg-elevated)]'
              }`}
            >
              {testResult.message}
            </div>
          )}

          {aiProxy.error && (
            <div className="text-[11px] text-[var(--error)] px-2 py-1 rounded-md border border-[var(--error)]/40 bg-[var(--bg-elevated)]">
              {aiProxy.error}
            </div>
          )}
        </div>
      </div>
    </SidebarPanelSection>
  );
}

export default SettingsPanel;

