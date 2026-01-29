/**
 * SettingSwitch - Convenience wrapper combining SettingItem + Switch for toggle settings.
 *
 * Why: Most settings with switches follow the same pattern (row layout with label/description).
 * This component reduces boilerplate for the common case.
 */

import { Switch } from '@/components/ui';
import { SettingItem } from './SettingItem';

export interface SettingSwitchProps {
  /** Main label text */
  label: string;
  /** Optional description text */
  description?: string;
  /** Current checked state */
  checked: boolean;
  /** Change handler */
  onCheckedChange: (checked: boolean) => void;
  /** Disabled state */
  disabled?: boolean;
  /** Data test ID */
  'data-testid'?: string;
}

export function SettingSwitch({
  label,
  description,
  checked,
  onCheckedChange,
  disabled,
  'data-testid': testId,
}: SettingSwitchProps) {
  return (
    <SettingItem
      label={label}
      description={description}
      layout="row"
      disabled={disabled}
      data-testid={testId}
    >
      <Switch checked={checked} onCheckedChange={onCheckedChange} disabled={disabled} />
    </SettingItem>
  );
}
