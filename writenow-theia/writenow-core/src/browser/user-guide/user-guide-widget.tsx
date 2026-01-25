import * as React from '@theia/core/shared/react';
import { codicon, ReactWidget } from '@theia/core/lib/browser/widgets';
import { injectable } from '@theia/core/shared/inversify';

import { WRITENOW_USER_GUIDE_WIDGET_ID } from '../writenow-layout-ids';
import { WN_STRINGS } from '../i18n/nls';

/**
 * User guide section.
 */
type GuideSection = {
    id: string;
    title: string;
    content: string;
};

/**
 * Built-in user guide content.
 * Why: Embedded documentation for offline access.
 */
const GUIDE_SECTIONS: GuideSection[] = [
    {
        id: 'getting-started',
        title: '快速开始',
        content: `
# 快速开始

欢迎使用 WriteNow —— 为创作者打造的 AI 驱动写作 IDE。

## 创建新文档

1. 点击左侧文件资源管理器中的 **新建文件** 按钮
2. 输入文件名（以 .md 结尾）
3. 开始写作！

## 使用 AI 助手

WriteNow 内置了强大的 AI 写作助手：

1. 按 **⌘K**（Mac）或 **Ctrl+K**（Windows）打开 AI 面板
2. 选择要使用的技能（润色、扩写、精简等）
3. 选中需要处理的文本
4. AI 将为你生成建议

## 快捷键

| 功能 | Mac | Windows |
|------|-----|---------|
| 打开 AI 面板 | ⌘K | Ctrl+K |
| 保存 | ⌘S | Ctrl+S |
| 查找 | ⌘F | Ctrl+F |
| 替换 | ⌘H | Ctrl+H |
| 设置 | ⌘, | Ctrl+, |
        `,
    },
    {
        id: 'editor',
        title: '编辑器',
        content: `
# 编辑器功能

WriteNow 使用基于 TipTap 的 Markdown 编辑器，支持所见即所得的写作体验。

## 格式化

### 快捷键

- **⌘B** / **Ctrl+B**：加粗
- **⌘I** / **Ctrl+I**：斜体
- **⌘U** / **Ctrl+U**：下划线

### Markdown 语法

编辑器支持标准 Markdown 语法：

\`\`\`markdown
# 一级标题
## 二级标题

**粗体** 和 *斜体*

- 无序列表
1. 有序列表

> 引用

\`代码\`
\`\`\`

## 工具栏

编辑器顶部的工具栏提供常用格式化功能：

- 标题（H1-H3）
- 加粗、斜体
- 列表（有序、无序）
- 引用
- 代码块
        `,
    },
    {
        id: 'ai-assistant',
        title: 'AI 助手',
        content: `
# AI 写作助手

WriteNow 的 AI 助手可以帮助你：

## 内置技能

### 润色
优化文字表达，使文章更流畅、更专业。

### 扩写
根据给定的内容或大纲，扩展成完整的段落。

### 精简
精简冗长的文字，保留核心信息。

## 使用方法

1. 选中需要处理的文本
2. 按 **⌘K** 打开 AI 面板
3. 选择技能
4. 查看 AI 生成的建议
5. 点击「应用」将建议插入文档

## 配置 AI

在设置中配置你的 AI：

1. 打开设置（⌘,）
2. 选择「AI」分类
3. 选择 Provider（OpenAI 或 Claude）
4. 输入你的 API Key
5. 选择模型
        `,
    },
    {
        id: 'version-history',
        title: '版本历史',
        content: `
# 版本历史

WriteNow 会自动保存你的文档版本，让你可以随时回溯。

## 查看版本

1. 打开命令面板（⌘⇧P）
2. 搜索「版本历史」
3. 点击任意版本查看内容

## 恢复版本

1. 选择要恢复的版本
2. 点击「恢复」按钮
3. 确认恢复

## 自动保存

WriteNow 在以下情况下自动创建版本：

- 每隔 5 分钟自动保存
- 执行 AI 技能前
- 手动保存时（⌘S）
        `,
    },
    {
        id: 'knowledge-graph',
        title: '知识图谱',
        content: `
# 知识图谱

知识图谱帮助你管理作品中的实体和关系。

## 创建实体

1. 选中文本
2. 右键选择「创建知识图谱实体」
3. 设置实体类型和属性

## 实体类型

- **人物**：作品中的角色
- **地点**：故事发生的地点
- **事件**：重要的情节点
- **物品**：关键道具

## 查看关系

打开知识图谱面板（View > 知识图谱），以图形化方式查看实体之间的关系。
        `,
    },
];

/**
 * Simple Markdown renderer.
 * Why: Render markdown content without external dependencies.
 */
