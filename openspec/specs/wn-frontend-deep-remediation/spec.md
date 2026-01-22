# FRONTEND 深度修复规范（UX/DX + 设计系统）

Status: paused (2026-01-22; blocked by `openspec/specs/sprint-theia-migration/spec.md`)

## Purpose

基于 `CODEX_TASK前端探讨.md` 与 `docs/WN前端探讨.md` 的审计反馈，本规范定义 WriteNow 前端的“深度修复（Deep Remediation）”目标：让产品具备专业软件质感（Linear/Cursor/Notion 风格的克制与精密），消除“AI 糖果味”，并以可维护、可测试、可渐进迁移的方式优化现有功能的**形态与位置**（不砍功能）。

本规范是跨 Sprint 的前端一致性基线，作为后续迭代的 UI/UX/DX 上游来源；与已有 Sprint 规范不冲突（以“提取 + 增量”方式细化）。

> 术语约定：本 spec 内所有 Requirement ID 统一使用前缀 `FROTNEND-`（按任务要求保留拼写）用于在任务卡片、PR、实现与测试中引用。

## Requirements

### Requirement: FROTNEND-DS-001 设计 Token MUST 成为样式单一事实源（SSOT）

前端 MUST 建立分层 Design Tokens（Primitive → Semantic → Component），并通过 CSS 变量（`--wn-*`）向 Tailwind/组件层暴露。任何颜色/间距/圆角/阴影/动效参数 MUST 可追溯到 tokens SSOT，支持未来主题扩展（深蓝、羊皮纸等）。

#### Scenario: Token 命名与分层可审计
- **WHEN** 开发者新增或修改视觉参数（颜色/间距/圆角/阴影/动效）
- **THEN** 变更 MUST 发生在 tokens SSOT（例如 `src/styles/tokens.css` / `src/styles/tokens.ts`）并遵循分层命名规则（Primitive→Semantic→Component），禁止在业务组件内引入新的“半私有 token”

#### Scenario: Light/Dark 主题映射完整且一致
- **WHEN** 用户切换 Light/Dark 模式
- **THEN** 所有语义 token（例如 `--wn-bg-*` / `--wn-text-*` / `--wn-border-*` / `--wn-shadow-*`）必须有明确映射，且界面不得出现“亮灰色乱入块”

---

### Requirement: FROTNEND-DS-002 项目 MUST 禁止硬编码颜色与未定义类名

项目 MUST 通过自动化约束（lint/CI）禁止硬编码颜色值（hex/rgb/hsl）与未在 tokens/样式规范中定义的 `wn-*` 类名，避免主题扩展时 UI 破裂与风格漂移。

#### Scenario: 硬编码颜色被 CI 阻断
- **WHEN** 代码中出现硬编码颜色（例如 `bg-[#252526]`、`color: #fff`）
- **THEN** lint/CI MUST 失败并给出可定位的错误信息与修复指引（改用 token / 语义类）

#### Scenario: 未定义 `wn-*` 类名被 CI 阻断
- **WHEN** 代码中出现 `wn-*` 类名但 tokens/样式规范中不存在对应定义
- **THEN** lint/CI MUST 失败，避免“幽灵语义”扩散（例如 `wn-text-quaternary`、`wn-elevated`）

---

### Requirement: FROTNEND-DS-003 MUST 建立 `src/components/wn/` 封装层并统一 API 设计

项目 MUST 建立 WN 专属组件层（`src/components/wn/`），封装 shadcn/ui 基础组件为符合 WN 设计语言的高阶组件（圆角/阴影/动效/密度/交互一致）。WN 组件 MUST 具备完整类型定义与最小但可用的文档与示例。

#### Scenario: WN 组件可替换业务中的“手搓 div”
- **WHEN** 业务页面需要面板/按钮/输入框/可拖拽面板/对话框等基础能力
- **THEN** 必须优先使用 `WnPanel` / `WnButton` / `WnInput` / `WnResizable` / `WnDialog` 等 WN 封装组件，而不是在业务组件内重复实现布局与交互

#### Scenario: 组件 API 命名一致且可预测
- **WHEN** 开发者查看任意 `Wn*` 组件的 props
- **THEN** props/事件命名 MUST 遵循统一约定（例如 `onOpenChange` / `isDisabled` / `variant` / `size`），并避免同类组件出现不同命名与不同密度默认值

