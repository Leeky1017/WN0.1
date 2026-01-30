/**
 * DashboardSidebar Component
 * 
 * 仪表盘侧边栏，展示项目列表和 Collections 分类。
 * 
 * @see DESIGN_SPEC.md 4.3 Sidebar Content
 * @see DESIGN_SPEC.md 7.2 Dashboard 页面
 */
import { FileText, Folder, Plus, Archive, Send, LayoutGrid } from 'lucide-react';
import { SidebarContent } from '../../../components/layout/Sidebar/SidebarContent';
import { SidebarSection } from '../../../components/layout/Sidebar/SidebarSection';
import { SidebarItem } from '../../../components/layout/Sidebar/SidebarItem';
import { Button } from '../../../components/primitives/Button';
import { useProjectStore, type ProjectState } from '../../../stores/projectStore';

/**
 * Collection 类型定义
 * 
 * 临时本地实现，后续对接 collection:* IPC
 */
interface Collection {
  id: string;
  name: string;
  icon: React.ReactNode;
  count: number;
}

export interface DashboardSidebarProps {
  /** 折叠回调 */
  onCollapse?: () => void;
  /** 创建项目回调 */
  onCreateProject?: () => void;
}

/**
 * Mock Collections 数据
 * 
 * 后续对接 collection:list IPC 后移除
 */
const MOCK_COLLECTIONS: Collection[] = [
  { id: 'fiction', name: 'Fiction', icon: <FileText />, count: 3 },
  { id: 'blog', name: 'Blog Posts', icon: <FileText />, count: 2 },
  { id: 'docs', name: 'Documentation', icon: <FileText />, count: 1 },
];

/**
 * 项目状态过滤项
 */
const STATUS_FILTERS: Array<{
  id: ProjectState['filter'];
  label: string;
  icon: React.ReactNode;
}> = [
  { id: 'all', label: 'All Projects', icon: <LayoutGrid /> },
  { id: 'draft', label: 'Drafts', icon: <FileText /> },
  { id: 'published', label: 'Published', icon: <Send /> },
  { id: 'archived', label: 'Archived', icon: <Archive /> },
];

export function DashboardSidebar({ onCollapse, onCreateProject }: DashboardSidebarProps) {
  const { filter, setFilter, projects } = useProjectStore();
  
  // 计算各状态项目数量
  const counts = {
    all: projects.length,
    draft: projects.filter((p) => p.status === 'draft').length,
    published: projects.filter((p) => p.status === 'published').length,
    archived: projects.filter((p) => p.status === 'archived').length,
  };

  return (
    <SidebarContent
      title="Projects"
      onCollapse={onCollapse}
      headerAction={
        <Button
          variant="ghost"
          size="sm"
          leftIcon={<Plus className="w-3 h-3" />}
          onClick={onCreateProject}
          className="h-6 px-2 text-[11px]"
        >
          New
        </Button>
      }
    >
      {/* Status Filter Section */}
      <SidebarSection>
        {STATUS_FILTERS.map((item) => (
          <SidebarItem
            key={item.id}
            icon={item.icon}
            active={filter === item.id}
            badge={counts[item.id]}
            onClick={() => setFilter(item.id)}
          >
            {item.label}
          </SidebarItem>
        ))}
      </SidebarSection>

      {/* Collections Section */}
      <SidebarSection
        title="Collections"
        action={
          <button
            type="button"
            className="w-4 h-4 flex items-center justify-center rounded text-[#666666] hover:text-white transition-colors"
            aria-label="Add collection"
          >
            <Plus className="w-3 h-3" />
          </button>
        }
      >
        {MOCK_COLLECTIONS.map((collection) => (
          <SidebarItem
            key={collection.id}
            icon={<Folder />}
            badge={collection.count}
          >
            {collection.name}
          </SidebarItem>
        ))}
      </SidebarSection>
    </SidebarContent>
  );
}

DashboardSidebar.displayName = 'DashboardSidebar';
