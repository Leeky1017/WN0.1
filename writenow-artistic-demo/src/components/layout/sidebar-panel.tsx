import { cn } from '@/lib/utils';
import type { ReactNode } from 'react';

interface SidebarPanelProps {
  /** Panel title displayed in the header */
  title: string;
  /** Optional action buttons for the header right side */
  actions?: ReactNode;
  /** Main content of the panel */
  children: ReactNode;
  /** Optional footer content */
  footer?: ReactNode;
  /** Additional class names for the root element */
  className?: string;
}

/**
 * SidebarPanel - Consistent sidebar content container.
 * 
 * Why unified structure: Ensures all sidebar views (Files, Search, History, etc.)
 * have consistent layout with header, scrollable body, and optional footer.
 * 
 * Structure:
 * - Header (h-10): Title + action buttons, fixed
 * - Body: Scrollable content area with custom scrollbar
 * - Footer (optional): Fixed bottom area for additional actions
 * 
 * @example
 * ```tsx
 * <SidebarPanel
 *   title="Explorer"
 *   actions={
 *     <>
 *       <IconButton icon={FolderPlus} size="sm" tooltip="New Folder" />
 *       <IconButton icon={Plus} size="sm" tooltip="New File" />
 *     </>
 *   }
 *   footer={<div>Storage: 2.5 GB</div>}
 * >
 *   <FileTree files={files} />
 * </SidebarPanel>
 * ```
 */
export function SidebarPanel({ 
  title, 
  actions, 
  children, 
  footer,
  className 
}: SidebarPanelProps) {
  return (
    <aside 
      className={cn(
        'w-[260px] h-full flex flex-col',
        'bg-[var(--bg-surface)] border-r border-[var(--border-subtle)]',
        className
      )}
    >
      {/* Header - Fixed height with title and actions */}
      <header className="h-10 shrink-0 flex items-center justify-between px-3 border-b border-[var(--border-subtle)]">
        <span className="text-[10px] font-semibold uppercase tracking-wider text-[var(--fg-muted)]">
          {title}
        </span>
        {actions && (
          <div className="flex items-center gap-1">
            {actions}
          </div>
        )}
      </header>

      {/* Body - Scrollable content area */}
      <div className="flex-1 overflow-y-auto custom-scrollbar">
        {children}
      </div>

      {/* Footer - Optional fixed bottom area */}
      {footer && (
        <footer className="shrink-0 border-t border-[var(--border-subtle)] p-2">
          {footer}
        </footer>
      )}
    </aside>
  );
}

interface SidebarPanelSectionProps {
  /** Optional section title */
  title?: string;
  /** Section content */
  children: ReactNode;
  /** Additional class names */
  className?: string;
}

/**
 * SidebarPanelSection - Grouping component for sidebar content.
 * 
 * Why: Provides consistent spacing and optional title for
 * logical groupings within the sidebar panel.
 * 
 * @example
 * ```tsx
 * <SidebarPanelSection title="Recent">
 *   <FileItem name="doc.md" />
 *   <FileItem name="notes.md" />
 * </SidebarPanelSection>
 * ```
 */
export function SidebarPanelSection({ 
  title, 
  children, 
  className 
}: SidebarPanelSectionProps) {
  return (
    <section className={cn('py-2 px-2', className)}>
      {title && (
        <h3 className="px-2 mb-2 text-[10px] font-semibold uppercase tracking-wider text-[var(--fg-subtle)]">
          {title}
        </h3>
      )}
      {children}
    </section>
  );
}
