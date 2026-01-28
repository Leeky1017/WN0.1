/**
 * SearchPanel
 * Why: Provide a unified search experience (fulltext + semantic) in the sidebar.
 */

import { useCallback, useState, useEffect } from 'react';
import { FileText, Search, Sparkles, AlertCircle, RefreshCw } from 'lucide-react';
import { SearchField } from '@/components/composed/search-field';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { useWriteModeStore } from '@/features/write-mode/writeModeStore';

import { useSearch, type SearchMode, type SearchResult } from './useSearch';

/**
 * SearchPanel component for the sidebar.
 * Supports switching between full-text and semantic search modes.
 */
export function SearchPanel() {
  const [query, setQuery] = useState('');
  const { mode, setMode, results, loading, error, search, clear } = useSearch();
  const openFile = useWriteModeStore((s) => s.openFile);

  // Debounced search effect
  useEffect(() => {
    const trimmed = query.trim();
    if (!trimmed) {
      clear();
      return;
    }

    const timer = setTimeout(() => {
      void search(trimmed);
    }, 300);

    return () => clearTimeout(timer);
  }, [query, search, clear]);

  const handleModeChange = useCallback((nextMode: SearchMode) => {
    setMode(nextMode);
    // Re-search with new mode if there's a query
    if (query.trim()) {
      void search(query.trim());
    }
  }, [query, search, setMode]);

  const handleResultClick = useCallback(async (result: SearchResult) => {
    try {
      // The result.id is typically the file path
      await openFile(result.id);
    } catch {
      // Why: Open errors are surfaced via the unified save indicator
    }
  }, [openFile]);

  const handleRetry = useCallback(() => {
    if (query.trim()) {
      void search(query.trim());
    }
  }, [query, search]);

  return (
    <div className="h-full flex flex-col">
      {/* Search Input */}
      <div className="p-3 space-y-3 border-b border-[var(--border-subtle)]">
        <SearchField
          value={query}
          onChange={setQuery}
          placeholder="搜索文档..."
          size="sm"
        />

        {/* Mode Toggle */}
        <div className="flex items-center gap-1">
          <ModeButton
            active={mode === 'fulltext'}
            onClick={() => handleModeChange('fulltext')}
            icon={<Search size={12} />}
            label="全文"
          />
          <ModeButton
            active={mode === 'semantic'}
            onClick={() => handleModeChange('semantic')}
            icon={<Sparkles size={12} />}
            label="语义"
          />
        </div>
      </div>

      {/* Results Area */}
      <div className="flex-1 overflow-y-auto custom-scrollbar">
        {loading && (
          <div className="flex items-center justify-center py-10">
            <RefreshCw size={16} className="animate-spin text-[var(--fg-muted)]" />
            <span className="ml-2 text-[11px] text-[var(--fg-muted)]">搜索中...</span>
          </div>
        )}

        {error && !loading && (
          <div className="p-3 space-y-3">
            <div className="flex items-center gap-2 text-[11px] text-[var(--error)]">
              <AlertCircle size={14} />
              <span>{error}</span>
            </div>
            <Button variant="ghost" size="sm" onClick={handleRetry} className="w-full">
              重试
            </Button>
          </div>
        )}

        {!loading && !error && results.length === 0 && query.trim() && (
          <div className="text-center py-10 px-3">
            <div className="text-[11px] text-[var(--fg-muted)]">
              未找到 &quot;{query}&quot; 的相关结果
            </div>
            {mode === 'fulltext' && (
              <button
                type="button"
                className="mt-2 text-[11px] text-[var(--accent-default)] hover:underline"
                onClick={() => handleModeChange('semantic')}
              >
                尝试语义搜索
              </button>
            )}
          </div>
        )}

        {!loading && !error && results.length === 0 && !query.trim() && (
          <div className="text-center py-10 px-3">
            <Search size={24} className="mx-auto text-[var(--fg-subtle)] mb-2" />
            <div className="text-[11px] text-[var(--fg-muted)]">
              输入关键词搜索文档
            </div>
            <div className="mt-1 text-[10px] text-[var(--fg-subtle)]">
              {mode === 'fulltext' ? '全文搜索：精确匹配关键词' : '语义搜索：理解意图匹配相关内容'}
            </div>
          </div>
        )}

        {!loading && !error && results.length > 0 && (
          <div className="py-2 px-2">
            <div className="text-[10px] text-[var(--fg-subtle)] px-2 mb-2">
              找到 {results.length} 个结果
            </div>
            <div className="space-y-1">
              {results.map((result) => (
                <SearchResultItem
                  key={result.id}
                  result={result}
                  onClick={() => void handleResultClick(result)}
                />
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

interface ModeButtonProps {
  active: boolean;
  onClick: () => void;
  icon: React.ReactNode;
  label: string;
}

function ModeButton({ active, onClick, icon, label }: ModeButtonProps) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        'flex items-center gap-1 px-2 py-1 rounded-md text-[10px] font-medium transition-colors',
        active
          ? 'bg-[var(--accent-default)] text-[var(--fg-on-accent)]'
          : 'bg-[var(--bg-elevated)] text-[var(--fg-muted)] hover:bg-[var(--bg-hover)]'
      )}
    >
      {icon}
      {label}
    </button>
  );
}

interface SearchResultItemProps {
  result: SearchResult;
  onClick: () => void;
}

function SearchResultItem({ result, onClick }: SearchResultItemProps) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="w-full text-left p-2 rounded-lg hover:bg-[var(--bg-hover)] transition-colors group"
    >
      <div className="flex items-start gap-2">
        <FileText size={14} className="mt-0.5 text-[var(--fg-subtle)] shrink-0" />
        <div className="min-w-0 flex-1">
          <div className="text-[11px] font-medium text-[var(--fg-default)] group-hover:text-[var(--accent-default)] truncate">
            {result.title}
          </div>
          <div className="text-[10px] text-[var(--fg-muted)] line-clamp-2 mt-0.5">
            {result.snippet}
          </div>
          {typeof result.score === 'number' && (
            <div className="text-[9px] text-[var(--fg-subtle)] mt-1">
              相关度: {(result.score * 100).toFixed(0)}%
            </div>
          )}
        </div>
      </div>
    </button>
  );
}
