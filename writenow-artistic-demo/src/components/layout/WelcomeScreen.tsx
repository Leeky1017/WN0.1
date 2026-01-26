import { motion } from 'framer-motion';
import { FolderOpen } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface WelcomeScreenProps {
  /** Callback when user initiates starting the app */
  onStart: () => void;
}

/**
 * WelcomeScreen - Simplified landing page focusing on core actions.
 *
 * Design principles:
 * - Minimal decoration, maximum clarity
 * - Clear call-to-action hierarchy
 * - Subtle status indicator
 *
 * Why simplified: The previous version had heavy decorative elements
 * that distracted from the core user journey. This version focuses
 * on getting users to their first action quickly.
 */
export function WelcomeScreen({ onStart }: WelcomeScreenProps) {
  return (
    <div className="h-full w-full flex flex-col items-center justify-center bg-[var(--bg-base)]">
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6, ease: [0.16, 1, 0.3, 1] }}
        className="text-center max-w-md px-6"
      >
        {/* Title */}
        <h1 className="text-3xl font-serif font-light text-[var(--fg-default)] mb-2">
          WriteNow
        </h1>
        <p className="text-[var(--fg-muted)] text-sm mb-12">
          The workspace for creative minds
        </p>

        {/* Actions */}
        <div className="flex flex-col items-center gap-4">
          <Button variant="primary" size="lg" onClick={onStart}>
            Start a new draft
          </Button>
          <Button
            variant="ghost"
            size="md"
            onClick={onStart}
            leftIcon={<FolderOpen size={14} />}
          >
            Open existing project
          </Button>
        </div>

        {/* Status */}
        <div className="mt-16 flex items-center justify-center gap-2 text-[10px] text-[var(--fg-subtle)]">
          <div className="w-1 h-1 rounded-full bg-[var(--success)]" />
          <span>Ready</span>
        </div>
      </motion.div>
    </div>
  );
}
