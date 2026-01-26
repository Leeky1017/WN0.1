/**
 * WorkflowView - 创作工作流视图
 * Why: 按创作阶段组织文档
 */

import { useState } from 'react';
import {
  ChevronRight,
  ChevronDown,
  FileText,
  Plus,
  Lightbulb,
  Edit,
  CheckCircle,
  Send,
} from 'lucide-react';

interface WorkflowViewProps {
  selectedFile: string | null;
  onSelectFile: (file: string) => void;
}

interface ArticleItem {
  name: string;
  wordCount?: number;
  status?: string;
}

interface WorkflowSection {
  title: string;
  icon: React.ComponentType<{ className?: string }>;
  color: string;
  items: ArticleItem[];
}

export function WorkflowView({ selectedFile, onSelectFile }: WorkflowViewProps) {
  const [expandedSections, setExpandedSections] = useState<Set<string>>(
    new Set(['草稿写作']),
  );

  const workflow: WorkflowSection[] = [
    {
      title: '灵感收集',
      icon: Lightbulb,
      color: 'text-yellow-500',
      items: [
        { name: '选题想法.md', wordCount: 234 },
        { name: '热点素材.md', wordCount: 567 },
      ],
    },
    {
      title: '大纲规划',
      icon: Edit,
      color: 'text-blue-500',
      items: [{ name: '新产品介绍大纲.md', wordCount: 890 }],
    },
    {
      title: '草稿写作',
      icon: FileText,
      color: 'text-purple-500',
      items: [
        { name: '欢迎使用.md', wordCount: 1234 },
        { name: '今日想法.md', wordCount: 456 },
        { name: '文章草稿.md', wordCount: 2345 },
      ],
    },
    {
      title: '待发布',
      icon: CheckCircle,
      color: 'text-green-500',
      items: [{ name: '产品介绍.md', wordCount: 3456, status: '已审核' }],
    },
    {
      title: '已发布',
      icon: Send,
      color: 'text-gray-500',
      items: [{ name: '技术分享.md', wordCount: 2890, status: '微信公众号' }],
    },
  ];

  const toggleSection = (title: string) => {
    const newExpanded = new Set(expandedSections);
    if (newExpanded.has(title)) {
      newExpanded.delete(title);
    } else {
      newExpanded.add(title);
    }
    setExpandedSections(newExpanded);
  };

  return (
    <>
      <div className="h-10 shrink-0 flex items-center justify-between px-3 border-b border-[var(--border-subtle)]">
        <span className="text-[10px] font-semibold uppercase tracking-wider text-[var(--fg-muted)]">
          创作工作流
        </span>
        <button className="w-6 h-6 flex items-center justify-center rounded-md hover:bg-[var(--bg-hover)] text-[var(--fg-subtle)] transition-colors duration-[100ms]">
          <Plus className="w-4 h-4" />
        </button>
      </div>

      <div className="flex-1 overflow-y-auto custom-scrollbar py-2">
        {workflow.map((section) => {
          const Icon = section.icon;
          const isExpanded = expandedSections.has(section.title);

          return (
            <div key={section.title} className="mb-1">
              <button
                onClick={() => toggleSection(section.title)}
                className="w-full flex items-center gap-2 px-3 py-1.5 hover:bg-[var(--bg-hover)] transition-colors duration-[100ms] text-left"
              >
                {isExpanded ? (
                  <ChevronDown className="w-3.5 h-3.5 text-[var(--fg-subtle)]" />
                ) : (
                  <ChevronRight className="w-3.5 h-3.5 text-[var(--fg-subtle)]" />
                )}
                <Icon className={`w-4 h-4 ${section.color}`} />
                <span className="text-[13px] text-[var(--fg-muted)] flex-1">
                  {section.title}
                </span>
                <span className="text-[11px] text-[var(--fg-subtle)]">
                  {section.items.length}
                </span>
              </button>

              {isExpanded && (
                <div className="mt-0.5">
                  {section.items.map((item) => {
                    const isSelected = selectedFile === item.name;
                    return (
                      <button
                        key={item.name}
                        onClick={() => onSelectFile(item.name)}
                        className={`w-full flex items-center justify-between px-3 py-1 pl-10 hover:bg-[var(--bg-hover)] transition-colors duration-[100ms] text-left ${
                          isSelected ? 'bg-[var(--bg-active)]' : ''
                        }`}
                      >
                        <div className="flex items-center gap-2 flex-1 min-w-0">
                          <FileText className="w-3.5 h-3.5 text-[var(--fg-subtle)] flex-shrink-0" />
                          <span
                            className={`text-[13px] truncate ${
                              isSelected
                                ? 'text-[var(--fg-default)]'
                                : 'text-[var(--fg-muted)]'
                            }`}
                          >
                            {item.name}
                          </span>
                        </div>
                        <div className="flex flex-col items-end gap-0.5 ml-2">
                          <span className="text-[10px] text-[var(--fg-subtle)]">
                            {item.wordCount}字
                          </span>
                          {item.status && (
                            <span className="text-[10px] text-[var(--accent-default)]">
                              {item.status}
                            </span>
                          )}
                        </div>
                      </button>
                    );
                  })}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </>
  );
}

export default WorkflowView;
