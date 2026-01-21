import React from 'react';

export type WnPanelVariant = 'surface' | 'elevated';
export type WnPanelPadding = 'none' | 'sm' | 'md' | 'lg';

export type WnPanelProps = React.HTMLAttributes<HTMLDivElement> & {
  variant?: WnPanelVariant;
  padding?: WnPanelPadding;
};

/**
 * Why: Provide a token-backed panel container so feature UIs stop hand-coding
 * background/border/shadow details and can migrate consistently.
 */
export function WnPanel({ variant = 'elevated', padding = 'md', className, ...props }: WnPanelProps) {
  const variantClass = variant === 'elevated' ? 'wn-elevated' : 'wn-panel-surface';
  const paddingClass =
    padding === 'none' ? '' : padding === 'sm' ? 'p-3' : padding === 'md' ? 'p-4' : 'p-6';

  const classes = [variantClass, paddingClass, className].filter(Boolean).join(' ');

  return <div className={classes} {...props} />;
}

