/**
 * ToolbarButton
 * Why: Keep editor toolbar interactions consistent (hover/active/tooltip) while staying token-driven.
 */

import type { ReactNode } from 'react';

import { cn } from '@/lib/utils';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui';

export interface ToolbarButtonProps {
  icon: ReactNode;
  tooltip: string;
  isActive?: boolean;
  disabled?: boolean;
  onClick: () => void;
}

export function ToolbarButton(props: ToolbarButtonProps) {
  const { icon, tooltip, isActive = false, disabled = false, onClick } = props;

  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <button
          type="button"
          disabled={disabled}
          onClick={onClick}
          className={cn(
            'inline-flex items-center justify-center rounded-[var(--radius-sm)] px-2 py-1.5 text-[var(--fg-muted)]',
            'hover:bg-[var(--bg-hover)] hover:text-[var(--fg-default)]',
            'disabled:opacity-50 disabled:pointer-events-none',
            isActive && 'bg-[var(--bg-active)] text-[var(--accent-default)]',
          )}
        >
          {icon}
        </button>
      </TooltipTrigger>
      <TooltipContent>{tooltip}</TooltipContent>
    </Tooltip>
  );
}

export default ToolbarButton;
