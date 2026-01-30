/**
 * AI Panel Feature Module
 *
 * 导出 AI 面板相关组件和类型
 */
export { AIPanel, AIPanelStandalone } from './AIPanel';
export type { AIPanelProps } from './AIPanel';

// 子组件导出
export {
  MessageBubble,
  AICodeBlock,
  AIInput,
  AIInputWithStatus,
  AIHeader,
  AIHeaderSimple,
  AIMessageList,
} from './components';

export type {
  MessageBubbleProps,
  AICodeBlockProps,
  AIInputProps,
  AIHeaderProps,
  AIMessageListProps,
} from './components';
