/**
 * Primitives - 原子组件导出
 * 
 * 所有原子组件的统一导出入口。
 * 这些组件是最小的 UI 单元，不包含业务逻辑。
 */

// Button
export { Button, type ButtonProps } from './Button';

// Input
export { Input, type InputProps } from './Input';

// Textarea
export { Textarea, type TextareaProps } from './Textarea';

// Card
export { Card, type CardProps } from './Card';

// Badge
export { Badge, type BadgeProps } from './Badge';

// Divider
export { Divider, type DividerProps } from './Divider';

// Switch
export { Switch, type SwitchProps } from './Switch';

// Checkbox
export { Checkbox, type CheckboxProps } from './Checkbox';

// Tooltip
export { Tooltip, type TooltipProps } from './Tooltip';

// Avatar
export { Avatar, type AvatarProps } from './Avatar';

// Spinner
export { Spinner, type SpinnerProps } from './Spinner';

// Select
export { Select, type SelectProps, type SelectOption } from './Select';

// Popover
export { Popover, type PopoverProps } from './Popover';

// Dialog
export { Dialog, DialogTrigger, DialogClose, type DialogProps } from './Dialog';

// Toast
export {
  Toast,
  ToastProvider,
  useToast,
  type ToastProps,
  type ToastData,
  type ToastVariant,
} from './Toast';
