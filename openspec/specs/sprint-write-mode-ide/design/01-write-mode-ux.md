# 01 - IDE Write Mode 的功能与形态（UX / IA / 交互模型）

> 本文定义 Write Mode 的“产品级形态”，包括：布局、可见信息、交互模型、状态机与 E2E 可验收行为。
>
> 目标：让写作体验达到“IDE 级别的连续输入 + 最小干扰 + 可控 AI + 不丢稿”。

---

## 1. 术语

- **Workbench**：主工作台（Header + 左侧导航 + 中央编辑器 + 右侧 AI + Footer）。
- **Write Mode**：默认写作模式（内容优先、干扰最小、写作主动作可达）。
- **Focus/Zen**：Write Mode 子状态（最大化沉浸，隐藏非必要 UI）。
- **Review Mode**：对 AI 修改/版本 diff 的审阅状态（diff/accept/reject）。

---

## 1.1 Write Mode 状态机（必须明确，避免“UI 卡死”）

Write Mode 的 UI 状态必须可枚举（否则会出现“某些状态下按钮失效/Esc 不工作/保存卡住”）。

建议状态机（高层）：

```
WriteMode
  ├─ Normal
  │    ├─ EditorIdle
  │    ├─ Saving (non-blocking)
  │    └─ Error (recoverable)
  ├─ FocusZen (sub-state of Normal; UI folded)
  └─ Review (AI diff / version diff)

Overlays (independent, Esc closes)
  - CommandPalette (cmdk)
  - Settings
  - Dropdowns/Popovers
```

关键不变量：
- Saving 不得阻塞输入（Saving 只是一个状态标记）
- Review 必须“可退出且不应用修改”（Esc）
- 任意 overlay 关闭后必须回到“可输入”状态（焦点回 editor）

---

## 2. 现状对齐（Repo 事实）

当前 `writenow-frontend` 已具备：

- Workbench 骨架：`writenow-frontend/src/components/layout/AppShell.tsx`
- Header / Footer / Activity bar：`writenow-frontend/src/components/layout/*`
- TipTapEditor（可序列化为 Markdown）：`writenow-frontend/src/components/editor/TipTapEditor.tsx`
- AI 真实编排逻辑（skills + streaming + cancel + diff 计算）：`writenow-frontend/src/features/ai-panel/useAISkill.ts`

同时存在影响交付质量的 demo/stub：

- `writenow-frontend/src/components/editor/Editor.tsx` 使用 contentEditable + 假内容（注明“production would be replaced”）。
- `writenow-frontend/src/components/ai-panel/AIPanel.tsx` 为纯 UI demo（非真实 skills/rpc）。
- `AppShell.tsx` 的 file tree / history 等为静态数据。

本 Sprint 的 Write Mode 策略：**用最低成本把 UI 与真实逻辑接起来**，并把 demo 入口删掉，避免双栈。

---

## 2.1 关键可复用资产（写作主路径的“真实现”在哪里）

为了避免“重新发明一套”，Write Mode 应优先复用并补齐以下已有实现：

- 文件树真实数据与文件操作：
  - `writenow-frontend/src/features/file-tree/useFileTree.ts`（`file:list/create/delete` + rename 迁移策略）
  - 本地排序持久化：`DOCUMENT_ORDER_STORAGE_KEY = "writenow-documents-order-v1"`
- 命令面板数据来源：
  - `writenow-frontend/src/stores/commandPaletteStore.ts`（recent，`MAX_RECENT = 12`）
  - `writenow-frontend/src/features/command-palette/useCommands.ts`（recent/files/skills 组装）
- 保存/状态栏基础 store：
  - `writenow-frontend/src/stores/statusBarStore.ts`（`saveStatus`, `aiStatus`, cursor/word count）
  - `writenow-frontend/src/stores/editorFilesStore.ts`（每文件 dirty/save 状态）
- AI 编排：
  - `writenow-frontend/src/features/ai-panel/useAISkill.ts`（skills list + stream + cancel + diff 计算）
  - `writenow-frontend/src/stores/aiStore.ts`（diff 状态机）
  - `writenow-frontend/src/stores/editorRuntimeStore.ts`（selection snapshot + active TipTap editor）

