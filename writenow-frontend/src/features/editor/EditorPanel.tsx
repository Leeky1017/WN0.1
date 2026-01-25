/**
 * EditorPanel - 编辑器面板
 * Phase 2 实现 TipTap 编辑器
 */

interface EditorPanelProps {
  filePath?: string;
}

/**
 * 编辑器面板组件
 * TODO P2-001: 迁移 TipTap 编辑器
 */
export function EditorPanel({ filePath }: EditorPanelProps) {
  return (
    <div className="h-full flex flex-col bg-[var(--bg-editor)]">
      {/* Toolbar placeholder */}
      <div className="flex items-center h-10 px-4 border-b border-[var(--border-subtle)] bg-[var(--bg-sidebar)]">
        <span className="text-sm text-[var(--text-secondary)]">
          {filePath || '无文件'}
        </span>
      </div>
      
      {/* Editor Content */}
      <div className="flex-1 flex items-center justify-center p-8">
        <div className="text-center space-y-4">
          <div className="w-16 h-16 mx-auto rounded-xl bg-[var(--bg-input)] flex items-center justify-center">
            <svg 
              className="w-8 h-8 text-[var(--text-muted)]" 
              fill="none" 
              viewBox="0 0 24 24" 
              stroke="currentColor"
            >
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
            </svg>
          </div>
          <div>
            <h3 className="text-lg font-medium text-[var(--text-primary)]">编辑器</h3>
            <p className="text-sm text-[var(--text-muted)] mt-1">
              TipTap 编辑器将在 Phase 2 实现
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}

export default EditorPanel;
