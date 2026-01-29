/**
 * ConnectionSection - Advanced RPC URL configuration.
 *
 * Why: Extracted from SettingsPanel for better maintainability.
 */

import { useCallback, useState } from 'react';
import { useTranslation } from 'react-i18next';

import { Button } from '@/components/ui';
import { useRpcConnection } from '@/lib/hooks';
import { rpcClient } from '@/lib/rpc';
import { aiClient } from '@/lib/rpc/ai-client';
import { skillsClient } from '@/lib/rpc/skills-client';
import { getRpcWsUrl, getUserRpcWsUrlOverride, setUserRpcWsUrlOverride } from '@/lib/rpc/rpcUrl';

import { SettingError, SettingInput, SettingItem, SettingSection } from '../components';

export function ConnectionSection() {
  const { t } = useTranslation();

  const [rpcUrlOverride, setRpcUrlOverride] = useState(() => getUserRpcWsUrlOverride() ?? '');
  const resolvedRpcUrl = getRpcWsUrl();
  const rpc = useRpcConnection({ autoConnect: false, url: resolvedRpcUrl });
  const [rpcApplying, setRpcApplying] = useState(false);
  const [rpcApplyError, setRpcApplyError] = useState<string | null>(null);

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
      setRpcApplyError(error instanceof Error ? error.message : t('settings.connection.connectFailed'));
    } finally {
      setRpcApplying(false);
    }
  }, [rpcUrlOverride, t]);

  return (
    <SettingSection title={t('settings.section.connectionAdvanced')} defaultCollapsed>
      <div className="text-[10px] text-[var(--fg-muted)] leading-relaxed space-y-1">
        <div>{t('settings.connection.priority')}</div>
        <div>
          {t('settings.connection.currentUsing')}
          <code className="break-all">{resolvedRpcUrl}</code>
        </div>
        <div>
          {t('settings.connection.status')}
          <span className="text-[var(--fg-default)]">{rpc.status}</span>
        </div>
      </div>

      <SettingItem label={t('settings.connection.urlLabel')}>
        <SettingInput
          value={rpcUrlOverride}
          onChange={(e) => setRpcUrlOverride(e.currentTarget.value)}
          placeholder="ws://localhost:3000/standalone-rpc"
          data-testid="settings-connection-url-input"
        />
      </SettingItem>

      <div className="flex items-center gap-2">
        <Button
          variant="primary"
          size="sm"
          loading={rpcApplying}
          onClick={() => void handleApplyRpcUrl()}
          data-testid="settings-connection-apply"
        >
          {t('settings.connection.applyReconnect')}
        </Button>
        <Button
          variant="secondary"
          size="sm"
          disabled={!rpcUrlOverride || rpcApplying}
          onClick={() => setRpcUrlOverride('')}
          data-testid="settings-connection-clear"
        >
          {t('settings.connection.clear')}
        </Button>
      </div>

      <SettingError message={rpcApplyError ?? rpc.error} />
    </SettingSection>
  );
}
