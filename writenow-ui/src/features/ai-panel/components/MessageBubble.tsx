/**
 * MessageBubble Component
 *
 * AI 聊天消息气泡组件，支持用户消息和助手消息两种样式。
 *
 * @see DESIGN_SPEC.md 6.3 MessageBubble (AI Chat)
 *
 * 像素规范:
 * | 角色 | 背景 | 边框 | 文字色 |
 * |------|------|------|--------|
 * | user | #080808 | 1px solid #222222 | #ffffff |
 * | assistant | transparent | none | #ffffff |
 *
 * | 属性 | 值 |
 * |------|-----|
 * | 圆角 | 8px |
 * | 内边距 | 12px |
 * | 字号 | 14px |
 * | 行高 | 1.6 |
 */
import { type ReactNode } from 'react';
import { clsx } from 'clsx';
import { AlertCircle, Loader2, User, Bot } from 'lucide-react';
import type { MessageRole, MessageStatus } from '../../../stores/aiStore';

export interface MessageBubbleProps {
  /** 消息角色 */
  role: MessageRole;
  /** 消息内容 */
  content: ReactNode;
  /** 消息状态 */
  status?: MessageStatus;
  /** 是否正在流式输出 */
  isStreaming?: boolean;
  /** 错误信息 */
  error?: string;
  /** 自定义类名 */
  className?: string;
  /** 时间戳（可选） */
  timestamp?: string;
}

/**
 * 格式化时间戳
 */
function formatTimestamp(timestamp: string): string {
  try {
    const date = new Date(timestamp);
    return date.toLocaleTimeString('zh-CN', {
      hour: '2-digit',
      minute: '2-digit',
    });
  } catch {
    return '';
  }
}

/**
 * 消息头像
 */
function MessageAvatar({ role }: { role: MessageRole }) {
  return (
    <div
      className={clsx(
        'w-7 h-7 shrink-0',
        'flex items-center justify-center',
        'rounded-full',
        role === 'user'
          ? 'bg-[var(--color-text-primary)] text-[var(--color-bg-body)]'
          : 'bg-[var(--color-bg-hover)] text-[var(--color-text-secondary)]'
      )}
    >
      {role === 'user' ? (
        <User className="w-4 h-4" strokeWidth={1.5} />
      ) : (
        <Bot className="w-4 h-4" strokeWidth={1.5} />
      )}
    </div>
  );
}

/**
 * 流式输出光标
 */
function StreamingCursor() {
  return (
    <span className="inline-block w-2 h-4 ml-0.5 bg-[var(--color-text-primary)] animate-pulse" />
  );
}

/**
 * 等待状态指示器
 */
function PendingIndicator() {
  return (
    <div className="flex items-center gap-2 text-[var(--color-text-secondary)]">
      <Loader2 className="w-4 h-4 animate-spin" />
      <span className="text-[13px]">Thinking...</span>
    </div>
  );
}

/**
 * 错误状态指示器
 */
function ErrorIndicator({ message }: { message?: string }) {
  return (
    <div className="flex items-center gap-2 text-[var(--color-error)]">
      <AlertCircle className="w-4 h-4" />
      <span className="text-[13px]">{message ?? 'An error occurred'}</span>
    </div>
  );
}

export function MessageBubble({
  role,
  content,
  status = 'complete',
  isStreaming = false,
  error,
  className,
  timestamp,
}: MessageBubbleProps) {
  const isUser = role === 'user';

  // 渲染内容
  const renderContent = () => {
    // 等待状态
    if (status === 'pending' && !content) {
      return <PendingIndicator />;
    }

    // 错误状态
    if (status === 'error') {
      return <ErrorIndicator message={error} />;
    }

    // 取消状态
    if (status === 'canceled' && !content) {
      return (
        <span className="text-[var(--color-text-tertiary)] italic">
          Canceled
        </span>
      );
    }

    // 正常内容
    return (
      <>
        {content}
        {isStreaming && <StreamingCursor />}
      </>
    );
  };

  return (
    <div
      className={clsx(
        'flex gap-3',
        // 用户消息靠右，助手消息靠左
        isUser && 'flex-row-reverse',
        className
      )}
    >
      {/* 头像 */}
      <MessageAvatar role={role} />

      {/* 消息体 */}
      <div
        className={clsx(
          'flex flex-col gap-1',
          'max-w-[85%]',
          isUser && 'items-end'
        )}
      >
        {/* 消息气泡 */}
        <div
          className={clsx(
            // 基础样式
            'px-3 py-3',
            'rounded-lg',
            'text-[14px]',
            'leading-relaxed',
            'text-[var(--color-text-primary)]',

            // 角色样式
            isUser
              ? [
                  'bg-[var(--color-bg-body)]',
                  'border border-[var(--color-border-default)]',
                ]
              : 'bg-transparent',

            // prose 样式（用于 Markdown 内容）
            !isUser && [
              '[&_p]:mb-3 [&_p:last-child]:mb-0',
              '[&_ul]:list-disc [&_ul]:pl-5 [&_ul]:mb-3',
              '[&_ol]:list-decimal [&_ol]:pl-5 [&_ol]:mb-3',
              '[&_li]:mb-1',
              '[&_strong]:font-semibold',
              '[&_em]:italic',
              '[&_code]:font-mono [&_code]:text-[13px] [&_code]:bg-[var(--color-bg-hover)] [&_code]:px-1 [&_code]:py-0.5 [&_code]:rounded',
              '[&_pre]:my-3',
              '[&_blockquote]:border-l-2 [&_blockquote]:border-[var(--color-border-default)] [&_blockquote]:pl-4 [&_blockquote]:text-[var(--color-text-secondary)] [&_blockquote]:italic',
            ]
          )}
        >
          {renderContent()}
        </div>

        {/* 时间戳 */}
        {timestamp && status === 'complete' && (
          <span className="text-[10px] text-[var(--color-text-tertiary)] px-1">
            {formatTimestamp(timestamp)}
          </span>
        )}

        {/* 取消状态标记 */}
        {status === 'canceled' && content && (
          <span className="text-[10px] text-[var(--color-text-tertiary)] italic px-1">
            Canceled
          </span>
        )}
      </div>
    </div>
  );
}

MessageBubble.displayName = 'MessageBubble';
