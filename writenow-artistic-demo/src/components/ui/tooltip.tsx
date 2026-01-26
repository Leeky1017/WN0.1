import * as React from "react"
import * as TooltipPrimitive from "@radix-ui/react-tooltip"
import { cn } from "@/lib/utils"

const TooltipProvider = TooltipPrimitive.Provider
const Tooltip = TooltipPrimitive.Root
const TooltipTrigger = TooltipPrimitive.Trigger

/**
 * TooltipContent component with proper styling using design tokens.
 * 
 * Why: Provides contextual information on hover with consistent styling.
 * Uses elevated background and subtle border for visual hierarchy.
 * 
 * Why shadow-md: Tooltips need moderate elevation to appear above content
 * but not as prominent as modals or popovers.
 */
const TooltipContent = React.forwardRef<
  React.ElementRef<typeof TooltipPrimitive.Content>,
  React.ComponentPropsWithoutRef<typeof TooltipPrimitive.Content>
>(({ className, sideOffset = 4, ...props }, ref) => (
  <TooltipPrimitive.Content
    ref={ref}
    sideOffset={sideOffset}
    className={cn(
      // Base styles
      "z-50 overflow-hidden rounded-md px-3 py-1.5",
      // Background using design tokens
      "bg-[var(--bg-elevated)]",
      // Border using design tokens
      "border border-[var(--border-subtle)]",
      // Text using design tokens
      "text-xs text-[var(--fg-default)]",
      // Shadow using design tokens
      "shadow-[var(--shadow-md)]",
      // Entrance/exit animations
      "animate-in fade-in-0 zoom-in-95",
      "data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=closed]:zoom-out-95",
      // Slide animations based on position
      "data-[side=bottom]:slide-in-from-top-2",
      "data-[side=left]:slide-in-from-right-2",
      "data-[side=right]:slide-in-from-left-2",
      "data-[side=top]:slide-in-from-bottom-2",
      className
    )}
    {...props}
  />
))
TooltipContent.displayName = TooltipPrimitive.Content.displayName

export { Tooltip, TooltipTrigger, TooltipContent, TooltipProvider }
