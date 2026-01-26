import { motion } from 'framer-motion';
import { useEffect, useRef } from 'react';
import { cn } from '@/lib/utils';
import { Badge } from '@/components/ui/badge';
import { Divider } from '@/components/ui/divider';

/**
 * Editor - The main writing canvas.
 *
 * Design principles:
 * - max-width: 70ch for optimal reading line length
 * - Serif font for body text (classic writing feel)
 * - Generous vertical padding for breathing space
 * - Clear visual hierarchy: title > metadata > body
 *
 * Why contentEditable: For the demo, this provides basic editing
 * without the complexity of a full rich text editor. In production,
 * this would be replaced with TipTap or similar.
 */
export function Editor() {
  const titleRef = useRef<HTMLInputElement>(null);
  const editorRef = useRef<HTMLDivElement>(null);

  // Focus title on mount (desktop only to avoid mobile keyboard popup)
  useEffect(() => {
    if (window.innerWidth > 768 && titleRef.current) {
      titleRef.current.focus();
    }
  }, []);

  return (
    <motion.div
      className="h-full w-full bg-[var(--bg-base)] overflow-y-auto overflow-x-hidden relative scroll-smooth"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.4, ease: [0.16, 1, 0.3, 1] }}
    >
      {/* Centered Content Column */}
      <div className="min-h-full w-full flex flex-col items-center pt-12 pb-32 px-8 md:px-16">
        {/* The Measure - max line length for readability */}
        <div className="w-full max-w-[70ch] space-y-8">
          {/* Title Area */}
          <div className="space-y-3">
            <input
              ref={titleRef}
              type="text"
              placeholder="Untitled"
              className={cn(
                'w-full bg-transparent border-none outline-none',
                'text-3xl md:text-4xl font-bold font-serif',
                'text-[var(--fg-default)] placeholder:text-[var(--fg-subtle)]',
                'tracking-tight'
              )}
            />
            {/* Metadata */}
            <div className="flex items-center gap-3">
              <Badge variant="accent">Draft</Badge>
              <span className="text-[10px] text-[var(--fg-subtle)]">
                Last saved 2 minutes ago
              </span>
            </div>
          </div>

          {/* Divider between title and body */}
          <Divider />

          {/* Body Area */}
          <div
            ref={editorRef}
            contentEditable
            suppressContentEditableWarning
            className={cn(
              'w-full min-h-[60vh] outline-none',
              'text-lg md:text-xl leading-loose font-serif',
              'text-[var(--fg-muted)]',
              'selection:bg-[var(--accent-muted)] selection:text-[var(--fg-default)]',
              // Placeholder styling via CSS
              'empty:before:content-[attr(data-placeholder)]',
              'empty:before:text-[var(--fg-subtle)]',
              'empty:before:pointer-events-none'
            )}
            data-placeholder="Start writing..."
          >
            <p className="mb-8">
              The night was heavy with the scent of jasmine and impending rain.
              She stood by the window, watching the city lights flicker like
              dying stars in the distance. It wasn't just the silence that
              unsettled her, but the weight of the words left unsaid, hanging in
              the air like smoke.
            </p>
            <p className="mb-8">
              "We cannot continue like this," he had said, his voice barely a
              whisper, yet it echoed in the empty room long after he had gone.
              The letter lay on the mahogany desk, unopened, its edges sharp
              against the soft glow of the lamp.
            </p>
            <p className="mb-8">
              She reached out, her fingers trembling slightly, tracing the seal.
              It was broken.
            </p>
          </div>

          {/* End Marker - artistic document terminator */}
          <div className="flex flex-col items-center gap-4 pt-16 opacity-30">
            <div className="w-px h-8 bg-gradient-to-b from-[var(--fg-muted)] to-transparent" />
            <div className="w-1.5 h-1.5 rounded-full border border-[var(--fg-muted)]" />
          </div>
        </div>
      </div>

      {/* Subtle Background Ambient - neutral cool */}
      <div className="fixed inset-0 pointer-events-none z-[-1]">
        <div className="absolute top-0 right-0 w-[40%] h-[40%] bg-slate-500/3 blur-[150px] rounded-full" />
        <div className="absolute bottom-0 left-0 w-[40%] h-[40%] bg-slate-600/3 blur-[150px] rounded-full" />
      </div>
    </motion.div>
  );
}
