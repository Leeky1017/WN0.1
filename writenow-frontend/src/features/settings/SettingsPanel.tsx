/**
 * SettingsPanel (sidebar)
 * Why: Host user-facing configuration, including Local LLM Tab completion opt-in + model management.
 */

import { useCallback, useMemo, useState } from 'react';

import { SidebarPanelSection } from '@/components/layout/sidebar-panel';
import { Button, Input, Switch } from '@/components/ui';
import { useLocalLlm } from '@/lib/electron';
import { useAiProxySettings } from '@/lib/rpc/useAiProxySettings';

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
  const localLlm = useLocalLlm();

  const settings = localLlm.settings;
  const state = localLlm.state;
  const models = localLlm.models;
  const installedModelIds = localLlm.installedModelIds;

  const selectedModelId = settings?.modelId ?? '';
  const selectedModel = useMemo(() => models.find((m) => m.id === selectedModelId) ?? null, [models, selectedModelId]);

  const selectedInstalled = selectedModelId ? installedModelIds.includes(selectedModelId) : false;
  const downloading = state?.status === 'downloading';
  const progress = state?.progress ?? null;
  const totalBytes = progress?.totalBytes ?? selectedModel?.sizeBytes;
  const receivedBytes = progress?.receivedBytes ?? 0;
  const percent = totalBytes ? Math.min(100, Math.max(0, Math.round((receivedBytes / totalBytes) * 100))) : null;

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
      <SidebarPanelSection title="本地 LLM Tab 续写">
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
                checked={Boolean(settings?.enabled)}
                onCheckedChange={(checked) => {
                  void localLlm.updateSettings({ enabled: checked });
                }}
                disabled={!settings}
              />
            </div>

            <div className="px-2 space-y-2">
              <div className="text-[11px] font-semibold text-[var(--fg-muted)]">模型</div>
              <select
                value={selectedModelId}
                onChange={(e) => void localLlm.updateSettings({ modelId: e.target.value })}
                className="w-full h-8 rounded-md border border-[var(--border-default)] bg-[var(--bg-input)] text-[12px] px-2"
                disabled={!settings || models.length === 0}
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
                  key={`idleDelayMs:${settings?.idleDelayMs ?? ''}`}
                  defaultValue={settings ? String(settings.idleDelayMs) : ''}
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
                  key={`timeoutMs:${settings?.timeoutMs ?? ''}`}
                  defaultValue={settings ? String(settings.timeoutMs) : ''}
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
                  key={`maxTokens:${settings?.maxTokens ?? ''}`}
                  defaultValue={settings ? String(settings.maxTokens) : ''}
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
                  key={`temperature:${settings?.temperature ?? ''}`}
                  defaultValue={settings ? String(settings.temperature) : ''}
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
    <SidebarPanelSection title="AI 代理（高级）" defaultCollapsed>
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

