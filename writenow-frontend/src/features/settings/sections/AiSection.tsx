/**
 * AiSection - API Key configuration for cloud AI models.
 *
 * Why: Extracted from SettingsPanel for better maintainability.
 */

import { useTranslation } from 'react-i18next';

import { Button } from '@/components/ui';

import { SettingInput, SettingItem, SettingSection } from '../components';

export interface AiSectionProps {
  apiKey: string;
  setApiKey: (key: string) => Promise<void>;
}

export function AiSection({ apiKey, setApiKey }: AiSectionProps) {
  const { t } = useTranslation();

  return (
    <SettingSection title={t('settings.section.ai')} hint={t('settings.ai.hint')}>
      <SettingItem label={t('settings.ai.apiKeyLabel')}>
        <SettingInput
          type="password"
          key={`aiApiKey:${apiKey ? 'set' : 'empty'}`}
          defaultValue={apiKey}
          onBlur={(e) => void setApiKey(e.currentTarget.value)}
          placeholder="sk-..."
          data-testid="settings-ai-api-key-input"
        />
      </SettingItem>

      <div className="flex items-center gap-2">
        <Button
          variant="secondary"
          size="sm"
          disabled={!apiKey}
          onClick={() => void setApiKey('')}
          data-testid="settings-ai-clear-key"
        >
          {t('common.clear')}
        </Button>
      </div>
    </SettingSection>
  );
}
