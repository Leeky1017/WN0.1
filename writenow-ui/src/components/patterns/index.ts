/**
 * Patterns - 交互模式组件导出
 * 
 * 所有交互模式组件的统一导出入口。
 * 这些组件是可跨模块复用的通用 UX 模式（加载、空状态、错误等）。
 */

// EmptyState
export { EmptyState, type EmptyStateProps, type EmptyStateAction } from './EmptyState';

// LoadingState & Skeleton
export {
  LoadingState,
  Skeleton,
  type LoadingStateProps,
  type SkeletonProps,
} from './LoadingState';

// ErrorState
export { ErrorState, type ErrorStateProps } from './ErrorState';

// ConfirmDialog
export { ConfirmDialog, type ConfirmDialogProps } from './ConfirmDialog';

// CodeBlock
export { CodeBlock, type CodeBlockProps } from './CodeBlock';
