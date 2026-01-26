import { memo } from 'react';
import { Folder, File, ChevronRight } from 'lucide-react';
import { cn } from '@/lib/utils';

type FileItemType = 'file' | 'folder';

interface FileItemProps {
  /** Display name of the file or folder */
  name: string;
  /** Whether this is a file or folder */
  type: FileItemType;
  /** Nesting depth for indentation (default: 0) */
  depth?: number;
  /** Whether this item is currently selected (highlighted) */
  selected?: boolean;
  /** Whether this item is currently active (being edited) */
  active?: boolean;
  /** Whether this item has unsaved modifications */
  modified?: boolean;
  /** Whether the folder is expanded (only applies to folders) */
  expanded?: boolean;
  /** Click handler for selection */
  onSelect?: () => void;
  /** Double-click handler for opening */
  onDoubleClick?: () => void;
  /** Click handler for expand/collapse (only applies to folders) */
  onToggleExpand?: () => void;
  /** Additional class names */
  className?: string;
}

/**
 * FileItem - File tree item component with multiple states.
 * 
 * Why memo: File lists can be long, and this is a pure display component.
 * Memoization prevents unnecessary re-renders when parent state changes.
 * 
 * States:
 * - selected: Visual highlight (bg-active), indicates focus
 * - active: Ring highlight, indicates currently being edited
 * - modified: Blue dot indicator, indicates unsaved changes
 * 
 * Indentation: Uses 16px per depth level for clear hierarchy.
 * 
 * @example
 * ```tsx
 * <FileItem
 *   name="chapter-1.md"
 *   type="file"
 *   depth={1}
 *   selected={selectedId === 'chapter-1'}
 *   active={activeFileId === 'chapter-1'}
 *   modified={modifiedFiles.has('chapter-1')}
 *   onSelect={() => setSelectedId('chapter-1')}
 *   onDoubleClick={() => openFile('chapter-1')}
 * />
 * ```
 */
export const FileItem = memo(function FileItem({
  name,
  type,
  depth = 0,
  selected,
  active,
  modified,
  expanded,
  onSelect,
  onDoubleClick,
  onToggleExpand,
  className,
}: FileItemProps) {
  const isFolder = type === 'folder';
  
  /**
   * Handle click on the chevron/folder icon to toggle expansion.
   * Stops propagation to prevent triggering onSelect.
   */
  const handleToggleExpand = (e: React.MouseEvent) => {
    e.stopPropagation();
    onToggleExpand?.();
  };

  return (
    <div
      role="treeitem"
      aria-selected={selected}
      aria-expanded={isFolder ? expanded : undefined}
      onClick={onSelect}
      onDoubleClick={onDoubleClick}
      className={cn(
        'group flex items-center gap-2 px-2 py-1.5 rounded-md cursor-pointer',
        'transition-colors duration-[100ms] ease-out',
        // Selected state
        selected && 'bg-[var(--bg-active)]',
        // Hover state (when not selected)
        !selected && 'hover:bg-[var(--bg-hover)]',
        // Active state (currently being edited) - ring highlight
        active && 'ring-1 ring-[var(--accent-muted)] ring-inset',
        className
      )}
      style={{ 
        // Indentation: 16px per depth level + base padding
        paddingLeft: `${depth * 16 + 8}px` 
      }}
    >
      {/* Expand/Collapse Chevron (folders only) */}
      {isFolder && (
        <button
          type="button"
          onClick={handleToggleExpand}
          className={cn(
            'w-4 h-4 flex items-center justify-center shrink-0',
            'text-[var(--fg-subtle)] hover:text-[var(--fg-muted)]',
            'transition-transform duration-[100ms]',
            expanded && 'rotate-90'
          )}
          aria-label={expanded ? 'Collapse' : 'Expand'}
        >
          <ChevronRight size={12} strokeWidth={2.5} />
        </button>
      )}
      
      {/* Spacer for files to align with folders */}
      {!isFolder && <div className="w-4 shrink-0" />}

      {/* File/Folder Icon */}
      <div 
        className={cn(
          'w-4 h-4 flex items-center justify-center shrink-0',
          isFolder ? 'text-amber-500' : 'text-[var(--fg-subtle)]'
        )}
      >
        {isFolder ? (
          <Folder size={14} strokeWidth={2} />
        ) : (
          <File size={14} strokeWidth={2} />
        )}
      </div>

      {/* File/Folder Name */}
      <span 
        className={cn(
          'text-[12px] truncate flex-1',
          selected ? 'text-[var(--fg-default)]' : 'text-[var(--fg-muted)]',
          isFolder && 'font-medium'
        )}
      >
        {name}
      </span>

      {/* Status Indicators */}
      <div className="flex items-center gap-1.5 ml-auto shrink-0">
        {/* Modified Indicator (blue dot for unsaved changes) */}
        {modified && (
          <div 
            className="w-1.5 h-1.5 rounded-full bg-[var(--accent-default)]"
            title="Modified"
            aria-label="Modified"
          />
        )}
        
        {/* Active Indicator (green dot for currently editing) */}
        {active && !modified && (
          <div 
            className="w-1.5 h-1.5 rounded-full bg-[var(--success)]"
            title="Active"
            aria-label="Active"
          />
        )}
      </div>
    </div>
  );
});
