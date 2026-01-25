/**
 * MessageList
 * Why: Provide a scroll-friendly list of AI chat messages.
 */

import type { AiMessage } from '@/stores';
import { MessageBubble } from './MessageBubble';

export interface MessageListProps {
  messages: AiMessage[];
}

export function MessageList({ messages }: MessageListProps) {
  if (messages.length === 0) {
    return (
      <div className="text-sm text-[var(--text-muted)]">
        选择一个技能并开始输入，AI 将在这里显示回应。
      </div>
    );
  }

  return (
    <div className="flex flex-col">
      {messages.map((message) => (
        <MessageBubble key={message.id} message={message} />
      ))}
    </div>
  );
}

export default MessageList;