function renderMarkdown(content: string): React.ReactNode {
    const lines = content.trim().split('\n');
    const elements: React.ReactNode[] = [];
    let inCodeBlock = false;
    let codeBlockContent: string[] = [];
    // Note: codeBlockLang captured for future syntax highlighting
    let listItems: string[] = [];
    let listType: 'ul' | 'ol' | null = null;

    const flushList = (): void => {
        if (listItems.length > 0 && listType) {
            const ListTag = listType;
            elements.push(
                <ListTag key={elements.length}>
                    {listItems.map((item, i) => (
                        <li key={i}>{item}</li>
                    ))}
                </ListTag>
            );
            listItems = [];
            listType = null;
        }
    };

    for (let i = 0; i < lines.length; i++) {
        const line = lines[i];

        // Code block
        if (line.startsWith('```')) {
            if (inCodeBlock) {
                elements.push(
                    <pre key={elements.length} style={{ background: 'var(--wn-bg-card)', padding: '12px', borderRadius: '4px', overflow: 'auto' }}>
                        <code>{codeBlockContent.join('\n')}</code>
                    </pre>
                );
                codeBlockContent = [];
                inCodeBlock = false;
            } else {
                flushList();
                inCodeBlock = true;
                // Note: line.slice(3) contains the language tag for future syntax highlighting
            }
            continue;
        }

        if (inCodeBlock) {
            codeBlockContent.push(line);
            continue;
        }

        // Headers
        if (line.startsWith('# ')) {
            flushList();
            elements.push(<h1 key={elements.length}>{line.slice(2)}</h1>);
            continue;
        }
        if (line.startsWith('## ')) {
            flushList();
            elements.push(<h2 key={elements.length}>{line.slice(3)}</h2>);
            continue;
        }
        if (line.startsWith('### ')) {
            flushList();
            elements.push(<h3 key={elements.length}>{line.slice(4)}</h3>);
            continue;
        }

        // Lists
        if (line.match(/^- /)) {
            if (listType !== 'ul') {
                flushList();
                listType = 'ul';
            }
            listItems.push(line.slice(2));
            continue;
        }
        if (line.match(/^\d+\. /)) {
            if (listType !== 'ol') {
                flushList();
                listType = 'ol';
            }
            listItems.push(line.replace(/^\d+\. /, ''));
            continue;
        }

        // Blockquote
        if (line.startsWith('> ')) {
            flushList();
            elements.push(
                <blockquote key={elements.length} style={{ borderLeft: '3px solid var(--wn-accent-primary)', paddingLeft: '12px', margin: '12px 0', color: 'var(--wn-text-secondary)' }}>
                    {line.slice(2)}
                </blockquote>
            );
            continue;
        }

        // Table (simplified)
        if (line.startsWith('|')) {
            // Skip for now, tables are complex
            continue;
        }

        // Empty line
        if (!line.trim()) {
            flushList();
            continue;
        }

        // Paragraph
        flushList();
        const formattedLine = line
            .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
            .replace(/\*(.*?)\*/g, '<em>$1</em>')
            .replace(/`(.*?)`/g, '<code style="background: var(--wn-bg-card); padding: 2px 6px; border-radius: 3px;">$1</code>');

        elements.push(
            <p key={elements.length} dangerouslySetInnerHTML={{ __html: formattedLine }} />
        );
    }

    flushList();

    return elements;
}

/**
 * User guide view component.
 */
function UserGuideView(): React.ReactElement {
    const [activeSection, setActiveSection] = React.useState(GUIDE_SECTIONS[0].id);
    const [searchQuery, setSearchQuery] = React.useState('');

    const filteredSections = React.useMemo(() => {
        if (!searchQuery.trim()) return GUIDE_SECTIONS;
        const query = searchQuery.toLowerCase();
        return GUIDE_SECTIONS.filter(
            (section) =>
                section.title.toLowerCase().includes(query) ||
                section.content.toLowerCase().includes(query)
        );
    }, [searchQuery]);

    const currentSection = GUIDE_SECTIONS.find((s) => s.id === activeSection) ?? GUIDE_SECTIONS[0];

    return (
        <div className="wn-p2-widget wn-user-guide" role="region" aria-label={WN_STRINGS.userGuide()}>
            <header className="wn-p2-widget-header">
                <h2 className="wn-p2-widget-title">{WN_STRINGS.userGuide()}</h2>
            </header>

            <div style={{ display: 'flex', flex: 1, overflow: 'hidden' }}>
                {/* Sidebar */}
                <nav className="wn-user-guide-sidebar" role="navigation" aria-label={WN_STRINGS.userGuideNav()}>
                    <div style={{ padding: 'var(--wn-space-2)' }}>
                        <input
                            type="text"
                            className="wn-settings-input"
                            placeholder={WN_STRINGS.userGuideSearch()}
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            aria-label={WN_STRINGS.userGuideSearch()}
                        />
                    </div>
                    {filteredSections.map((section) => (
                        <button
                            key={section.id}
                            type="button"
                            className={`wn-user-guide-nav-item ${activeSection === section.id ? 'wn-user-guide-nav-item--active' : ''}`}
                            onClick={() => setActiveSection(section.id)}
                            aria-current={activeSection === section.id ? 'page' : undefined}
                        >
                            {section.title}
                        </button>
                    ))}
                </nav>

                {/* Content */}
                <div className="wn-user-guide-content">
                    {renderMarkdown(currentSection.content)}
                </div>
            </div>
        </div>
    );
}

@injectable()
export class UserGuideWidget extends ReactWidget {
    static readonly ID = WRITENOW_USER_GUIDE_WIDGET_ID;

    constructor() {
        super();
        this.id = UserGuideWidget.ID;
        this.title.label = WN_STRINGS.userGuide();
        this.title.caption = WN_STRINGS.userGuideCaption();
        this.title.iconClass = codicon('book');
        this.title.closable = true;
        this.addClass('writenow-user-guide');

        this.update();
    }

    protected override render(): React.ReactNode {
        return <UserGuideView />;
    }
}
