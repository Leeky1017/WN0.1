/**
 * SearchPanel Component
 * 
 * 搜索面板，支持全文搜索和语义搜索切换。
 * 按 Context Panel 风格实现。
 * 
 * @see DESIGN_SPEC.md 8.1.4 搜索流程
 * @see DESIGN_SPEC.md 11.1 后端现有能力 - search:*
 */
import { useCallback, useEffect, useRef, type KeyboardEvent } from 'react';
import { clsx } from 'clsx';
import { X, Search, Sparkles, Type, Clock, Trash2 } from 'lucide-react';
import { Input } from '../../components/primitives/Input';
import { Select } from '../../components/primitives/Select';
import { LoadingState } from '../../components/patterns/LoadingState';
import { EmptyState } from '../../components/patterns/EmptyState';
import { SearchResultItem } from './components/SearchResultItem';
import { 
  useSearchStore, 
  SEARCH_MODES,
  RESULT_TYPES,
  type SearchMode,
  type SearchResultType,
} from '../../stores/searchStore';

export interface SearchPanelProps {
  /** 折叠回调 */
  onCollapse?: () => void;
  /** 选择结果回调 */
  onSelectResult?: (resultId: string, type: SearchResultType) => void;
  /** 自定义类名 */
  className?: string;
}

/**
 * 类型选项
 */
const TYPE_OPTIONS = [
  { value: 'all', label: 'All Types' },
  ...Object.entries(RESULT_TYPES).map(([value, { label }]) => ({
    value,
    label,
  })),
];

/**
 * 像素规范
 * 
 * 参照 Context Panel 规范：
 * | 属性 | 值 |
 * |------|-----|
 * | 默认宽度 | 280px |
 * | 背景 | #080808 |
 * | 左边框 | 1px solid #222222 |
 */
