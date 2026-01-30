/**
 * EditorPage
 * 
 * 编辑器页面，使用 AppShell 三栏布局。
 * 
 * @see DESIGN_SPEC.md 7.3 Editor 页面
 * @see design-a565d21b
 */
import { useEffect, useState, useCallback } from 'react';
import { useParams } from 'react-router-dom';
import { Folder, Search, Bot, Clock, Settings } from 'lucide-react';
import { AppShell } from '../../components/layout/AppShell';
import { IconBar, type IconBarItem } from '../../components/layout/IconBar';
import { SidebarContent } from '../../components/layout/Sidebar/SidebarContent';
import { SidebarSection } from '../../components/layout/Sidebar/SidebarSection';
import { SidebarItem } from '../../components/layout/Sidebar/SidebarItem';
import { EditorToolbar } from './components/EditorToolbar';
import { EditorTipTap } from './components/EditorTipTap';
import { EditorDetailsPanel } from './components/EditorDetailsPanel';
import { LoadingState } from '../../components/patterns/LoadingState';
import { ErrorState } from '../../components/patterns/ErrorState';
import { useEditorStore } from '../../stores/editorStore';
import { useProjectStore, type Project } from '../../stores/projectStore';
import { useLayoutStore } from '../../stores/layoutStore';

/**
 * Icon Bar 导航项配置
 */
const ICON_BAR_ITEMS: IconBarItem[] = [
  { id: 'projects', icon: <Folder />, label: 'Projects' },
  { id: 'search', icon: <Search />, label: 'Search' },
  { id: 'ai', icon: <Bot />, label: 'AI Assistant' },
  { id: 'history', icon: <Clock />, label: 'Version History' },
];

const ICON_BAR_BOTTOM_ITEMS: IconBarItem[] = [
  { id: 'settings', icon: <Settings />, label: 'Settings' },
];

/**
 * 编辑器侧边栏 - 文件树
 */
function EditorSidebar({ 
  project,
  onCollapse,
}: { 
  project: Project | null;
  onCollapse?: () => void;
}) {
  return (
    <SidebarContent
      title={project?.name || 'Untitled'}
      onCollapse={onCollapse}
    >
      <SidebarSection title="Files">
        {/* TODO: 对接 file:list IPC 显示文件树 */}
        <SidebarItem icon={<Folder />}>Chapters</SidebarItem>
        <SidebarItem icon={<Folder />} indent>Chapter 1</SidebarItem>
        <SidebarItem icon={<Folder />} indent>Chapter 2</SidebarItem>
        <SidebarItem icon={<Folder />} indent>Chapter 3</SidebarItem>
        <SidebarItem icon={<Folder />}>Notes</SidebarItem>
        <SidebarItem icon={<Folder />}>Research</SidebarItem>
      </SidebarSection>
    </SidebarContent>
  );
}

/**
 * Mock 文档内容
 * 
 * 用于开发和演示，后续对接 file:read IPC 后移除
 */
const MOCK_CONTENT = `
<h1>The Art of Creative Writing</h1>

<p>Every writer begins their journey with a blank page. It's both terrifying and exhilarating—the infinite possibilities stretching before you like an unexplored frontier.</p>

<h2>Finding Your Voice</h2>

<p>Your writing voice is as unique as your fingerprint. It emerges gradually, shaped by everything you've read, experienced, and imagined. Don't try to force it; let it develop naturally through practice.</p>

<blockquote>
<p>"There is nothing to writing. All you do is sit down at a typewriter and bleed."</p>
</blockquote>

<p>This famous quote, often attributed to Hemingway, captures the essence of authentic writing. It's not about perfection—it's about honesty.</p>

<h2>The Daily Practice</h2>

<p>The most important habit a writer can develop is consistency. Write every day, even if it's just a few sentences. The act of showing up matters more than the word count.</p>

<p>Consider keeping a writing journal where you explore ideas freely, without judgment. This becomes your creative laboratory, a space for experimentation.</p>

<h2>Revision as Discovery</h2>

<p>First drafts are for getting ideas down. The real writing happens in revision. Don't be afraid to cut, reshape, and reimagine your work. Every edit brings you closer to your vision.</p>
`;

export function EditorPage() {
  const { id } = useParams<{ id: string }>();
  const { projects } = useProjectStore();
  const { 
    activeIconBarItem, 
    setActiveIconBarItem, 
    toggleSidebar,
    panelCollapsed,
    togglePanel,
  } = useLayoutStore();
  const { 
    setCurrentProject, 
    setDocumentContent,
    currentProject,
  } = useEditorStore();

  // 本地状态
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [title, setTitle] = useState('Untitled');

  // 加载项目数据
  useEffect(() => {
    if (!id) {
      setError('No project ID provided');
      setIsLoading(false);
      return undefined;
    }

    // 从 projectStore 获取项目
    const project = projects.find((p) => p.id === id);
    
    if (project) {
      setCurrentProject(project);
      setTitle(project.name);
      // 加载 mock 内容
      setDocumentContent(MOCK_CONTENT);
      setIsLoading(false);
      return undefined;
    }
    
    // 如果项目列表还没加载，模拟加载
    const timer = setTimeout(() => {
      // Mock project
      const mockProject: Project = {
        id: id,
        name: 'The Art of Creative Writing',
        description: 'A comprehensive guide to mastering the craft of storytelling.',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        status: 'draft',
        tags: ['writing', 'guide'],
        wordCount: 0,
        readTime: 0,
        featured: false,
      };
      setCurrentProject(mockProject);
      setTitle(mockProject.name);
      setDocumentContent(MOCK_CONTENT);
      setIsLoading(false);
    }, 300);

    return () => clearTimeout(timer);
  }, [id, projects, setCurrentProject, setDocumentContent]);

  /**
   * 处理标题变更
   */
  const handleTitleChange = useCallback((newTitle: string) => {
    setTitle(newTitle);
    // TODO: 对接 project:update IPC 更新项目名称
  }, []);

  /**
   * 处理 Icon Bar 选择
   */
  function handleIconBarSelect(itemId: string) {
    setActiveIconBarItem(itemId);
    // TODO: 根据不同的 icon 显示不同的侧边栏内容
  }

  // 加载状态
  if (isLoading) {
    return (
      <div className="w-screen h-screen flex items-center justify-center bg-[var(--color-bg-body)]">
        <LoadingState text="Loading document..." />
      </div>
    );
  }

  // 错误状态
  if (error) {
    return (
      <div className="w-screen h-screen flex items-center justify-center bg-[var(--color-bg-body)]">
        <ErrorState
          title="Failed to load document"
          description={error}
        />
      </div>
    );
  }

  return (
    <AppShell
      iconBar={
        <IconBar
          items={ICON_BAR_ITEMS}
          bottomItems={ICON_BAR_BOTTOM_ITEMS}
          activeId={activeIconBarItem}
          onSelect={handleIconBarSelect}
          onToggleSidebar={toggleSidebar}
        />
      }
      sidebar={
        <EditorSidebar
          project={currentProject}
          onCollapse={toggleSidebar}
        />
      }
      panel={
        !panelCollapsed && (
          <EditorDetailsPanel
            project={currentProject}
            onCollapse={togglePanel}
          />
        )
      }
    >
      {/* Toolbar */}
      <EditorToolbar
        title={title}
        onTitleChange={handleTitleChange}
      />
      
      {/* Editor Content Area */}
      <div className="flex-1 overflow-auto bg-[var(--color-bg-body)]">
        <EditorTipTap
          initialContent={MOCK_CONTENT}
          placeholder="Start writing your masterpiece..."
        />
      </div>
    </AppShell>
  );
}
