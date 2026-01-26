/**
 * MessageBubble
 * Why: Standardize chat bubble rendering for user/assistant messages in the AI panel.
 */

import { Bot, User } from 'lucide-react';

import { cn } from '@/lib/utils';
import type { AiMessage } from '@/stores';

export interface MessageBubbleProps {
  message: AiMessage;
}

export function MessageBubble({ message }: MessageBubbleProps) {
  const isUser = message.role === 'user';

  return (
    <div className={cn('flex gap-3 mb-4', isUser ? 'justify-end' : 'justify-start')}>
      {!isUser && (
        <div className="w-8 h-8 rounded-full bg-[var(--bg-input)] border border-[var(--border-subtle)] flex items-center justify-center flex-shrink-0">
          <Bot className="w-4 h-4 text-[var(--fg-subtle)]" />
        </div>
      )}

      <div className={cn('max-w-[78%] flex flex-col', isUser ? 'items-end' : 'items-start')}>
        {message.skillId && !isUser && (
          <span className="text-[10px] text-[var(--fg-subtle)] uppercase tracking-wide mb-1">
            {message.skillId.split(':').pop()}
          </span>
        )}
        <div
          className={cn(
            'rounded-md px-3 py-2 text-sm whitespace-pre-wrap break-words border',
            isUser
              ? 'bg-[var(--accent-default)] text-[var(--fg-on-accent)] border-transparent'
              : 'bg-[var(--bg-elevated)] text-[var(--fg-default)] border-[var(--border-subtle)]',
          )}
        >
          {message.content}
        </div>
      </div>

      {isUser && (
        <div className="w-8 h-8 rounded-full bg-[var(--accent-default)] flex items-center justify-center flex-shrink-0">
          <User className="w-4 h-4 text-[var(--fg-on-accent)]" />
        </div>
      )}
    </div>
  );
}

export default MessageBubble;
