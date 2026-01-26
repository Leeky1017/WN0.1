import * as React from "react"

export interface TextareaProps
  extends React.TextareaHTMLAttributes<HTMLTextAreaElement> {}

const Textarea = React.forwardRef<HTMLTextAreaElement, TextareaProps>(
  ({ className = '', ...props }, ref) => {
    return (
      <textarea
        className={`flex min-h-[60px] w-full rounded-md border border-[#3c3c3c] bg-transparent px-3 py-2 text-sm shadow-sm placeholder:text-[#888888] focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-[#007acc] disabled:cursor-not-allowed disabled:opacity-50 resize-none ${className}`}
        ref={ref}
        {...props}
      />
    )
  }
)
Textarea.displayName = "Textarea"

export { Textarea }