策略：**让 UI 变薄**（presentational components），把行为放在 `features/*` 与 `stores/*`，以降低长期维护成本。

---

## 3. Write Mode 布局（默认态）

### 3.1 信息架构（IA）

Write Mode 必须保证：
- 用户一眼知道：**正在编辑哪个文件**、**是否已保存**、**光标位置**、**AI 状态**。
- 其余信息必须“按需出现”，不能抢夺注意力。

推荐 IA：

```
┌──────────────────────────────────────────────────────────────────────┐
│ Header (薄)                                                          │
│  左：项目/导航切换    中：文件名 + 保存状态    右：字数/WPM + AI 开关  │
├──────────────────────────────────────────────────────────────────────┤
│ ActivityBar │ Sidebar (可折叠) │   Editor Canvas (中心)   │ AI Panel  │
│ (icons)     │ files/search/... │  TipTapEditor + toolbar  │ (可折叠)  │
├──────────────────────────────────────────────────────────────────────┤
│ Footer (薄)    左：连接/位置/编码     右：语言/模式（rich/markdown）   │
└──────────────────────────────────────────────────────────────────────┘
```

> 说明：以上结构与现有 `AppShell.tsx` 一致，成本最低。

### 3.2 默认折叠策略（写作优先）

- 左侧 Sidebar：默认打开（让用户有“项目感”）；进入 Focus/Zen 时自动隐藏。
- 右侧 AI Panel：默认打开（写作 IDE 的差异化）；进入 Focus/Zen 时自动隐藏，但保持快捷键可一键唤起。

---

## 3.3 Write Mode “必须可见的反馈”（信任构建）

Write Mode 必须把以下信息“持续可见或一键可见”（不隐藏在深层菜单）：

1) **文件名 + 路径（至少文件名）**
2) **保存状态**：`Unsaved → Saving → Saved`，错误时 `Error` + 重试入口
3) **连接状态**：后端断开时必须提示“只读/不可保存”的真实状态
4) **AI 状态**：`thinking/streaming/error`（至少在 status bar / HUD 可见）

现有可复用状态：
- `useStatusBarStore`：`saveStatus` / `aiStatus` / `isConnected`
- `useEditorFilesStore`：每文件 dirty 标记，用于文件树 “modified dot”

建议稳定选择器（E2E/回归必需）：
- Header：`data-testid="wm-header"`
- 保存指示器：`data-testid="wm-save-indicator"`
- 连接指示器：`data-testid="wm-connection-indicator"`
- AI 状态：`data-testid="wm-ai-indicator"`

---

## 4. Focus/Zen 模式（Write Mode 子状态）

### 4.1 目标

- 最大化编辑区（减少 UI 噪声）
- 不牺牲关键反馈（保存、错误、AI 运行）

### 4.2 UI 行为

进入 Focus/Zen 后：
- MUST 隐藏：ActivityBar、Sidebar、AI Panel、Footer
- SHOULD 收起：Header（或将 Header 变为轻量 HUD）
- MUST 保留：
  - 保存状态（Saved/Saving/Error）
  - 字数（可选）
  - AI 取消入口（Esc）

推荐 HUD（浮层，右上角）：

```
┌─────────────────────────────┐
│  <filename>   Saved ●        │
│  1204 words   AI: idle       │
└─────────────────────────────┘
```

### 4.3 交互与退出

