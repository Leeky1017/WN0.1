/**
 * WriteNow UI - Main App Component
 * 
 * 应用根组件，负责路由配置和全局状态管理。
 * 当前为开发阶段占位，后续将集成 React Router 和 AppShell 布局。
 */
export function App() {
  return (
    <div className="w-screen h-screen flex items-center justify-center bg-[var(--color-bg-body)]">
      <div className="text-center">
        {/* Brand */}
        <h1 className="text-[32px] font-semibold tracking-tight mb-4">
          <span className="text-[var(--color-text-primary)]">WRITE</span>
          <span className="text-[var(--color-text-secondary)] font-light">NOW</span>
        </h1>
        
        {/* Status */}
        <p className="text-[var(--color-text-secondary)] text-[14px]">
          Project initialized successfully
        </p>
        
        {/* Design Tokens Test */}
        <div className="mt-8 flex flex-col gap-4 items-center">
          {/* Color Swatches */}
          <div className="flex gap-2">
            <div 
              className="w-8 h-8 rounded-md border border-[var(--color-border-default)]" 
              style={{ backgroundColor: 'var(--color-bg-body)' }}
              title="--color-bg-body"
            />
            <div 
              className="w-8 h-8 rounded-md border border-[var(--color-border-default)]" 
              style={{ backgroundColor: 'var(--color-bg-surface)' }}
              title="--color-bg-surface"
            />
            <div 
              className="w-8 h-8 rounded-md border border-[var(--color-border-default)]" 
              style={{ backgroundColor: 'var(--color-bg-hover)' }}
              title="--color-bg-hover"
            />
            <div 
              className="w-8 h-8 rounded-md border border-[var(--color-border-default)]" 
              style={{ backgroundColor: 'var(--color-primary)' }}
              title="--color-primary"
            />
          </div>
          
          {/* Typography Test */}
          <p className="text-[var(--color-text-tertiary)] text-[12px] font-mono">
            Design Tokens: ✓ | Tailwind: ✓ | TypeScript: ✓
          </p>
        </div>
      </div>
    </div>
  );
}