---

### Requirement: FROTNEND-LAYOUT-001 布局 MUST 消除“三明治陷阱”，侧边容器垂直贯穿

应用布局 MUST 重构为“垂直贯穿”的四栏体系：`[ActivityBar | Sidebar | MainContent | AIPanel]` 从窗口顶部延伸到底部；避免 `StatsBar` 横穿切断侧边栏，最大化编辑区可用垂直空间。

#### Scenario: 侧边栏视觉连续
- **WHEN** 用户打开应用进入主界面
- **THEN** Sidebar 与 AIPanel 必须从窗口顶部贯穿到底部，不得被顶部横向条切断为“中间方块”

#### Scenario: 面板宽度可拖拽且可恢复
- **WHEN** 用户拖拽调整 Sidebar/AIPanel 宽度或折叠面板
- **THEN** 宽度/折叠状态 MUST 持久化，并在应用重启后恢复到上次状态

---

### Requirement: FROTNEND-LAYOUT-002 状态信息 MUST 合并到单一超细 StatusBar 并渐进披露

系统 MUST 将重复/分散的状态信息合并到窗口底部单一状态栏（高度不超过 24px），并使用渐进式披露（hover/click 展开）呈现低频信息；番茄钟/字数目标等 MUST 以低干扰形态呈现（例如编辑区右上角微型进度）。

#### Scenario: 顶部与底部状态不再重复
- **WHEN** 用户观察界面状态信息（字数/保存状态/行号/番茄钟等）
- **THEN** 不得出现“顶部一套 + 底部一套”的重复展示；状态信息必须有唯一主位置

#### Scenario: 专注模式下状态栏可进一步精简
- **WHEN** 用户进入专注/Zen 类模式
- **THEN** StatusBar MUST 支持切换到更低干扰的显示策略（例如仅保留保存状态与最小字数）

---

### Requirement: FROTNEND-EDITOR-001 TabBar 与 Toolbar MUST 合并到一行且支持真正多标签

编辑器 MUST 合并 TabBar 与 Toolbar 到单行，减少垂直空间浪费，并实现真正可用的多标签（打开/切换/关闭/排序/溢出处理）。多标签状态 MUST 可恢复且与文件系统状态一致。

#### Scenario: 多标签基本闭环
- **WHEN** 用户打开多个文档
- **THEN** TabBar MUST 显示多个标签并允许切换；关闭标签不得影响其他已打开标签的状态（脏状态/滚动位置等）

#### Scenario: 标签管理交互可发现
- **WHEN** 用户右键点击标签或使用快捷键
- **THEN** 必须提供常用操作（关闭/关闭其他/关闭已保存/复制路径等）且行为与状态一致（例如禁止静默丢弃未保存内容）

---

### Requirement: FROTNEND-EDITOR-002 Markdown 预览 MUST 全保真并支持大文档性能

Markdown 预览 MUST 从“纯文本 div”升级为全保真渲染：GFM 表格/任务列表、代码高亮（支持多主题）、数学公式、Mermaid 图表，并提供编辑区与预览区滚动同步；大文档 MUST 有明确的性能策略（虚拟化/增量渲染/缓存）。

#### Scenario: 常见 Markdown 能力完整渲染
- **WHEN** 文档包含代码块/表格/数学公式/Mermaid
- **THEN** 预览区 MUST 以正确排版渲染（含代码高亮与公式排版），且在 Light/Dark 下主题一致

#### Scenario: 滚动同步可用且不抖动
- **WHEN** 用户在编辑区滚动或在预览区滚动
- **THEN** 另一侧 MUST 同步到对应位置，且不得出现明显抖动/跳动/失配

---

### Requirement: FROTNEND-EDITOR-003 Split 模式 MUST 提供可拖拽分割线并持久化偏好

Split 模式 MUST 提供精致的拖拽手柄（Resize Handle）允许用户调整编辑/预览比例，并持久化用户偏好；在小屏幕下 MUST 有降级策略（例如自动改为切换模式而非并排）。

#### Scenario: 分割比例可调且可恢复
- **WHEN** 用户拖拽 Split 分割线调整比例
- **THEN** 分割比例 MUST 立即生效并在重启后恢复

