/**
 * ProxySection - AI Proxy (LiteLLM) configuration.
 *
 * Why: Extracted from SettingsPanel for better maintainability.
 */

import { useCallback, useState } from 'react';
import { useTranslation } from 'react-i18next';

import { Button } from '@/components/ui';
import { useAiProxySettings } from '@/lib/rpc/useAiProxySettings';

import {
  SettingError,
  SettingInput,
  SettingItem,
  SettingSection,
  SettingSwitch,
} from '../components';

export function ProxySection() {
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
      setTestResult({ success: false, message: t('settings.proxy.enterUrlFirst') });
      return;
    }
    setTesting(true);
    setTestResult(null);
    const result = await aiProxy.testConnection(baseUrl);
    setTestResult(result);
    setTesting(false);
  }, [aiProxy, baseUrl, t]);

  return (
    <SettingSection
      title={t('settings.section.aiProxyAdvanced')}
      defaultCollapsed
      hint={t('settings.proxy.hint')}
    >
      <div className="text-[10px] text-[var(--fg-muted)] leading-relaxed">
        {t('settings.proxy.recommend')}{' '}
        <a
          href="https://docs.litellm.ai/"
          target="_blank"
          rel="noopener noreferrer"
          className="underline hover:text-[var(--fg-default)] transition-colors"
        >
          LiteLLM
        </a>{' '}
        {t('settings.proxy.asProxy')}
      </div>

      <SettingSwitch
        label={t('settings.proxy.enable')}
        description={t('settings.proxy.enableDesc')}
        checked={Boolean(aiProxy.settings?.enabled)}
        onCheckedChange={(checked) => void handleToggle(checked)}
        disabled={aiProxy.loading}
        data-testid="settings-proxy-enable"
      />

      <SettingItem label={t('settings.proxy.baseUrl')}>
        <SettingInput
          key={`baseUrl:${baseUrl}`}
          defaultValue={baseUrl}
          onBlur={(e) => void handleBaseUrlChange(e.currentTarget.value)}
          placeholder="http://localhost:4000"
          data-testid="settings-proxy-base-url"
        />
      </SettingItem>

      <SettingItem label={t('settings.proxy.apiKey')}>
        <SettingInput
          type="password"
          key={`apiKey:${hasApiKey}`}
          defaultValue={hasApiKey ? '••••••••' : ''}
          onBlur={(e) => void handleApiKeyChange(e.currentTarget.value)}
          placeholder="sk-..."
          data-testid="settings-proxy-api-key"
        />
      </SettingItem>

      <div className="flex items-center gap-2">
        <Button
          variant="secondary"
          size="sm"
          loading={testing}
          disabled={testing || !baseUrl}
          onClick={() => void handleTest()}
          data-testid="settings-proxy-test"
        >
          {t('settings.proxy.testConnection')}
        </Button>
      </div>

      {testResult && (
        <SettingError
          message={testResult.message}
          variant={testResult.success ? 'success' : 'error'}
        />
      )}

      <SettingError message={aiProxy.error} />
    </SettingSection>
  );
}
