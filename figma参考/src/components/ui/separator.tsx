import * as React from "react"

interface SeparatorProps {
  orientation?: 'horizontal' | 'vertical'
  className?: string
}

const Separator = React.forwardRef<HTMLDivElement, SeparatorProps>(
  ({ orientation = 'horizontal', className = '', ...props }, ref) => (
    <div
      ref={ref}
      className={`bg-[#3c3c3c] ${
        orientation === 'horizontal' ? 'h-[1px] w-full' : 'h-full w-[1px]'
      } ${className}`}
      {...props}
    />
  )
)
Separator.displayName = "Separator"

export { Separator }
