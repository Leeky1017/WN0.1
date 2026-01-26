import { useState } from 'react';
import {
  ChevronDown,
  Wand2,
  Paperclip,
  ArrowUp,
  Copy,
  Check,
  Infinity,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { IconButton } from '@/components/ui/icon-button';
import { MessageBubble } from '@/components/composed/message-bubble';

type AIMode = 'Agent' | 'Plan' | 'Debug' | 'Ask';

/**
 * AI Panel - The intelligence interface for AI-assisted writing.
 *
 * Structure:
 * 1. Message Stream - Vertical flow of user/assistant messages
 * 2. Input Area - Three-zone toolbar with textarea
 *
 * Why three-zone toolbar:
 * - Left: Mode + Model selection (context controls)
 * - Center: Skills (special highlight for creative tools)
 * - Right: Actions (attach, send)
 */
export function AIPanel() {
  const [inputValue, setInputValue] = useState('');
  const [activeMode] = useState<AIMode>('Agent');
  const activeModel = 'Gemini 3 Flash';

  return (
    <div className="h-full w-full flex flex-col bg-[var(--bg-surface)] relative">
      {/* 1. Message Stream */}
      <div className="flex-1 overflow-y-auto custom-scrollbar p-4">
        <div className="flex flex-col gap-6">
          {/* User Message */}
          <MessageBubble
            role="user"
            content="Analyze the pacing and tone of my prologue."
          />

          {/* Agent Response */}
          <MessageBubble
            role="assistant"
            content={
              <>
                <p className="mb-4">
                  I've analyzed your prologue. Here's what I found:
                </p>
                <div className="space-y-3">
                  <p>
                    <span className="text-[var(--fg-default)] font-medium">
                      Pacing:
                    </span>{' '}
                    The rhythm feels slightly rushed after "he had gone."
                    Consider adding a beat of silence before introducing the
                    letter.
                  </p>
                  <p>
                    <span className="text-[var(--fg-default)] font-medium">
                      Tone:
                    </span>{' '}
                    Consistently{' '}
                    <span className="text-[var(--accent-default)]">
                      Melancholic Noir
                    </span>
                    . You're using isolation as a physical weight.
                  </p>
                  <p>
                    <span className="text-[var(--fg-default)] font-medium">
                      Imagery:
                    </span>{' '}
                    Strong sensory details (jasmine, rain, flickering lights)
                    anchor the emotional landscape.
                  </p>
                </div>
              </>
            }
          />

          {/* User Message */}
          <MessageBubble
            role="user"
            content="Sharpen the imagery in the window description."
          />

          {/* Agent Response with Text Block */}
          <MessageBubble
            role="assistant"
            content={
              <>
                <p className="mb-4">Here's a refined version:</p>
                <TextBlock content="The letters lay on the mahogany desk, their edges catching the lamplight like paper blades. Outside, the city breathed its last light into the fog." />
                <p className="mt-4 text-[var(--fg-subtle)]">
                  The revision adds tactile precision and extends the
                  melancholic atmosphere through the window.
                </p>
              </>
            }
          />
        </div>
      </div>

      {/* 2. Input Area - Three-zone layout */}
      <div className="p-3 border-t border-[var(--border-subtle)] bg-[var(--bg-surface)]">
        {/* Textarea Container */}
        <div className="relative mb-2">
          <textarea
            value={inputValue}
            onChange={(e) => setInputValue(e.target.value)}
            placeholder="Ask anything..."
            className={cn(
              'w-full min-h-[80px] max-h-[200px] p-3 rounded-lg resize-none',
              'bg-[var(--bg-input)] border border-[var(--border-default)]',
              'text-[var(--fg-default)] placeholder:text-[var(--fg-placeholder)]',
              'focus:outline-none focus:border-[var(--border-focus)] focus:ring-1 focus:ring-[var(--border-focus)]',
              'text-sm leading-relaxed',
              'transition-colors duration-100'
            )}
            rows={3}
          />
        </div>

        {/* Toolbar - Three-zone layout */}
        <div className="flex items-center justify-between">
          {/* Left: Mode + Model */}
          <div className="flex items-center gap-2">
            {/* Mode Selector */}
            <button
              className={cn(
                'flex items-center gap-1.5 px-2 py-1 rounded-md',
                'bg-[var(--bg-hover)] border border-[var(--border-subtle)]',
                'text-[var(--fg-muted)] hover:text-[var(--fg-default)]',
                'hover:bg-[var(--bg-active)] hover:border-[var(--border-default)]',
                'transition-colors text-[11px] font-medium'
              )}
            >
              <Infinity size={12} className="opacity-60" />
              <span>{activeMode}</span>
              <ChevronDown size={10} className="opacity-40" />
            </button>

            {/* Model Selector */}
            <button
              className={cn(
                'flex items-center gap-1.5 px-2 py-1 rounded-md',
                'bg-transparent border border-[var(--border-subtle)]',
                'text-[var(--fg-muted)] hover:text-[var(--fg-default)]',
                'hover:bg-[var(--bg-hover)] hover:border-[var(--border-default)]',
                'transition-colors text-[11px] font-medium'
              )}
            >
              <span>{activeModel}</span>
              <ChevronDown size={10} className="opacity-40" />
            </button>
          </div>

          {/* Center: Skills (special highlight) */}
          <button
            className={cn(
              'flex items-center gap-1.5 px-2.5 py-1 rounded-md',
              'bg-amber-400/5 border border-amber-400/10',
              'text-amber-500/80 hover:text-amber-400',
              'hover:bg-amber-400/10',
              'transition-colors'
            )}
          >
            <Wand2 size={12} strokeWidth={2.5} />
            <span className="text-[10px] font-bold uppercase tracking-wider">
              Skills
            </span>
          </button>

          {/* Right: Actions */}
          <div className="flex items-center gap-1">
            <IconButton
              icon={Paperclip}
              size="sm"
              variant="ghost"
              tooltip="Attach file"
              tooltipSide="top"
            />
            <IconButton
              icon={ArrowUp}
              size="sm"
              variant={inputValue.trim() ? 'solid' : 'ghost'}
              disabled={!inputValue.trim()}
              tooltip="Send message"
              tooltipSide="top"
              className={cn(
                inputValue.trim() &&
                  'shadow-[0_4px_12px_rgba(59,130,246,0.3)]'
              )}
            />
          </div>
        </div>

        {/* Status Indicator */}
        <div className="mt-2 flex items-center gap-2 text-[10px] text-[var(--fg-muted)] font-medium">
          <div className="w-1.5 h-1.5 rounded-full bg-[var(--success)] shadow-[0_0_6px_var(--success)] animate-pulse" />
          <span>Intelligence Ready</span>
        </div>
      </div>
    </div>
  );
}

/**
 * TextBlock - A copyable content block for AI-generated text.
 *
 * Why separate component: Encapsulates copy functionality and
 * provides consistent styling for quotable content.
 */
function TextBlock({ content }: { content: string }) {
  const [copied, setCopied] = useState(false);

  const handleCopy = async () => {
    await navigator.clipboard.writeText(content);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="rounded-lg border border-[var(--border-default)] bg-[var(--bg-elevated)] overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between px-3 py-2 border-b border-[var(--border-subtle)] bg-[var(--bg-surface)]">
        <span className="text-[10px] font-medium uppercase tracking-wider text-[var(--fg-subtle)]">
          Text Block
        </span>
        <button
          onClick={handleCopy}
          className={cn(
            'flex items-center gap-1.5 px-2 py-1 rounded text-[10px] font-medium transition-colors',
            copied
              ? 'text-[var(--success)] bg-[var(--success-muted)]'
              : 'text-[var(--fg-muted)] hover:text-[var(--fg-default)] hover:bg-[var(--bg-hover)]'
          )}
        >
          {copied ? <Check size={12} /> : <Copy size={12} />}
          {copied ? 'Copied' : 'Copy'}
        </button>
      </div>
      {/* Content */}
      <div className="p-3">
        <p className="font-serif text-sm leading-relaxed text-[var(--fg-muted)] italic">
          "{content}"
        </p>
      </div>
    </div>
  );
}
