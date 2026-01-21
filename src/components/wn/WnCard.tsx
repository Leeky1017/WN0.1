import React from 'react';

export type WnCardProps = React.HTMLAttributes<HTMLDivElement> & {
  isActive?: boolean;
};

/**
 * Why: Provide a consistent card surface for chapter/scene planning views (and future kanban-style UIs) without
 * re-implementing border/shadow/hover behavior in every feature component.
 */
export function WnCard({ isActive = false, className, ...props }: WnCardProps) {
  const base = 'wn-elevated rounded-lg border border-[var(--border-subtle)] transition-colors';
  const activeClass = isActive ? 'border-[var(--accent-primary)]/60' : '';
  const classes = [base, activeClass, className].filter(Boolean).join(' ');
  return <div className={classes} {...props} />;
}