#### Scenario: 小屏幕降级策略明确
- **WHEN** 窗口宽度低于阈值
- **THEN** Split MUST 自动降级为更可读的模式（例如单列编辑/单列预览切换），且给出可理解提示（可关闭）

---

### Requirement: FROTNEND-EDITOR-004 排版与行号 MUST 低干扰并支持字体模式切换

编辑器 MUST 提供字体模式（Mono/Serif/Sans）切换与合理预设（可扩展到自定义字体），并使行号条与编辑器背景融为一体（避免 dark mode 竖带）；当前行行号高亮、其他行淡化。

#### Scenario: 字体偏好可设置与可恢复
- **WHEN** 用户在设置中切换字体模式
- **THEN** 编辑器字体 MUST 即时切换且偏好持久化；不同模式下行高/字重必须保持可读性一致

#### Scenario: 行号条不破坏视觉重心
- **WHEN** 用户在 Dark 模式写作
- **THEN** 行号区域不得出现明显亮色竖带；行号文本使用语义 token（例如 `--wn-text-tertiary`）且当前行高亮符合整体对比度策略

---

### Requirement: FROTNEND-AI-001 AI 面板 MUST 支持响应式与专业对话层级

AI 面板 MUST 支持可拖拽宽度（最小 280px、最大 50vw）与持久化偏好；对话展示 MUST 清晰区分用户/AI（对齐、缩进、微妙背景深度差），并支持 Markdown 渲染、复制/重试等常用操作。

#### Scenario: 宽度与响应式策略可用
- **WHEN** 用户在不同分辨率下使用 AI 面板
- **THEN** 面板宽度 MUST 可拖拽调整且遵守 min/max 约束；小屏幕下不得挤压编辑区到不可用

#### Scenario: 对话层级清晰且可操作
- **WHEN** 对话包含长文本与格式化内容
- **THEN** 用户消息与 AI 回复必须易区分（对齐/背景/间距）；AI 回复支持 Markdown 渲染；每条消息至少提供复制与时间戳（可弱显）

---

### Requirement: FROTNEND-AI-002 SKILL 快捷区 MUST 固定在顶部并可折叠/可定制

SKILL 快捷功能区 MUST 移至 AI 面板顶部固定位置（不随对话滚动消失），并支持折叠与用户自定义“常用 SKILL 固定显示”。

#### Scenario: 对话变长时 SKILL 仍可触达
- **WHEN** 对话列表滚动到很长
- **THEN** SKILL 快捷区仍必须可见/可一键展开，无需滚动查找

#### Scenario: 用户可固定常用 SKILL
- **WHEN** 用户将某个 SKILL 设为常用
- **THEN** SKILL 必须固定展示（或置顶）且偏好持久化；取消固定后恢复默认顺序

---

### Requirement: FROTNEND-AI-003 AI MUST 感知编辑上下文且会话 MUST 持久化

AI 请求 MUST 自动携带编辑上下文（选区文本、光标位置、当前段落、必要的前后文范围），并将会话历史持久化到本地（应用重启可恢复）；跨文档引用能力 MUST 有清晰策略（例如通过全文索引/向量索引检索）。

#### Scenario: 选区与段落上下文自动注入
- **WHEN** 用户对选中文本触发任意 SKILL
- **THEN** 系统 MUST 注入选区 + 当前段落 +（按策略）前后文范围，并在 UI 提供“发送的上下文”可查看入口

#### Scenario: 会话可恢复且可按文档关联
- **WHEN** 用户重启应用回到同一文档
- **THEN** AI 面板 MUST 恢复该文档最近会话（或提供明确的“继续/新会话”选择），不得静默丢失

---

### Requirement: FROTNEND-AI-004 MUST 提供内联 AI 指令（Cmd/Ctrl+K）并直接作用于文稿

系统 MUST 提供内联命令模式：用户在编辑器任意位置按 `Cmd/Ctrl+K` 唤起内联输入框，支持常用操作快捷选择（续写/润色/翻译/解释等），并将结果以“可确认”的方式直接插入/替换到文稿（禁止静默改写）。

#### Scenario: 快捷键唤起与定位
- **WHEN** 用户按下 `Cmd/Ctrl+K`
- **THEN** 内联输入框必须出现在当前光标附近且不遮挡关键内容；按 `Esc` 关闭并回到编辑

