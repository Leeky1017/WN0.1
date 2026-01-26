import { useState, useCallback, useMemo } from 'react';
import { motion } from 'framer-motion';
import { Plus, FolderPlus } from 'lucide-react';
import { ActivityBar, type SidebarTab } from './activity-bar';
import { SidebarPanel } from './sidebar-panel';
import { Header } from './header';
import { Footer } from './footer';
import { Editor } from '../editor/Editor';
import { AIPanel } from '../ai-panel/AIPanel';
import { WelcomeScreen } from './WelcomeScreen';
import { FileItem } from '../composed/file-item';
import { SearchField } from '@/components/composed/search-field';
import { IconButton } from '@/components/ui/icon-button';

/**
 * AppShell - The main application layout container.
 * 
 * Performance optimizations:
 * - useCallback for event handlers to prevent child re-renders
 * - useMemo for derived values
 * - CSS transitions with will-change for GPU acceleration
 * - React.memo on child components (FileItem, MessageBubble)
 */
export function AppShell() {
  const [isAiPanelOpen, setIsAiPanelOpen] = useState(true);
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);
  const [activeSidebarTab, setActiveSidebarTab] = useState<SidebarTab>('files');
  const [showWelcome, setShowWelcome] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');

  /**
   * Handle tab change with smart toggle behavior.
   * Clicking active tab collapses sidebar, clicking other tab opens it.
   */
  const handleTabChange = useCallback((tab: SidebarTab) => {
    setActiveSidebarTab((current) => {
      if (current === tab) {
        setIsSidebarOpen((open) => !open);
        return current;
      }
      setIsSidebarOpen(true);
      return tab;
    });
  }, []);

  const handleToggleSidebar = useCallback(() => {
    setIsSidebarOpen((prev) => !prev);
  }, []);

  const handleToggleAiPanel = useCallback(() => {
    setIsAiPanelOpen((prev) => !prev);
  }, []);

  const handleStartFromWelcome = useCallback(() => {
    setShowWelcome(false);
  }, []);

  /** Map sidebar tab to display title */
  const sidebarTitle = useMemo(() => {
    const titles: Record<SidebarTab, string> = {
      files: 'Explorer',
      search: 'Search',
      outline: 'Outline',
      history: 'History',
      settings: 'Settings',
    };
    return titles[activeSidebarTab];
  }, [activeSidebarTab]);

  if (showWelcome) {
    return <WelcomeScreen onStart={handleStartFromWelcome} />;
  }

  return (
    <div className="h-screen w-screen flex flex-col overflow-hidden bg-[var(--bg-base)] text-[var(--fg-default)] font-sans select-none">
      {/* 1. Header: The Command Center */}
      <Header
        fileName="prologue.md"
        isSaved={true}
        isSidebarOpen={isSidebarOpen}
        onToggleSidebar={handleToggleSidebar}
        isAiPanelOpen={isAiPanelOpen}
        onToggleAiPanel={handleToggleAiPanel}
      />

      {/* 2. Main Workbench */}
      <div className="flex-1 flex overflow-hidden">
        
        {/* Left Side: Navigation Stack */}
        <div className="flex h-full shrink-0">
          {/* Activity Bar (Icons) - New refactored component */}
          <ActivityBar activeTab={activeSidebarTab} onTabChange={handleTabChange} />

          {/* 
            Sidebar Panel (Content) - Performance-optimized animation
            
            Why this approach:
            - Using width animation would cause layout reflow (expensive)
            - Using transform only affects compositing (GPU accelerated)
            - overflow-hidden clips content during animation
            - will-change hints browser for optimization
          */}
          <div 
            className="h-full overflow-hidden transition-[width] duration-[250ms] ease-out"
            style={{ 
              width: isSidebarOpen ? 260 : 0,
              willChange: 'width',
            }}
          >
            <motion.div
              initial={false}
              animate={{ 
                opacity: isSidebarOpen ? 1 : 0,
              }}
              transition={{ duration: 0.15, ease: 'easeOut' }}
              className="h-full w-[260px]"
            >
            <SidebarPanel
              title={sidebarTitle}
              actions={
                activeSidebarTab === 'files' ? (
                  <>
                    <IconButton icon={FolderPlus} size="sm" tooltip="New Folder" tooltipSide="bottom" />
                    <IconButton icon={Plus} size="sm" tooltip="New File" tooltipSide="bottom" />
                  </>
                ) : undefined
              }
            >
              {/* Files View */}
              {activeSidebarTab === 'files' && (
                <div className="py-2 px-2 space-y-0.5">
                  <FileItem name="prologue.md" type="file" depth={0} active selected />
                  <FileItem name="chapter-1.md" type="file" depth={0} />
                  <FileItem name="research" type="folder" depth={0} expanded />
                  <FileItem name="character-profiles.md" type="file" depth={1} />
                  <FileItem name="world-building.md" type="file" depth={1} modified />
                  <FileItem name="outline.md" type="file" depth={0} />
                </div>
              )}
              
              {/* Search View */}
              {activeSidebarTab === 'search' && (
                <div className="p-3 space-y-4">
                  <SearchField
                    value={searchQuery}
                    onChange={setSearchQuery}
                    placeholder="Search in files..."
                  />
                  <div className="text-[11px] text-[var(--fg-muted)] text-center py-10 font-medium">
                    {searchQuery ? `No results for "${searchQuery}"` : 'No recent searches'}
                  </div>
                </div>
              )}
              
              {/* Outline View */}
              {activeSidebarTab === 'outline' && (
                <div className="py-3 px-4 space-y-3">
                  <div className="flex flex-col gap-2">
                    <div className="flex items-center gap-2 text-[11px] font-semibold text-[var(--fg-default)]">
                      <span className="w-1 h-3 bg-[var(--accent-default)] rounded-full" />
                      Prologue
                    </div>
                    <div className="pl-3 space-y-2 border-l border-[var(--border-subtle)] ml-0.5">
                      <div className="text-[11px] text-[var(--fg-muted)] hover:text-[var(--fg-default)] cursor-pointer transition-colors">Scene 1: The Window</div>
                      <div className="text-[11px] text-[var(--fg-muted)] hover:text-[var(--fg-default)] cursor-pointer transition-colors">Scene 2: The Letter</div>
                    </div>
                  </div>
                  <div className="flex items-center gap-2 text-[11px] font-semibold text-[var(--fg-subtle)] opacity-50">
                    <span className="w-1 h-3 bg-[var(--border-strong)] rounded-full" />
                    Chapter 1
                  </div>
                </div>
              )}
              
              {/* History View */}
              {activeSidebarTab === 'history' && (
                <div className="py-2 px-2 space-y-1">
                  {[
                    { time: '10 min ago', desc: 'Refined character intro' },
                    { time: '1 hour ago', desc: 'Added sensory details' },
                    { time: 'Yesterday', desc: 'Draft completed' },
                  ].map((item, i) => (
                    <div key={i} className="p-2 rounded-lg hover:bg-[var(--bg-hover)] cursor-pointer group transition-colors">
                      <div className="text-[11px] font-semibold text-[var(--fg-muted)] group-hover:text-[var(--fg-default)]">{item.desc}</div>
                      <div className="text-[9px] text-[var(--fg-subtle)] mt-1 uppercase tracking-wider">{item.time}</div>
                    </div>
                  ))}
                </div>
              )}
              
              {/* Settings View */}
              {activeSidebarTab === 'settings' && (
                <div className="p-4 text-center text-[var(--fg-muted)] text-sm">
                  Settings panel
                </div>
              )}
            </SidebarPanel>
            </motion.div>
          </div>
        </div>

        {/* Middle: The Editor (Main Canvas) */}
        <main className="flex-1 h-full relative min-w-0 bg-[var(--bg-base)]">
          <Editor />
        </main>

        {/* 
          Right Side: Intelligence Stack
          
          Why this animation approach:
          - Outer div handles width transition (CSS for simplicity)
          - Inner content uses transform for GPU-accelerated slide
          - Opacity fade adds polish without layout cost
        */}
        <aside 
          className="h-full bg-[var(--bg-surface)] border-l border-[var(--border-subtle)] overflow-hidden transition-[width] duration-[250ms] ease-out"
          style={{ 
            width: isAiPanelOpen ? 360 : 0,
            willChange: 'width',
          }}
        >
          <motion.div
            initial={false}
            animate={{ 
              opacity: isAiPanelOpen ? 1 : 0,
            }}
            transition={{ duration: 0.15, ease: 'easeOut' }}
            className="w-[360px] h-full shadow-2xl"
          >
            <AIPanel />
          </motion.div>
        </aside>
      </div>

      {/* 3. Footer: System Status */}
      <Footer line={42} column={12} encoding="UTF-8" language="Markdown" isConnected={true} />
    </div>
  );
}
