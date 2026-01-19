import * as React from "react"

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'default' | 'secondary' | 'ghost' | 'icon'
  size?: 'default' | 'sm' | 'lg' | 'icon'
}

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className = '', variant = 'default', size = 'default', ...props }, ref) => {
    const baseStyles = 'inline-flex items-center justify-center rounded-md font-medium transition-all duration-150 focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-[#007acc] disabled:pointer-events-none disabled:opacity-40'
    
    const variants = {
      default: 'bg-[#007acc] text-white hover:bg-[#005a9e] active:bg-[#004c87] shadow-sm',
      secondary: 'bg-[#3c3c3c] text-[#cccccc] hover:bg-[#4c4c4c] active:bg-[#505050]',
      ghost: 'hover:bg-[#2a2d2e] text-[#cccccc] active:bg-[#323436]',
      icon: 'hover:bg-[#2a2d2e] text-[#888888] hover:text-[#cccccc] active:bg-[#323436]',
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
