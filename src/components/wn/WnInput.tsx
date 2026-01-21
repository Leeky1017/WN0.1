import React from 'react';

export type WnInputSize = 'sm' | 'md';

export type WnInputProps = Omit<React.InputHTMLAttributes<HTMLInputElement>, 'disabled'> & {
  size?: WnInputSize;
  isDisabled?: boolean;
};

/**
 * Why: Ensure inputs share the same border/focus treatment backed by tokens.
 */
export const WnInput = React.forwardRef<HTMLInputElement, WnInputProps>(function WnInput(
  { size = 'md', isDisabled = false, className, ...props },
  ref,
) {
  const sizeClass = size === 'sm' ? 'h-8 px-3 text-[13px]' : 'h-9 px-3 text-[13px]';
  const classes = ['wn-input', sizeClass, 'w-full', 'outline-none', className].filter(Boolean).join(' ');
  return <input ref={ref} className={classes} disabled={isDisabled} {...props} />;
});

