/**
 * WriteNow Design System - UI Components
 * 
 * This file exports all UI components from the design system.
 * Import from this file for cleaner imports:
 *
 * @example
 * import { Button, IconButton, Input, Badge } from '@/components/ui';
 */

// Core form components
export { Button } from './button'
export type { ButtonProps } from './button'

export { IconButton } from './icon-button'

export { Input } from './input'
export type { InputProps } from './input'

export { Textarea } from './textarea'
export type { TextareaProps } from './textarea'

// Display components
export { Badge } from './badge'
export { Avatar } from './avatar'
export { Divider } from './divider'

// Card components
export {
  Card,
  CardHeader,
  CardFooter,
  CardTitle,
  CardDescription,
  CardContent,
} from './card'

// Dialog components
export {
  Dialog,
  DialogTrigger,
  DialogPortal,
  DialogClose,
  DialogOverlay,
  DialogContent,
  DialogHeader,
  DialogFooter,
  DialogTitle,
  DialogDescription,
} from './dialog'

// Dropdown menu components
export {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuCheckboxItem,
  DropdownMenuRadioItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuShortcut,
  DropdownMenuGroup,
  DropdownMenuPortal,
  DropdownMenuSub,
  DropdownMenuSubContent,
  DropdownMenuSubTrigger,
  DropdownMenuRadioGroup,
} from './dropdown-menu'

// Tabs components
export { Tabs, TabsList, TabsTrigger, TabsContent } from './tabs'

// Overlay components
export { Tooltip, TooltipTrigger, TooltipContent, TooltipProvider } from './tooltip'
export { Popover, PopoverTrigger, PopoverContent, PopoverAnchor } from './popover'

// Scroll components
export { ScrollArea, ScrollBar } from './scroll-area'

// Utility components
export { Separator } from './separator'

// Select components
export {
  Select,
  SelectGroup,
  SelectValue,
  SelectTrigger,
  SelectContent,
  SelectLabel,
  SelectItem,
  SelectSeparator,
  SelectScrollUpButton,
  SelectScrollDownButton,
} from './select'

// Switch component
export { Switch } from './switch'

// Toast components
export { Toaster } from './toaster'

// Context menu components
export {
  ContextMenu,
  ContextMenuTrigger,
  ContextMenuContent,
  ContextMenuItem,
  ContextMenuCheckboxItem,
  ContextMenuRadioItem,
  ContextMenuLabel,
  ContextMenuSeparator,
  ContextMenuShortcut,
  ContextMenuGroup,
  ContextMenuPortal,
  ContextMenuSub,
  ContextMenuSubContent,
  ContextMenuSubTrigger,
  ContextMenuRadioGroup,
} from './context-menu'
