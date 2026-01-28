/**
 * MobileOverlay - Slide-in overlay for mobile responsive layout.
 *
 * Why: On mobile (< 768px), sidebar and AI panel are shown as overlays
 * instead of inline panels to preserve editor workspace.
 */

import { useEffect, type ReactNode } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X } from 'lucide-react';
import { cn } from '@/lib/utils';
import { fadeIn, slideInLeft, slideInRight } from '@/lib/motion';
import { IconButton } from '@/components/ui/icon-button';

interface MobileOverlayProps {
  /** Whether the overlay is open */
  open: boolean;
  /** Callback to close the overlay */
  onClose: () => void;
  /** Overlay content */
  children: ReactNode;
  /** Side to slide from (default: left) */
  side?: 'left' | 'right';
  /** Title for the overlay header */
  title?: string;
  /** Additional class names */
  className?: string;
}

/**
 * MobileOverlay component for responsive panel display.
 *
 * Uses unified motion presets for consistent animations across the app.
 * Includes backdrop click-to-close and escape key handling.
 */
export function MobileOverlay({
  open,
  onClose,
  children,
  side = 'left',
  title,
  className,
}: MobileOverlayProps) {
  // Close on escape key
  useEffect(() => {
    if (!open) return;

    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.preventDefault();
        onClose();
      }
    };

    window.addEventListener('keydown', handleEscape);
    return () => window.removeEventListener('keydown', handleEscape);
  }, [open, onClose]);

  // Prevent body scroll when overlay is open
  useEffect(() => {
    if (open) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
    return () => {
      document.body.style.overflow = '';
    };
  }, [open]);

  // Select the appropriate slide variant based on side
  const slideVariants = side === 'left' ? slideInLeft : slideInRight;

  return (
    <AnimatePresence>
      {open && (
        <>
          {/* Backdrop */}
          <motion.div
            variants={fadeIn}
            initial="hidden"
            animate="visible"
            exit="exit"
            className="fixed inset-0 z-[var(--z-modal)] bg-black/50 backdrop-blur-[2px]"
            onClick={onClose}
            aria-hidden="true"
          />

          {/* Panel */}
          <motion.div
            variants={slideVariants}
            initial="hidden"
            animate="visible"
            exit="exit"
            className={cn(
              'fixed top-0 bottom-0 z-[var(--z-modal)]',
              'bg-[var(--bg-surface)] shadow-2xl',
              'flex flex-col',
              side === 'left' ? 'left-0' : 'right-0',
              className
            )}
            role="dialog"
            aria-modal="true"
            aria-label={title ?? 'Panel'}
          >
            {/* Header with close button */}
            {title && (
              <header className="shrink-0 h-12 flex items-center justify-between px-3 border-b border-[var(--border-subtle)]">
                <span className="text-sm font-semibold text-[var(--fg-default)]">{title}</span>
                <IconButton
                  icon={X}
                  size="sm"
                  variant="ghost"
                  onClick={onClose}
                  aria-label="关闭面板"
                />
              </header>
            )}

            {/* Content */}
            <div className="flex-1 overflow-hidden">
              {children}
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