#### Scenario: 结果应用可控且可撤销
- **WHEN** AI 生成完成
- **THEN** 用户必须能选择“插入/替换/取消”；应用后必须可撤销（undo）并记录版本（与现有版本系统一致）

---

### Requirement: FROTNEND-SIDEBAR-001 文件管理 MUST 支持内联新建与增强搜索

侧边栏文件列表 MUST 支持内联新建文章（Enter 创建、Esc 取消）以保护心流；搜索 MUST 覆盖文件名 + 全文内容，并为未来语义搜索预留一致入口（按相关性排序、结果高亮）。

#### Scenario: 内联新建不打断写作
- **WHEN** 用户点击新建文章
- **THEN** 文件列表顶部出现内联输入框；Enter 创建并自动聚焦编辑器；Esc 取消且不影响当前文稿

#### Scenario: 全文搜索结果可定位
- **WHEN** 用户输入搜索词并选择某条结果
- **THEN** 必须跳转到对应文档与命中位置（高亮），并提供上/下一处命中导航

---

### Requirement: FROTNEND-FLOW-001 MUST 提供心流保护模式（Typewriter/Focus/Zen）

系统 MUST 提供至少三类心流保护能力：打字机滚动（当前行保持垂直居中）、段落聚焦（非当前段落渐隐）、Zen 模式（隐藏所有 chrome，仅保留文字与光标，边缘唤出临时 UI）。

#### Scenario: Typewriter 模式保持视线稳定
- **WHEN** 用户启用 Typewriter 模式并持续输入
- **THEN** 光标行 MUST 尽量保持在视口垂直中心（容错范围可配置），避免频繁视线追踪

#### Scenario: Zen 模式可进入/退出且不丢状态
- **WHEN** 用户进入 Zen 模式并退出
- **THEN** 原布局（面板宽度/折叠/光标位置）必须可恢复，且不得改变文稿内容或造成滚动位置丢失

---

### Requirement: FROTNEND-TECH-001 MUST 优化自动保存与 i18n 完整性

自动保存 MUST 使用 debounce + 脏标记批量写入，避免长文档频繁 IPC；全量 UI 文本 MUST 通过 i18n 系统提供（至少 zh-CN/en），并通过 lint/CI 禁止硬编码文本。

#### Scenario: 长文档下保存不会频繁触发 IPC
- **WHEN** 用户在长文档中持续输入
- **THEN** 保存请求 MUST 被 debounce/合并，且仅在 `isDirty` 时写入；不得在每次输入都重置定时器导致 IPC 压力

#### Scenario: i18n 覆盖率被 CI 约束
- **WHEN** 代码中出现硬编码可见 UI 文本（非日志/调试）
- **THEN** lint/CI MUST 失败并提示改用 `t()`；语言包必须覆盖 zh-CN/en 的同构 key

---

### Requirement: FROTNEND-QUALITY-001 MUST 定义并执行可验证的视觉与交互质量门禁

深度修复 MUST 以可验证的方式落地质量门禁：核心用户路径 E2E 覆盖（真实交互/真实数据落盘）、视觉回归测试（关键视图截图/像素差）、以及多分辨率/多主题手动验证矩阵；任何 UI 变更 MUST 附带证据（测试输出/截图）。

#### Scenario: 核心路径 E2E 覆盖且不使用假数据
- **WHEN** 变更涉及编辑器/AI/侧边栏/布局等用户核心路径
- **THEN** 必须新增或更新 Playwright E2E 覆盖真实用户路径（创建→编辑→保存→预览→AI→回退等），且不得使用“假装落盘”的 stub 数据

#### Scenario: 视觉回归保护设计一致性
- **WHEN** 变更涉及 tokens/组件外观/布局密度
- **THEN** 必须更新视觉回归基线并通过差异阈值门禁，避免风格漂移与回归

---

## References

- 深度修复任务输入：`CODEX_TASK前端探讨.md`
- 审计对话记录：`docs/WN前端探讨.md`
- 产品上游规范：`openspec/specs/writenow-spec/spec.md`
- 相关 Sprint 规范：`openspec/specs/sprint-1-editor/spec.md`、`openspec/specs/sprint-2-ai/spec.md`、`openspec/specs/sprint-6-experience/spec.md`
