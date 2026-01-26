import { memo, useState } from 'react';
import { motion } from 'framer-motion';
import { Bot, Copy, Check } from 'lucide-react';
import { cn } from '@/lib/utils';
import { IconButton } from '@/components/ui/icon-button';

type MessageRole = 'user' | 'assistant';

interface MessageBubbleProps {
  /** The role of the message sender */
  role: MessageRole;
  /** The message content (can be string or React nodes) */
  content: React.ReactNode;
  /** Optional timestamp to display */
  timestamp?: string;
  /** Additional CSS classes */
  className?: string;
}

/**
 * MessageBubble component for displaying chat messages.
 *
 * Why memo: Messages in a chat list rarely change after being rendered.
 * Memoization prevents unnecessary re-renders when the list updates.
 *
 * Why different layouts:
 * - User messages: Full-width with accent border to indicate user input
 * - Assistant messages: With avatar icon to show AI origin, muted text
 *
 * @example
 * ```tsx
 * <MessageBubble role="user" content="Hello, how can you help?" />
 * <MessageBubble role="assistant" content="I can help with writing..." timestamp="2:30 PM" />
 * ```
 */
export const MessageBubble = memo(function MessageBubble({
  role,
  content,
  timestamp,
  className,
}: MessageBubbleProps) {
  const [copied, setCopied] = useState(false);

  const handleCopy = async () => {
    if (typeof content === 'string') {
      await navigator.clipboard.writeText(content);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  // User message: highlighted border, accent background
  if (role === 'user') {
    return (
      <motion.div
        initial={{ opacity: 0, y: 4 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.2, ease: [0.16, 1, 0.3, 1] }}
        className={className}
      >
        <div className="px-4 py-3 rounded-lg border border-[var(--accent-muted)] bg-[var(--accent-subtle)]">
          <p className="text-sm leading-relaxed text-[var(--fg-default)]">
            {content}
          </p>
        </div>
      </motion.div>
    );
  }

  // Assistant message: with avatar and copy action
  return (
    <motion.div
      initial={{ opacity: 0, y: 4 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.2, ease: [0.16, 1, 0.3, 1] }}
      className={cn('flex gap-3 group', className)}
    >
      {/* Avatar */}
      <div className="w-6 h-6 rounded-md bg-[var(--accent-muted)] flex items-center justify-center flex-shrink-0 mt-0.5">
        <Bot size={14} className="text-[var(--accent-default)]" />
      </div>

      {/* Content */}
      <div className="flex-1 min-w-0">
        <div className="text-sm leading-relaxed text-[var(--fg-muted)]">
          {content}
        </div>

        {/* Actions - visible on hover */}
        <div className="flex items-center gap-1 mt-2 opacity-0 group-hover:opacity-100 transition-opacity duration-150">
          <IconButton
            icon={copied ? Check : Copy}
            size="sm"
            variant="ghost"
            onClick={handleCopy}
            tooltip={copied ? 'Copied!' : 'Copy'}
            tooltipSide="bottom"
            className={cn(
              'w-6 h-6',
              copied && 'text-[var(--success)]'
            )}
          />
          {timestamp && (
            <span className="text-[10px] text-[var(--fg-subtle)] ml-2">
              {timestamp}
            </span>
          )}
        </div>
      </div>
    </motion.div>
  );
});