- 进入：`Cmd+\` / `Ctrl+\` 或命令面板
- 退出：同快捷键或 `Esc`（优先级：如果 AI 正在运行，`Esc` 先取消 AI；再次 `Esc` 退出 Focus）

### 4.4 Focus/Zen 的“Esc 优先级”（必须稳定）

为了避免用户困惑，Esc 行为必须稳定且可预测：

1) **若存在“待处理 diff/Review Mode”**：Esc 优先退出 Review（不应用修改），回到普通编辑态
2) 否则，若 **AI 正在 streaming/thinking**：Esc 取消 AI（进入 `canceled`，并清理所有 pending UI）
3) 否则，若 **处于 Focus/Zen**：Esc 退出 Focus/Zen
4) 否则：Esc 关闭浮层（cmdk / settings / dropdown），再无则不做事

这套优先级必须写入 E2E（见 `design/03-quality-gates.md`）。

---

## 5. Write Mode 的编辑器形态

### 5.1 中央画布必须由 TipTap 驱动

Write Mode 的主画布 MUST 使用 `TipTapEditor.tsx`（而非 `Editor.tsx` 的 contentEditable demo）。

原因：
- 双模式（richtext/markdown）
- 可插入扩展（AI diff/tab/toolbar）
- 可稳定序列化为 Markdown（本地持久化）

### 5.2 视觉排版（阅读友好）

现有 `Editor.tsx` 的排版原则是正确方向，建议迁移到 TipTap：
- max width: 70ch
- serif 正文字体
- generous padding

并补充：
- selection 颜色使用 token（已存在 `--accent-muted`）
- 段落间距与标题层级遵守 token

### 5.3 内容模型（必须明确，避免 mode 切换丢内容）

Write Mode 的持久化基线是 **Markdown 文件（`.md`）**。因此编辑器必须明确“支持哪些内容是可逆/可保真”的。

建议支持的最小节点集合（与现有 TipTap 扩展保持一致）：

- 文本：Paragraph / HardBreak
- 结构：Heading（H1–H6）
- 样式：Bold / Italic / Strike / Code / Underline
- 引用与列表：Blockquote / BulletList / OrderedList / TaskList
- 代码：CodeBlock
- 其他：HorizontalRule / Link / Image / Table

**不变量（Why）**：
- rich ↔ markdown 模式切换时，上述节点必须尽可能 **lossless**（不丢内容、不乱序）
- 对于不支持的节点/扩展：允许降级（例如转成纯文本），但必须可解释（toast/提示）

### 5.4 标题与文件名策略（低成本方案）

demo editor 存在独立 title input，但这会引入第二套元数据并增加维护成本。

推荐策略（二选一，必须统一为单一真相）：

1) **H1 作为标题（推荐）**
- 文档标题 = 第一个 H1 的文本（若存在）
- 文件名可独立（允许与标题不一致）

2) **文件名作为标题（最低成本）**
- Header 始终显示文件名
- 编辑器不再维护独立 title 字段

无论选择哪种：
- UI 必须可预测（用户知道“标题从哪来”）
- E2E 必须能稳定断言（标题显示与内容一致）

### 5.5 编辑器外围的“最小工具条”（不抢注意力）

Write Mode 的工具条应该“弱存在”，默认不占用垂直空间，但在需要时可达：

- **Floating Toolbar（已有组件）**：
  - `writenow-frontend/src/components/editor/FloatingToolbar.tsx`
  - 触发：选区/光标停留时出现（类似 Cursor）
  - 必须提供：AI（触发 skill）、加粗/斜体/标题、链接
- **命令面板替代复杂 toolbar**：
  - 复杂操作（插入表格、图片、任务列表）优先放到 cmdk，降低 UI 维护成本

建议稳定选择器：
- Editor root：TipTap 已提供 `data-testid="tiptap-editor"`
- Floating toolbar：`data-testid="wm-floating-toolbar"`

---

## 6. AI 与 Write Mode 的融合方式

### 6.1 两种 AI 交互必须并存但不冲突

1) **Panel AI（深度改写）**
- 入口：右侧 AI Panel
- 触发：选区 + Skill
- 输出：diff + accept/reject

2) **Inline AI（轻量续写）**
- 入口：Tab 续写（本地 LLM）
- 输出：ghost text → Tab 接受 / Esc 取消

冲突规则：
- Tab 续写只在“无 panel diff 待处理”时触发。
- Panel diff 待处理时，Tab 键行为必须明确（优先 accept diff 或插入 Tab，取决于设计）。

### 6.2 Review Mode（审阅状态）

当 panel diff 产生后：
- MUST 进入 Review Mode（UI 需显式：例如 header 显示“Reviewing AI changes”）
- MUST 提供：Accept / Reject / （可选）逐段接受
- MUST 支持取消（Esc）并清理残留高亮

#### 6.2.1 Review 与导航的冲突规则（必须稳定）

当 Review Mode 存在时，用户可能会尝试切换文件/关闭标签/退出应用。为了避免“误丢 AI 结果”或“把 diff 应用到错误文件”，必须规定稳定规则：

- 文件切换/关闭标签：
  - 默认策略（推荐，低成本）：阻止切换并提示“请先 Accept/Reject 当前 AI 修改”
  - 备选策略：允许切换但自动 Reject（并 toast 告知）
- 退出应用：
  - 若存在 pending diff：必须提示（或自动保存一个草稿版本），避免用户以为已应用

不变量：diff 永远只能应用到 selection snapshot 对应的文件与范围。

### 6.3 Accept/Reject 的“写作语义”（避免破坏用户内容）

Accept/Reject 在写作场景必须遵守：

- Accept **必须**是“可逆操作”：Accept 后形成新版本节点（至少在本地版本历史可回退）
- Reject **必须**清理所有 UI 状态：diff decorations、panel 状态、pending runId
- Accept/Reject **不得**改变用户未选中的其他内容（selection snapshot + deterministic apply）

> selection snapshot 现有实现：`writenow-frontend/src/stores/editorRuntimeStore.ts` + `useAISkill.ts` 的 `selectionSnapshotRef`。

---

## 7. 命令面板（Write Mode 的“键盘中枢”）

Write Mode 必须把命令面板当作第一交互入口（类似 Cursor）：

- `Cmd/Ctrl+K` 打开
- 基础命令（最小集合）：
  - Toggle Focus Mode
  - Toggle AI Panel
  - New File / New Folder
  - Search in Project
  - Switch Editor Mode (rich/markdown)
  - Open Settings

### 7.1 命令面板的信息架构（低成本可扩展）

命令面板建议按组渲染（不追求花哨 UI，追求“稳定、可测、可扩展”）：

- Recent（最近使用）：最多 12 条
  - 来源：`useCommandPaletteStore`（`RECENT_STORAGE_KEY = "writenow_cmdk_recent_v1"`）
  - 规则：同 type+id 去重；按 usedAt 降序
- Files（文件）：实时来自 `file:list`（可延迟加载）
- Skills（AI 技能）：来自 `useAIStore().skills`（enabled + valid）
- Commands（命令）：静态表（写在代码里，避免过度抽象）

建议稳定选择器：
- Cmdk root：`data-testid="cmdk"`
- Cmdk input：`data-testid="cmdk-input"`
- Cmdk item：`data-testid="cmdk-item-<type>-<id>"`

### 7.1.1 命令面板的交互细节（必须写清，避免“看起来能用但不顺手”）

- group 顺序（默认）：Recent → Files → Skills → Commands
- 默认选中：
  - query 为空时：Recent 的第一项
  - query 非空时：全局最高分项（跨组）
- Enter 行为：执行当前选中项
- Esc 行为：关闭 cmdk 并把焦点还给 editor（这是写作场景最关键的一点）
- empty/error 状态：
  - Files 加载失败：显示可理解错误 + “Retry”按钮（不 silent）
  - 无结果：显示 “No results” 且不影响输入

Why：命令面板是“高频入口”，任何微小的不确定都会显著增加用户摩擦与维护成本。

### 7.2 快捷键策略（跨平台一致）

推荐默认：
- 打开命令面板：macOS `Cmd+K` / win+linux `Ctrl+K`
- Focus/Zen：macOS `Cmd+\\` / win+linux `Ctrl+\\`
- 保存：macOS `Cmd+S` / win+linux `Ctrl+S`
- 查找：`Cmd/Ctrl+F`
- 取消（优先级见 4.4）：`Esc`

原则：
- **相同语义**跨 OS 必须一致；差异只体现在修饰键上。
- 任何快捷键冲突必须在设置中可见（至少可禁用），避免“用户以为坏了”。

---

## 8. E2E 可验收行为（写进测试）

至少要能用 Playwright 验证：

1) 进入 Write Mode 后，TipTap editor 可输入且保存状态变化（Saving → Saved）。
2) 进入 Focus Mode 后，Sidebar/AI Panel 隐藏；Esc 退出恢复。
3) 触发 AI skill 后出现 diff；Accept 后正文变化并保存。
4) AI 运行中按 Esc：取消 run，并清理 pending/diff 预览。

这些验收点对应 `design/03-quality-gates.md` 的测试矩阵。
