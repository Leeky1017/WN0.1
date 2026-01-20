import React from 'react';

import type { ConstraintViolation } from '../../types/constraints';

type ViolationMarkerProps = {
  text: string;
  violations: ConstraintViolation[];
};

function compareLevel(a: ConstraintViolation['level'], b: ConstraintViolation['level']): number {
  const rank = (level: ConstraintViolation['level']) => {
    if (level === 'error') return 3;
    if (level === 'warning') return 2;
    return 1;
  };
  return rank(b) - rank(a);
}

function getTitle(violations: ConstraintViolation[]): string {
  return violations
    .map((v) => {
      const parts = [`[${v.level.toUpperCase()}] ${v.type}: ${v.message}`];
      if (v.suggestion) parts.push(`建议：${v.suggestion}`);
      return parts.join(' ');
    })
    .join('\n');
}

export function ViolationMarker({ text, violations }: ViolationMarkerProps) {
  const sorted = [...violations].sort((a, b) => compareLevel(a.level, b.level));
  const top = sorted[0];

  const className =
    top.level === 'error'
      ? 'underline decoration-2 decoration-red-400/80'
      : top.level === 'warning'
        ? 'underline decoration-2 decoration-amber-400/80'
        : 'underline decoration-2 decoration-sky-400/80';

  return (
    <span data-testid="diff-violation-marker" className={className} title={getTitle(sorted)}>
      {text}
    </span>
  );
}
