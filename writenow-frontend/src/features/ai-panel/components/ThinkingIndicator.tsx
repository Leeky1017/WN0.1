/**
 * ThinkingIndicator
 * Why: Provide visual feedback while the AI service is preparing a response.
 */

import { Loader2 } from 'lucide-react';

export function ThinkingIndicator() {
  return (
    <div className="flex items-center gap-2 text-[var(--text-muted)] text-xs mt-2">
      <Loader2 className="h-3.5 w-3.5 animate-spin" />
      <span>AI 正在思考…</span>
    </div>
  );
}

export default ThinkingIndicator;
