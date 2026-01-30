/**
 * AIMessageList Component
 *
 * AI 消息列表组件，负责：
 * - 渲染消息列表
 * - 自动滚动到底部
 * - Markdown 内容解析和渲染
 * - 代码块特殊处理
 *
 * @see DESIGN_SPEC.md 6.3 MessageBubble
 */
import { useRef, useEffect, useCallback, useMemo } from 'react';
import { clsx } from 'clsx';
import { Sparkles } from 'lucide-react';
import { MessageBubble } from './MessageBubble';
import { AICodeBlock } from './AICodeBlock';
import type { AIMessage } from '../../../stores/aiStore';

export interface AIMessageListProps {
  /** 消息列表 */
  messages: AIMessage[];
  /** 当前是否正在流式输出 */
  isStreaming?: boolean;
  /** 应用代码回调 */
  onApplyCode?: (code: string) => void;
  /** 插入代码回调 */
  onInsertCode?: (code: string) => void;
  /** 自定义类名 */
  className?: string;
}

/**
 * 解析 Markdown 内容，分离代码块
 */
interface ContentPart {
  type: 'text' | 'code';
  content: string;
  language?: string;
}

function parseContent(content: string): ContentPart[] {
  const parts: ContentPart[] = [];
  const codeBlockRegex = /```(\w*)\n?([\s\S]*?)```/g;
  let lastIndex = 0;
  let match: RegExpExecArray | null;

  while ((match = codeBlockRegex.exec(content)) !== null) {
    // 添加代码块之前的文本
    const matchIndex = match.index ?? 0;
    if (matchIndex > lastIndex) {
      const textContent = content.slice(lastIndex, matchIndex).trim();
      if (textContent) {
        parts.push({ type: 'text', content: textContent });
      }
    }

    // 添加代码块
    parts.push({
      type: 'code',
      language: match[1] || 'code',
      content: (match[2] ?? '').trim(),
    });

    lastIndex = matchIndex + match[0].length;
  }

  // 添加最后的文本
  if (lastIndex < content.length) {
    const textContent = content.slice(lastIndex).trim();
    if (textContent) {
      parts.push({ type: 'text', content: textContent });
    }
  }

  return parts.length > 0 ? parts : [{ type: 'text', content }];
}

/**
 * 空状态组件
 */
function EmptyState() {
  return (
    <div className="flex-1 flex flex-col items-center justify-center p-8 text-center">
      <div
        className={clsx(
          'w-16 h-16 mb-4',
          'flex items-center justify-center',
          'rounded-full',
          'bg-[var(--color-bg-hover)]'
        )}
      >
        <Sparkles className="w-8 h-8 text-[var(--color-text-tertiary)]" />
      </div>
      <h3 className="text-[16px] font-medium text-[var(--color-text-secondary)] mb-2">
        Start a conversation
      </h3>
      <p className="text-[13px] text-[var(--color-text-tertiary)] max-w-[240px]">
        Ask me anything about your writing. I can help with ideas, editing, research, and more.
      </p>

      {/* 建议问题 */}
      <div className="mt-6 flex flex-col gap-2 w-full max-w-[280px]">
        {[
          'Help me brainstorm ideas',
          'Review my latest chapter',
          'Suggest a better opening',
        ].map((suggestion, index) => (
          <button
            key={index}
            type="button"
            className={clsx(
              'px-4 py-2.5',
              'text-left',
              'text-[13px]',
              'text-[var(--color-text-secondary)]',
              'bg-[var(--color-bg-body)]',
              'border border-[var(--color-border-default)]',
              'rounded-lg',
              'hover:border-[var(--color-border-hover)]',
              'hover:text-[var(--color-text-primary)]',
              'transition-colors duration-[150ms]'
            )}
          >
            {suggestion}
          </button>
        ))}
      </div>
    </div>
  );
}

/**
 * 渲染单条消息的内容
 */
function MessageContent({
  message,
  onApplyCode,
  onInsertCode,
}: {
  message: AIMessage;
  onApplyCode?: (code: string) => void;
  onInsertCode?: (code: string) => void;
}) {
  // 用户消息直接渲染文本
  if (message.role === 'user') {
    return <span>{message.content}</span>;
  }

  // 助手消息解析 Markdown
  const parts = useMemo(() => parseContent(message.content), [message.content]);

  return (
    <div className="space-y-3">
      {parts.map((part, index) => {
        if (part.type === 'code') {
          return (
            <AICodeBlock
              key={index}
              code={part.content}
              language={part.language}
              onApply={onApplyCode}
              onInsert={onInsertCode}
            />
          );
        }

        // 渲染文本内容（简单 Markdown 处理）
        return (
          <div
            key={index}
            className="whitespace-pre-wrap"
            dangerouslySetInnerHTML={{
              __html: formatMarkdown(part.content),
            }}
          />
        );
      })}
    </div>
  );
}

/**
 * 简单的 Markdown 格式化
 */
function formatMarkdown(text: string): string {
  return (
    text
      // 粗体 **text**
      .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
      // 斜体 *text*
      .replace(/\*(.*?)\*/g, '<em>$1</em>')
      // 行内代码 `code`
      .replace(
        /`([^`]+)`/g,
        '<code class="px-1 py-0.5 bg-[var(--color-bg-hover)] rounded text-[13px] font-mono">$1</code>'
      )
      // 换行
      .replace(/\n/g, '<br />')
  );
}

export function AIMessageList({
  messages,
  isStreaming: _isStreaming = false,
  onApplyCode,
  onInsertCode,
  className,
}: AIMessageListProps) {
  // _isStreaming 可用于全局流式状态指示，当前未使用
  void _isStreaming;
  const containerRef = useRef<HTMLDivElement>(null);
  const bottomRef = useRef<HTMLDivElement>(null);

  // 自动滚动到底部
  const scrollToBottom = useCallback(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, []);

  // 消息变化时滚动
  useEffect(() => {
    scrollToBottom();
  }, [messages, scrollToBottom]);

  // 空状态
  if (messages.length === 0) {
    return <EmptyState />;
  }

  return (
    <div
      ref={containerRef}
      className={clsx(
        'flex-1 overflow-y-auto',
        'p-4',
        'space-y-4',
        className
      )}
    >
      {messages.map((message) => (
        <MessageBubble
          key={message.id}
          role={message.role}
          status={message.status}
          isStreaming={message.status === 'streaming'}
          error={message.error}
          timestamp={message.createdAt}
          content={
            <MessageContent
              message={message}
              onApplyCode={onApplyCode}
              onInsertCode={onInsertCode}
            />
          }
        />
      ))}

      {/* 滚动锚点 */}
      <div ref={bottomRef} />
    </div>
  );
}

AIMessageList.displayName = 'AIMessageList';
