import { Command } from '@theia/core/lib/common';

/**
 * Why: Phase 0 PoC needs a concrete target to prove we can re-route `Ctrl/Cmd+K`
 * from Theia's global keybinding layer into a WriteNow-owned action while the
 * editor is focused.
 *
 * This file centralizes IDs to avoid string drift between the widget and the
 * command contribution.
 */
export namespace WritenowTheiaPocCommands {
  /**
   * Why: Headless E2E verification (PoC 001) needs a deterministic way to open a known `.md`
   * file without relying on File Explorer rendering quirks.
   */
  export const OPEN_POC_TEST_MARKDOWN: Command = {
    id: 'writenow.poc.openTestMarkdown',
    label: 'WriteNow: Open PoC markdown (test.md)',
  };

  export const OPEN_INLINE_AI: Command = {
    id: 'writenow.poc.inlineAi',
    label: 'WriteNow: Inline AI (PoC)',
  };
}