export function SearchPanel({
  onCollapse,
  onSelectResult,
  className,
}: SearchPanelProps) {
  const {
    query,
    mode,
    results,
    isSearching,
    error,
    typeFilter,
    recentSearches,
    setQuery,
    setMode,
    search,
    clearResults,
    setTypeFilter,
    clearRecentSearches,
    getFilteredResults,
  } = useSearchStore();

  const inputRef = useRef<HTMLInputElement>(null);
  const filteredResults = getFilteredResults();

  // 自动聚焦搜索框
  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  /**
   * 处理搜索输入
   */
  const handleQueryChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    setQuery(e.target.value);
  }, [setQuery]);

  /**
   * 处理键盘事件
   */
  const handleKeyDown = useCallback((e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter' && query.trim()) {
      search();
    } else if (e.key === 'Escape') {
      if (query) {
        clearResults();
      } else {
        onCollapse?.();
      }
    }
  }, [query, search, clearResults, onCollapse]);

  /**
   * 处理搜索模式切换
   */
  const handleModeChange = useCallback((newMode: SearchMode) => {
    setMode(newMode);
  }, [setMode]);

  /**
   * 处理类型筛选
   */
  const handleTypeChange = useCallback((value: string) => {
    setTypeFilter(value as SearchResultType | 'all');
  }, [setTypeFilter]);

  /**
   * 处理最近搜索点击
   */
  const handleRecentSearchClick = useCallback((recentQuery: string) => {
    setQuery(recentQuery);
    search();
  }, [setQuery, search]);

  /**
   * 处理结果点击
   */
  const handleResultClick = useCallback((resultId: string, type: SearchResultType) => {
    onSelectResult?.(resultId, type);
  }, [onSelectResult]);

  return (
    <div
      className={clsx(
        'h-full flex flex-col',
        'bg-[var(--color-bg-body)]',
        'border-l border-[var(--color-border-default)]',
        className,
      )}
    >
      {/* Header */}
      <div className="flex items-center justify-between p-4 shrink-0 border-b border-[var(--color-border-default)]">
        <div className="flex items-center gap-2">
          <Search className="w-4 h-4 text-[var(--color-text-secondary)]" />
          <h2 className="text-[14px] font-semibold text-[var(--color-text-primary)]">
            Search
          </h2>
        </div>
        
        {onCollapse && (
          <button
            type="button"
            onClick={onCollapse}
            className={clsx(
              'w-7 h-7',
              'flex items-center justify-center',
              'rounded-lg',
              'text-[var(--color-text-tertiary)]',
              'hover:text-[var(--color-text-primary)]',
              'hover:bg-[var(--color-bg-hover)]',
              'transition-colors duration-[var(--duration-fast)]',
            )}
            aria-label="Close panel"
          >
            <X className="w-4 h-4" strokeWidth={1.5} />
          </button>
        )}
      </div>

      {/* 搜索输入 */}
      <div className="p-4 space-y-3 shrink-0 border-b border-[var(--color-border-default)]">
        {/* 搜索框 */}
        <Input
          ref={inputRef}
          type="search"
          placeholder="Search your content..."
          value={query}
          onChange={handleQueryChange}
          onKeyDown={handleKeyDown}
          leftSlot={<Search className="w-4 h-4" />}
          className="h-10"
        />
        
        {/* 搜索模式切换 */}
        <div className="flex gap-2">
          <button
            type="button"
            onClick={() => handleModeChange('fulltext')}
            className={clsx(
              'flex-1',
              'flex items-center justify-center gap-1.5',
              'h-8 px-3',
              'rounded-lg',
              'text-[12px]',
              'transition-all duration-[var(--duration-fast)]',
              mode === 'fulltext'
                ? 'bg-[var(--color-text-primary)] text-[var(--color-bg-body)]'
                : 'bg-[var(--color-bg-surface)] text-[var(--color-text-secondary)] hover:bg-[var(--color-bg-hover)]',
            )}
          >
            <Type className="w-3.5 h-3.5" />
            {SEARCH_MODES.fulltext.label}
          </button>
          
          <button
            type="button"
            onClick={() => handleModeChange('semantic')}
            className={clsx(
              'flex-1',
              'flex items-center justify-center gap-1.5',
              'h-8 px-3',
              'rounded-lg',
              'text-[12px]',
              'transition-all duration-[var(--duration-fast)]',
              mode === 'semantic'
                ? 'bg-[var(--color-text-primary)] text-[var(--color-bg-body)]'
                : 'bg-[var(--color-bg-surface)] text-[var(--color-text-secondary)] hover:bg-[var(--color-bg-hover)]',
            )}
          >
            <Sparkles className="w-3.5 h-3.5" />
            {SEARCH_MODES.semantic.label}
          </button>
        </div>
        
        {/* 类型筛选（有结果时显示） */}
        {results.length > 0 && (
          <Select
            value={typeFilter}
            options={TYPE_OPTIONS}
            onChange={handleTypeChange}
            placeholder="Filter by type"
          />
        )}
      </div>

      {/* 结果区域 */}
      <div className="flex-1 overflow-y-auto px-4 py-3">
        {/* 加载状态 */}
        {isSearching && (
          <div className="py-8">
            <LoadingState text={`Searching with ${SEARCH_MODES[mode].label}...`} />
          </div>
        )}

        {/* 错误状态 */}
        {error && (
          <div className="py-8 text-center text-[13px] text-[var(--color-error)]">
            {error}
          </div>
        )}

        {/* 最近搜索（无查询时显示） */}
        {!isSearching && !query && recentSearches.length > 0 && (
          <div className="space-y-2">
            <div className="flex items-center justify-between mb-3">
              <span className="flex items-center gap-1.5 text-[11px] text-[var(--color-text-tertiary)] uppercase tracking-wide">
                <Clock className="w-3 h-3" />
                Recent
              </span>
              <button
                type="button"
                onClick={clearRecentSearches}
                className="flex items-center gap-1 text-[10px] text-[var(--color-text-tertiary)] hover:text-[var(--color-text-secondary)] transition-colors"
              >
                <Trash2 className="w-3 h-3" />
                Clear
              </button>
            </div>
            
            {recentSearches.map((recentQuery) => (
              <button
                key={recentQuery}
                type="button"
                onClick={() => handleRecentSearchClick(recentQuery)}
                className={clsx(
                  'w-full',
                  'flex items-center gap-2',
                  'px-3 py-2',
                  'rounded-lg',
                  'text-[13px] text-[var(--color-text-secondary)]',
                  'hover:bg-[var(--color-bg-hover)]',
                  'hover:text-[var(--color-text-primary)]',
                  'transition-colors',
                  'text-left',
                )}
              >
                <Search className="w-3.5 h-3.5 shrink-0" />
                <span className="truncate">{recentQuery}</span>
              </button>
            ))}
          </div>
        )}

        {/* 空状态（有查询但无结果） */}
        {!isSearching && !error && query && filteredResults.length === 0 && (
          <EmptyState
            icon={<Search className="w-12 h-12" />}
            title="No results found"
            description={`Try different keywords or switch to ${mode === 'fulltext' ? 'Semantic' : 'Full Text'} search`}
          />
        )}

        {/* 初始状态（无查询无最近搜索） */}
        {!isSearching && !query && recentSearches.length === 0 && (
          <EmptyState
            icon={<Search className="w-12 h-12" />}
            title="Search your content"
            description="Find documents, characters, and outlines across all your projects"
          />
        )}

        {/* 搜索结果 */}
        {!isSearching && !error && filteredResults.length > 0 && (
          <div className="space-y-2">
            {/* 结果统计 */}
            <div className="text-[11px] text-[var(--color-text-tertiary)] mb-3">
              {filteredResults.length} result{filteredResults.length !== 1 ? 's' : ''} found
            </div>
            
            {filteredResults.map((result) => (
              <SearchResultItem
                key={result.id}
                result={result}
                onClick={() => handleResultClick(result.id, result.type)}
              />
            ))}
          </div>
        )}
      </div>

      {/* Footer 模式提示 */}
      <div className="p-4 shrink-0 border-t border-[var(--color-border-default)]">
        <p className="text-[11px] text-[var(--color-text-tertiary)] text-center">
          {mode === 'semantic' 
            ? 'AI-powered search finds related content'
            : 'Exact match search for specific keywords'
          }
        </p>
      </div>
    </div>
  );
}

SearchPanel.displayName = 'SearchPanel';
