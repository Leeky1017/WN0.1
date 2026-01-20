Codex Task: WriteNow Frontend UX/DX Deep Remediation OpenSpec
任务目标
基于 Gemini 和 Opus 的深度审计反馈，创建一个完整的 OpenSpec，系统性地优化 WriteNow 前端的视觉体验、交互设计、技术架构和开发规范。核心原则：不"砍"功能，而是"优化"功能的形态和位置。

基本信息
Spec 目录: /home/leeky/work/WriteNow/openspec/specs/wn-frontend-deep-remediation/
参考文档: 
/home/leeky/work/WriteNow/docs/WN前端探讨.md
目标: 让 WN 前端具备专业软件的质感，消除"AI 糖果味"，建立可维护的设计系统
一、设计系统基础设施 (Design System Infrastructure)
1.1 CSS 变量系统规范化
问题现状:

Sidebar.tsx 等组件中发现大量硬编码颜色（如 bg-[#252526]），未使用预定义的 CSS 变量
出现了 wn-text-quaternary 和 wn-elevated 等未在 index.css 规范定义的类名
Dark Mode 下会出现各种乱入的"亮灰色"块
优化目标:

建立完整的 CSS Design Tokens 系统
所有颜色、间距、圆角、阴影必须通过变量引用
支持未来的主题扩展（深蓝、羊皮纸等）
具体任务:

审计所有组件，列出所有硬编码的颜色值
在 index.css 中建立完整的 --wn-* 变量命名规范
创建 tokens.ts 或 tokens.css 作为 Design Tokens 的 Single Source of Truth
为 Light/Dark 模式定义完整的颜色映射表
创建 PostCSS/Stylelint 规则，禁止硬编码颜色值
待回答的架构问题:

为什么没有建立 components/wn-* 的封装层，将 shadcn 基础组件包装成符合 WN 设计语言的高阶组件？
如何设计一个分层的 Design Token 系统（Primitive → Semantic → Component）？
1.2 组件库封装层建设
问题现状:

src/components/ui 下有 48 个 shadcn/ui 组件，但 Sidebar.tsx 和 Editor.tsx 几乎完全没用
手动拼凑的 div 和硬编码风格导致 UI 表现不一致
没有 Resizable、Dialog 等专业组件的应用
优化目标:

建立 wn-* 高阶组件库，封装 shadcn/ui 基础组件
确保所有 WN 特有的设计语言（圆角、阴影、动效）统一应用
具体任务:

创建 src/components/wn/ 目录作为 WN 专属组件层
封装 WnPanel、WnResizable、WnButton、WnInput 等核心组件
每个 WN 组件必须包含：TypeScript 类型定义、JSDoc 文档、Storybook Story
建立组件 API 设计规范（Props 命名约定、事件命名约定）
待回答的架构问题:

应该采用什么样的组件分层策略？（Atoms → Molecules → Organisms）
如何在不破坏现有功能的前提下逐步迁移现有组件？
二、布局系统重构 (Layout System Refactoring)
2.1 修复"三明治陷阱"布局割裂
问题现状:

StatsBar (h-8) 横穿整个窗口顶部，切断了 ActivityBar 和 Sidebar 的垂直连贯性
侧边栏看起来是被"挤"在中间的方块，而不是贯穿整体的侧边容器
垂直空间浪费：TitleBar (40px) + StatsBar (32px) + Editor TabBar (36px) + Editor Toolbar (40px) + Editor StatusBar (24px) = 172px，近 1/5 屏幕高度
优化目标（不砍功能，优化形态）:

重新设计布局层级，让侧边栏从窗口顶部延伸到底部
最大化编辑区的可用垂直空间
保留所有功能信息，但以更紧凑的方式呈现
具体任务:

使用 react-resizable-panels 重构 App.tsx 布局结构
将布局改为：[ActivityBar | Sidebar | MainContent | AIPanel] 垂直贯穿
TitleBar 的功能整合到 Sidebar 头部或 MainContent 区域内
实现面板宽度的拖拽调整和状态持久化
待回答的架构问题:

布局状态（各面板宽度、折叠状态）应该存储在 Store 还是 localStorage？
如何处理响应式布局？小屏幕时应该如何降级？
2.2 状态栏合并与优化
问题现状:

双重状态显示：顶部 StatsBar（字数、阅读时间、番茄钟）和底部 StatusBar（字数、行号、保存状态）信息重复
用户不知道该关注哪一边
优化目标（不砍功能，优化位置）:

将所有状态信息整合到底部 24px 的超细状态栏
番茄钟以悬浮式目标追踪的形式呈现，减少视觉干扰
使用渐进式披露：点击展开详情
具体任务:

设计新的统一 StatusBar 组件，高度不超过 24px
实现 StatusBar 的分区布局：左侧（文件状态）、中间（编辑信息）、右侧（辅助功能）
番茄钟改为编辑区右上角的小型进度圆环，鼠标悬停展开详情
字数目标进度使用微型进度条，非侵入式显示
待回答的架构问题:

哪些信息是"常驻显示"的，哪些是"悬停/点击显示"的？
如何在专注模式下进一步精简 StatusBar？
2.3 TabBar 与 Toolbar 合并
问题现状:

Editor 的 TabBar 和 Toolbar 分占两行，浪费垂直空间
TabBar 目前逻辑上支持多标签，但实际只能打开一个文件
关闭按钮 (X) 孤零零存在，多标签切换未实现
优化目标:

合并 TabBar 和 Toolbar 到一行
利用 Lucide 图标的极简性减少文字占比
实现真正的多标签页功能
具体任务:

设计合并后的 TabBar-Toolbar 组合组件
左侧显示文件标签（支持多标签拖拽排序）
右侧显示常用工具图标（模式切换、预览、分栏等）
实现标签页的右键菜单（关闭、关闭其他、关闭已保存）
待回答的架构问题:

多标签页的状态管理如何设计？每个标签页需要保存哪些状态？
大量标签页时如何处理溢出？
三、编辑器核心优化 (Editor Core Optimization)
3.1 Word 模式技术债清理
问题现状:

Word 模式使用已被 Web 标准弃用的 document.execCommand
渲染方式使用极其原始的 dangerouslySetInnerHTML
复杂格式粘贴、撤销重做逻辑极易崩溃
优化目标:

迁移到现代富文本编辑器框架
确保与 AI 实时内容注入的兼容性
具体任务:

评估并选择编辑器框架：Tiptap vs Lexical vs ProseMirror
设计编辑器抽象层 EditorAdapter，隔离底层实现
实现 Markdown 和 WYSIWYG 模式的双向转换
保证撤销/重做、协同编辑、AI 注入的稳定性
待回答的架构问题:

Tiptap 和 Lexical 各有什么优劣？WN 的场景更适合哪个？
如何在迁移过程中保证用户现有文档的兼容性？
3.2 Markdown 预览的全保真实现
问题现状:

预览只是简单地把内容塞进带 whitespace-pre-wrap 的 div
缺少：代码高亮 (Prism/shiki)、数学公式 (KaTeX)、表格排版、Mermaid 图表
优化目标:

实现完整的 Markdown 渲染能力
支持高级创作者需要的所有格式
具体任务:

集成 react-markdown + remark-gfm 生态
添加代码高亮支持（Shiki，支持多主题）
添加数学公式渲染（KaTeX）
添加 Mermaid 图表渲染
添加表格增强（自动对齐、排序）
确保预览区和编辑区的滚动同步
待回答的架构问题:

大文档的预览渲染如何优化性能？是否需要虚拟化？
如何实现编辑区光标位置和预览区滚动位置的精确同步？
3.3 Split Mode 分割线交互
问题现状:

Split 模式只是简单让两个 div 各占 50%
没有拖拽手柄 (Resize Handle) 调整预览区大小
优化目标:

实现可拖拽的分割线
记忆用户的分割偏好
具体任务:

使用 react-resizable-panels 实现分栏
提供精致的拖拽手柄样式
持久化用户的分割比例偏好
3.4 行号条视觉优化
问题现状:

Markdown 模式下行号条背景色与编辑器不同
Dark mode 下产生明显的亮色/中度灰色竖带，干扰视觉重心
优化目标:

让行号条更加低调、不干扰
与编辑器背景融为一体
具体任务:

行号条背景使用透明或极微妙的色差
行号文字颜色使用 --wn-text-tertiary
当前行行号高亮，其他行淡化
3.5 字体系统优化
问题现状:

Markdown 模式强制使用 font-mono (等宽字体)
长篇文学创作时等宽字体容易导致眼部疲劳
缺少字体切换选项
优化目标:

提供"等宽 (Mono)"/"衬线 (Serif)"/"非衬线 (Sans)"三种字体模式
让用户根据创作类型自由选择
具体任务:

在设置中添加字体偏好选项
预设优质字体组合（Mono: JetBrains Mono, Serif: Source Serif Pro, Sans: Inter）
支持自定义字体上传（高级功能）
四、AI 面板深度重构 (AI Panel Deep Refactoring)
4.1 像素级间距与响应式优化
问题现状:

侧边 AI 面板宽度写死 340px
小屏幕太宽，大屏幕无法拉伸
优化目标:

实现可拖拽调整宽度
响应式适配不同屏幕
具体任务:

使用 Resizable 组件包裹 AI Panel
设置最小宽度 280px，最大宽度 50vw
持久化用户宽度偏好
4.2 SKILL 快捷功能区重设计
问题现状:

SKILL 快捷功能区放在消息列表和输入框之间
对话变长时，用户需要滚动或在狭窄空隙里找功能
优化目标:

SKILL 区块应该始终易于访问
不随对话滚动而消失
具体任务:

将 SKILL 区块移至 AI Panel 顶部固定位置
设计为可折叠的快捷操作栏
支持自定义常用 SKILL 的固定显示
4.3 对话视觉层级强化
问题现状:

AI 回复和用户提问仅依靠 You 和 AI 两个 11px 小字区分
没有气泡感、背景偏差或缩进
长文本对话变成一团乱麻
优化目标:

清晰区分用户消息和 AI 回复
支持 Markdown 渲染
具体任务:

用户消息右对齐，背景微亮
AI 回复左对齐，背景使用极微妙的深度色差（比背景亮 2%）
集成 Markdown 渲染支持 AI 回复的格式化内容
添加消息时间戳、复制按钮、重新生成按钮
4.4 AI 上下文感知与记忆
问题现状:

AI 不知道用户当前光标选中的是哪一段话
底层 Store 没有同步光标 Context
会话刷新即丢失
无法调用用户之前写过的内容作为参考
优化目标:

AI 能感知当前编辑上下文
会话持久化
跨文档记忆能力
具体任务:

在 Store 中添加 editorContext 状态：当前选中文本、光标位置、当前段落
AI 请求自动附带当前上下文
会话历史持久化到本地数据库
实现文档向量化索引，支持跨文档语义检索
待回答的架构问题:

AI 上下文应该包含多大的范围？整个文档还是当前可视区域？
会话历史的存储策略是什么？按文档还是全局？
4.5 内联 AI 指令 (Inline CMD+K)
问题现状:

需要 AI 扩写时，必须挪动鼠标去点右侧面板
在"写字区"和"聊天区"之间频繁切换视线
优化目标:

引入内联命令模式
在编辑器任何位置快速调用 AI
具体任务:

实现 Cmd/Ctrl + K 快捷键唤起内联输入框
内联输入框显示在当前光标位置下方
支持常用操作快捷选择：续写、润色、翻译、解释
AI 结果直接在文稿内生成/替换
4.6 灵感板 (Scratchpad) 模式
问题现状:

AI 面板只是聊天，生成的素材需要手动复制粘贴
优化目标:

AI 生成的素材能一键"拖入"编辑器
具体任务:

AI 回复支持拖拽到编辑器
添加"插入到光标位置"按钮
支持素材收藏到灵感板，跨会话复用
五、侧边栏与文件管理 (Sidebar & File Management)
5.1 内联新建文章
问题现状:

新建文章需要跳出全局覆盖式模态框 (Modal)
操作繁琐，打断心流
优化目标:

在侧边栏文件列表内联创建
具体任务:

新建按钮点击后，在文件列表顶部出现内联输入框
输入文件名后回车创建
Escape 键取消
5.2 搜索能力升级
问题现状:

搜索仅支持文件名搜索
作为 AI 软件却没有语义搜索
优化目标:

支持全文搜索
支持语义搜索
具体任务:

实现全文内容搜索，高亮匹配结果
集成语义搜索能力："帮我找一下上周写的那段关于落日的描写"
搜索结果按相关性排序
待回答的架构问题:

语义搜索的向量化索引应该在前端还是后端完成？
如何平衡搜索准确性和响应速度？
5.3 卡片/看板视图（未来方向）
问题现状:

侧边栏是典型的 VS Code 资源管理器拷贝
创作者需要管理"构思逻辑"而不只是"项目结构"
优化目标:

支持类似 Scrivener 的卡片模式排列章节
具体任务:

设计卡片视图组件 WnCardView
支持拖拽排序章节
每个卡片显示章节概要和状态标记
六、用户心流保护 (User Flow Protection)
6.1 打字机滚动 (Typewriter Scrolling)
问题现状:

当前行随着输入向下移动，视线需要不断调整
优化目标:

当前行始终保持在屏幕垂直中心
具体任务:

实现 Typewriter 模式开关
编辑时自动滚动，保持光标行居中
6.2 段落聚焦 (Paragraph Focus)
问题现状:

所有段落同等显示，注意力容易分散
优化目标:

非当前段落淡化显示
具体任务:

实现 Focus 模式开关
当前段落全不透明，相邻段落微透明，其他段落更透明
支持调整聚焦强度
6.3 无干扰模式 (Zen Mode)
问题现状:

专注模式只是隐藏侧边栏
还有大量 UI chrome 干扰
优化目标:

真正的全屏无干扰写作
具体任务:

Zen 模式隐藏所有 UI，只留文字和光标
背景可选择纯色或渐变
鼠标移动到边缘时临时显示工具
七、性能与技术债务 (Performance & Tech Debt)
7.1 自动保存性能优化
问题现状:

tsx
autosaveTimerRef.current = window.setTimeout(() => {
  save().catch(() => undefined);
}, 2000);
每次内容变化都重新设置 2 秒定时器，长文档会导致频繁 IPC 调用。

优化目标:

使用 debounce + 脏标记批量写入
具体任务:

实现 useDebouncedSave Hook
使用脏标记 (isDirty) 检测真正需要保存的情况
实现增量保存（仅保存变更部分）
7.2 国际化完整实施
问题现状:

使用了 useTranslation()，但很多地方硬编码中文（如 "正在加载..."、"已保存"）
i18n 集成不彻底
优化目标:

100% 的 UI 文本都通过 i18n 系统
具体任务:

审计所有硬编码的 UI 文本
创建完整的 zh-CN 和 en-US 语言包
添加 ESLint 规则禁止硬编码 UI 文本
八、视觉质感提升 (Visual Quality Enhancement)
8.1 消除"AI 糖果味"
问题现状:

当前 WN 有浓厚的 AI 味道
有糖果味道、质感不够好
不像专业软件的风格和质量
优化目标:

打造高级、克制、专业的视觉感受
参考 Linear、Cursor、Notion 的设计语言
具体任务:

调整色彩系统：减少饱和度，增加灰度层次
优化阴影系统：使用多层微妙阴影替代单层硬阴影
统一圆角系统：建立 4px/8px/12px 三档圆角规范
动效优化：使用 spring 物理动画替代线性过渡
图标优化：统一使用 Lucide Icons，确保视觉一致性
8.2 排版系统精细化
具体任务:

建立字体层级：H1/H2/H3/Body/Caption/Code
定义行高比例：标题 1.2，正文 1.6
定义字重规范：Regular 400，Medium 500，Semibold 600
九、验证计划 (Verification Plan)
自动化测试
组件单元测试覆盖率 > 80%
E2E 测试覆盖核心用户流程
Visual Regression 测试确保样式一致性
手动验证
在 1080p / 1440p / 4K 分辨率下验证布局
在 Light / Dark 模式下验证所有组件
进行 15 分钟以上的长文写作测试验证心流
十、实施优先级建议
优先级	任务	依赖
P0	设计系统基础设施（CSS 变量、wn-* 组件库）	无
P0	Markdown 预览全保真实现	无
P1	布局系统重构（Resizable 面板）	P0 组件库
P1	状态栏合并	P0 设计系统
P1	AI 上下文绑定	无
P2	内联 AI (CMD+K)	P1 AI 上下文
P2	Word 模式迁移到 Tiptap/Lexical	无
P2	用户心流保护功能	P1 布局
P3	语义搜索	后端支持
P3	卡片/看板视图	P2 布局完成
附录：待回答的关键架构问题汇总
组件封装策略：如何在不破坏现有功能的前提下逐步迁移到 wn-* 组件库？
编辑器框架选型：Tiptap vs Lexical，WN 场景更适合哪个？
布局状态管理：面板宽度、折叠状态应该存储在哪里？
AI 上下文范围：应该包含整个文档还是当前可视区域？
性能权衡：大文档的预览渲染和语义搜索如何优化？
响应式策略：小屏幕设备如何降级展示？
主题系统：如何设计支持未来自定义主题的 Token 结构？
请 Codex 基于以上内容，在 /home/leeky/work/WriteNow/openspec/specs/wn-frontend-deep-remediation/ 创建完整的 OpenSpec，包括：

spec.md：完整规格说明
design/：各模块设计文档
task_cards/：可执行的任务卡片（按优先级分组）
每个 Task Card 需要包含：

清晰的完成标准 (Acceptance Criteria)
具体的文件变更列表
依赖关系