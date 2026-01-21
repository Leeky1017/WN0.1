import React from 'react';

export type WnButtonVariant = 'primary' | 'secondary' | 'ghost';
export type WnButtonSize = 'sm' | 'md' | 'lg' | 'icon';

export type WnButtonProps = Omit<React.ButtonHTMLAttributes<HTMLButtonElement>, 'disabled'> & {
  variant?: WnButtonVariant;
  size?: WnButtonSize;
  isDisabled?: boolean;
};

/**
 * Why: Standardize button density/interaction and ensure colors are token-driven.
 */
export const WnButton = React.forwardRef<HTMLButtonElement, WnButtonProps>(function WnButton(
  { variant = 'primary', size = 'md', isDisabled = false, className, type = 'button', ...props },
  ref,
) {
  const variantClass =
    variant === 'primary' ? 'wn-button-primary' : variant === 'secondary' ? 'wn-button-secondary' : 'wn-button-ghost';
  const sizeClass =
    size === 'icon'
      ? 'h-8 w-8'
      : size === 'sm'
        ? 'h-8 px-3 text-[12px]'
        : size === 'lg'
          ? 'h-10 px-6 text-[14px]'
          : 'h-9 px-4 text-[13px]';

  const classes = ['wn-button', variantClass, sizeClass, className].filter(Boolean).join(' ');

  return <button ref={ref} type={type} className={classes} disabled={isDisabled} {...props} />;
});

