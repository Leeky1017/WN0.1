/**
 * SettingsPanel - Main settings container component.
 *
 * Why: Composes all settings sections into a unified panel.
 * Individual sections are extracted for maintainability (<200 lines in main file).
 *
 * Structure:
 * - AppearanceSection: Language, theme, editor mode
 * - UpdateSection: App updates (from features/update)
 * - AiSection: Cloud AI API key
 * - MemorySection: Memory injection settings
 * - ConnectionSection: Advanced RPC URL (collapsed by default)
 * - LocalLlmSection: Local LLM Tab completion
 * - ProxySection: AI proxy configuration (collapsed by default)
 */

import { useRef, useEffect, useCallback } from 'react';
import { motion } from 'framer-motion';

import { UpdateSection } from '@/features/update';
import { createStaggerContainer, staggerItem } from '@/lib/motion';

import {
  AppearanceSection,
  AiSection,
  MemorySection,
  ConnectionSection,
  LocalLlmSection,
  ProxySection,
} from './sections';
import { useSettings } from './useSettings';

/** Stagger container for smooth section entrance */
const containerVariants = createStaggerContainer(0.06);

/**
 * SettingsPanel - Sidebar panel for user-facing configuration.
 *
 * Features:
 * - Auto-focus first interactive element on mount
 * - Keyboard navigation support (Tab/Shift+Tab)
 * - Smooth staggered entrance animation for sections
 */
export function SettingsPanel() {
  const containerRef = useRef<HTMLDivElement>(null);
  const settings = useSettings();

  // Auto-focus first interactive element on mount
  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    // Small delay to ensure DOM is ready and animations started
    const timer = setTimeout(() => {
      const firstFocusable = container.querySelector<HTMLElement>(
        'select, input:not([disabled]), button:not([disabled]), [tabindex]:not([tabindex="-1"])',
      );
      firstFocusable?.focus();
    }, 150);

    return () => clearTimeout(timer);
  }, []);

  // Keyboard navigation handler
  const handleKeyDown = useCallback((e: React.KeyboardEvent) => {
    if (e.key === 'Escape') {
      // Blur current element on Escape
      (document.activeElement as HTMLElement)?.blur();
    }
  }, []);

  return (
    <motion.div
      ref={containerRef}
      className="p-4 space-y-4"
      initial="hidden"
      animate="visible"
      exit="exit"
      variants={containerVariants}
      onKeyDown={handleKeyDown}
      role="region"
      aria-label="Settings"
    >
      <motion.div variants={staggerItem}>
        <AppearanceSection
          theme={settings.theme}
          setTheme={settings.setTheme}
          defaultEditorMode={settings.defaultEditorMode}
          setDefaultEditorMode={settings.setDefaultEditorMode}
        />
      </motion.div>

      <motion.div variants={staggerItem}>
        <UpdateSection />
      </motion.div>

      <motion.div variants={staggerItem}>
        <AiSection apiKey={settings.aiApiKey} setApiKey={settings.setAiApiKey} />
      </motion.div>

      <motion.div variants={staggerItem}>
        <MemorySection
          settings={settings.memorySettings}
          loading={settings.memoryLoading}
          error={settings.memoryError}
          updateSettings={settings.updateMemorySettings}
        />
      </motion.div>

      <motion.div variants={staggerItem}>
        <ConnectionSection />
      </motion.div>

      <motion.div variants={staggerItem}>
        <LocalLlmSection />
      </motion.div>

      <motion.div variants={staggerItem}>
        <ProxySection />
      </motion.div>
    </motion.div>
  );
}

export default SettingsPanel;
