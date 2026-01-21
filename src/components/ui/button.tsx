import * as React from "react"

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'default' | 'secondary' | 'ghost' | 'icon'
  size?: 'default' | 'sm' | 'lg' | 'icon'
}

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className = '', variant = 'default', size = 'default', ...props }, ref) => {
    const baseStyles =
      'inline-flex items-center justify-center rounded-md font-medium transition-all duration-150 disabled:pointer-events-none disabled:opacity-40'
    
    const variants = {
      default: 'bg-[var(--accent-primary)] text-white hover:bg-[var(--accent-hover)] active:opacity-90 shadow-sm',
      secondary:
        'bg-[var(--bg-tertiary)] text-[var(--text-secondary)] hover:bg-[var(--bg-hover)] active:bg-[var(--bg-active)]',
      ghost: 'hover:bg-[var(--bg-hover)] text-[var(--text-secondary)] active:bg-[var(--bg-active)]',
      icon: 'hover:bg-[var(--bg-hover)] text-[var(--text-tertiary)] hover:text-[var(--text-secondary)] active:bg-[var(--bg-active)]',
    }
    
    const sizes = {
      default: 'h-9 px-4 py-2 text-[13px]',
      sm: 'h-8 px-3 text-[12px]',
      lg: 'h-10 px-6 text-[14px]',
      icon: 'h-8 w-8',
    }
    
    return (
      <button
        className={`${baseStyles} ${variants[variant]} ${sizes[size]} ${className}`}
        ref={ref}
        {...props}
      />
    )
  }
)
Button.displayName = "Button"

export { Button }
