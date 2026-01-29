/**
 * SettingInput - Unified input field for settings.
 *
 * Why: Ensures consistent styling for all input elements in settings,
 * with proper design token usage.
 */

import { Input } from '@/components/ui/input';
import { forwardRef } from 'react';

export interface SettingInputProps extends Omit<React.InputHTMLAttributes<HTMLInputElement>, 'size'> {
  /** Visual size variant */
  size?: 'sm' | 'md';
}

export const SettingInput = forwardRef<HTMLInputElement, SettingInputProps>(
  ({ size = 'sm', ...props }, ref) => {
    return <Input ref={ref} inputSize={size} {...props} />;
  },
);

SettingInput.displayName = 'SettingInput';
