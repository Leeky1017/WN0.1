# RUN_LOG: Issue #242 - Phase 4: Agent 自动化测试能力

## 元数据

- **Issue**: https://github.com/Leeky1017/WN0.1/issues/242
- **分支**: `task/242-agent-tests`
- **开始时间**: 2026-01-26
- **状态**: in_progress

## 目标

为 Agent 提供自动化测试能力，使其可以通过 browser MCP 执行完整的前端测试流程。

## 任务范围

- Task 4.1: TestID 标准化审计
- Task 4.2: Agent 测试入口设计
- Task 4.3: 浏览器 MCP 测试脚本

---

## Runs

### Run 1: TestID 标准化审计

**时间**: 2026-01-26 18:00

**目标**: 审计所有可交互元素，确保有 `data-testid`

**执行步骤**:

1. 审计现有 data-testid（27 处）
2. 添加布局级别 data-testid:
   - `layout-main` (AppLayout)
   - `menubar`, `menu-file/edit/view/publish` (MenuBar)
   - `toggle-stats-bar`, `toggle-focus-mode`, `toggle-ai-panel`
3. 添加编辑器工具栏 data-testid:
   - `editor-panel` (EditorPanel)
   - `editor-toolbar` (EditorToolbar)
   - `toolbar-mode-markdown/richtext`
   - `toolbar-view-edit/preview/split`
   - `toolbar-export`
4. 添加命令面板 data-testid:
   - `command-palette`
   - `command-palette-dialog`
   - `command-palette-input`
5. 添加设置视图 data-testid:
   - `settings-view`
   - `settings-list`
   - `settings-group-{name}`
   - `settings-item-{name}`

**结果**: ✅ 新增 20+ data-testid

### Run 2: Agent 测试入口

**时间**: 2026-01-26 18:02

**目标**: 创建可被 Agent 驱动的测试框架

**执行步骤**:

1. 创建 `tests/e2e/agent-test-runner.spec.ts`
2. 定义 10 个测试场景:
   - `create-file-edit-save`
   - `version-history-restore`
   - `stats-display-accuracy`
   - `outline-navigation`
   - `ai-panel-connection`
   - `command-palette-search`
   - `long-content-10k-chars`
   - `special-characters-unicode`
   - `rapid-consecutive-saves`
3. 添加 Playwright E2E 测试用例

**结果**: ✅ Agent 测试入口已创建

### Run 3: 浏览器 MCP 测试脚本

**时间**: 2026-01-26 18:03

**目标**: 创建 Agent 可读取执行的测试剧本

**执行步骤**:

1. 创建 `tests/mcp/browser-tests.md`
2. 编写 10 个测试剧本:
   - 应用启动验证
   - 侧边栏切换功能
   - StatsView 真实数据
   - HistoryView 版本历史
   - OutlineView 大纲导航
   - AI 面板连接状态
   - 命令面板
   - 编辑器工具栏
   - 创建新文件
   - 边界测试（长内容、特殊字符、快速保存）
3. 添加完整 data-testid 索引表

**结果**: ✅ MCP 测试脚本已创建

### Run 4: 验证和提交

**时间**: 2026-01-26 18:04

**验证命令**:
```bash
npm run lint  # ✅ 通过
npm run build # ✅ 通过
npm test      # ✅ 15 tests passing
```

**状态**: 准备提交
