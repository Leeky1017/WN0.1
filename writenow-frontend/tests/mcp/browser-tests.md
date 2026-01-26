# WriteNow Browser MCP 测试脚本

Agent 可读取并通过 browser MCP 执行的测试剧本。

## 前置条件

1. 启动开发服务器：`npm run dev`（默认端口 5180）
2. 确保 browser MCP 已连接

---

## Test: 应用启动验证

**目的**: 验证应用正常加载

```mcp
1. browser_navigate to http://localhost:5180
2. browser_snapshot
3. 验证存在:
   - [data-testid="layout-main"]
   - [data-testid="layout-sidebar"]
   - [data-testid="statusbar"]
```

**预期结果**: 所有元素可见，无错误

---

## Test: 侧边栏切换功能

**目的**: 验证所有侧边栏视图可切换

```mcp
1. browser_navigate to http://localhost:5180
2. browser_click on [data-testid="activity-files"]
3. browser_snapshot - 验证 sidebar 内容变化
4. browser_click on [data-testid="activity-outline"]
5. browser_snapshot - 验证显示大纲视图
6. browser_click on [data-testid="activity-history"]
7. browser_snapshot - 验证显示历史视图
8. browser_click on [data-testid="activity-stats"]
9. browser_snapshot - 验证显示统计视图
10. browser_click on [data-testid="activity-settings"]
11. browser_snapshot - 验证显示设置视图
```

**预期结果**: 每次点击后侧边栏内容正确切换

---

## Test: StatsView 真实数据

**目的**: 验证统计视图使用真实 API 数据，非 Mock

```mcp
1. browser_navigate to http://localhost:5180
2. browser_click on [data-testid="activity-stats"]
3. browser_snapshot
4. 验证存在:
   - [data-testid="stats-today-wordcount"] 
   - [data-testid="stats-weekly-chart"]
   - [data-testid="stats-total-wordcount"]
5. 验证内容:
   - stats-today-wordcount 不等于 "1,234"（Mock 数据）
   - stats-total-wordcount 不等于 "45,234"（Mock 数据）
```

**预期结果**: 显示真实统计数据或 "0"（无数据时）

---

## Test: HistoryView 版本历史

**目的**: 验证版本历史使用真实 API

```mcp
1. browser_navigate to http://localhost:5180
2. 创建或打开一个文件
3. browser_click on [data-testid="activity-history"]
4. browser_snapshot
5. 验证存在:
   - [data-testid="history-list"]
   - [data-testid="history-refresh"]
6. browser_click on [data-testid="history-refresh"]
7. browser_snapshot - 验证列表刷新
```

**预期结果**: 版本历史列表显示真实版本或空状态

---

## Test: OutlineView 大纲导航

**目的**: 验证大纲解析和导航

```mcp
1. browser_navigate to http://localhost:5180
2. 打开一个包含标题的 Markdown 文件
3. browser_click on [data-testid="activity-outline"]
4. browser_snapshot
5. 验证存在:
   - [data-testid="outline-list"]
   - [data-testid="outline-word-count"]
   - [data-testid="outline-heading-count"]
6. 如果有标题，点击第一个标题链接
7. browser_snapshot - 验证编辑器滚动到对应位置
```

**预期结果**: 大纲正确解析文档结构，点击可跳转

---

## Test: AI 面板连接状态

**目的**: 验证 AI 连接状态可视化和重连

```mcp
1. browser_navigate to http://localhost:5180
2. browser_snapshot
3. 验证存在:
   - [data-testid="layout-ai-panel"]
   - [data-testid="ai-connection-status"]
4. 检查连接状态颜色:
   - 绿色: 已连接
   - 黄色: 连接中
   - 红色: 断开
5. 如果存在 [data-testid="ai-reconnect-button"]:
   - browser_click on [data-testid="ai-reconnect-button"]
   - browser_snapshot - 验证重连尝试
```

**预期结果**: 连接状态正确显示，重连按钮功能正常

---

## Test: 命令面板

**目的**: 验证命令面板搜索功能

```mcp
1. browser_navigate to http://localhost:5180
2. browser_keyboard press "Control+k"
3. browser_snapshot
4. 验证存在:
   - [data-testid="command-palette"]
   - [data-testid="command-palette-input"]
5. browser_type in [data-testid="command-palette-input"]: "设置"
6. browser_snapshot - 验证搜索结果显示
7. browser_keyboard press "Escape"
8. browser_snapshot - 验证面板关闭
```

**预期结果**: 命令面板打开、搜索、关闭正常

---

## Test: 编辑器工具栏

**目的**: 验证编辑器工具栏功能

```mcp
1. browser_navigate to http://localhost:5180
2. 打开一个文件
3. browser_snapshot
4. 验证存在:
   - [data-testid="editor-panel"]
   - [data-testid="editor-toolbar"]
   - [data-testid="toolbar-mode-markdown"]
   - [data-testid="toolbar-mode-richtext"]
   - [data-testid="toolbar-export"]
5. browser_click on [data-testid="toolbar-mode-richtext"]
6. browser_snapshot - 验证切换到 Word 模式
7. browser_click on [data-testid="toolbar-mode-markdown"]
8. browser_snapshot - 验证切换回 Markdown 模式
```

**预期结果**: 模式切换正常工作

---

## Test: 创建新文件

**目的**: 验证文件创建流程

```mcp
1. browser_navigate to http://localhost:5180
2. browser_click on [data-testid="activity-files"]
3. browser_snapshot
4. 找到创建文件按钮并点击
5. browser_snapshot
6. 验证存在 [data-testid="file-create-dialog"]
7. browser_fill in [data-testid="file-create-input"]: "test-file.md"
8. browser_click on [data-testid="file-create-confirm"]
9. browser_snapshot - 验证文件已创建并打开
```

**预期结果**: 文件成功创建并在编辑器中打开

---

## 边界测试

### Test: 长内容性能

```mcp
1. 打开编辑器
2. 输入 10000 字符的内容
3. browser_snapshot
4. 验证:
   - 编辑器不卡顿
   - 字数统计正确更新
   - 自动保存正常触发
```

### Test: 特殊字符处理

```mcp
1. 打开编辑器
2. 输入: "🎉 Emoji\n日本語\n<script>test</script>"
3. browser_snapshot
4. 验证:
   - Emoji 正确显示
   - 多语言正确渲染
   - HTML 标签被转义（安全）
```

### Test: 快速保存

```mcp
1. 打开编辑器
2. 连续按 5 次 Ctrl+S
3. browser_snapshot
4. 验证:
   - 无错误状态
   - 保存状态最终为"已保存"
```

---

## data-testid 完整索引

| Category | TestID | Description |
|----------|--------|-------------|
| Layout | `layout-main` | 主布局容器 |
| Layout | `layout-sidebar` | 侧边栏面板 |
| Layout | `layout-ai-panel` | AI 面板 |
| Sidebar | `activity-files` | 文件浏览器按钮 |
| Sidebar | `activity-outline` | 大纲按钮 |
| Sidebar | `activity-history` | 历史按钮 |
| Sidebar | `activity-stats` | 统计按钮 |
| Sidebar | `activity-settings` | 设置按钮 |
| Stats | `stats-today-wordcount` | 今日字数 |
| Stats | `stats-weekly-chart` | 每周图表 |
| Stats | `stats-total-wordcount` | 总字数 |
| Stats | `stats-total-duration` | 总时长 |
| History | `history-list` | 版本列表 |
| History | `history-refresh` | 刷新按钮 |
| History | `history-preview-{id}` | 预览按钮 |
| History | `history-restore-{id}` | 恢复按钮 |
| Outline | `outline-list` | 大纲列表 |
| Outline | `outline-word-count` | 字数 |
| Outline | `outline-heading-count` | 标题数 |
| Outline | `outline-heading-{line}` | 标题项 |
| Editor | `editor-panel` | 编辑器面板 |
| Editor | `editor-toolbar` | 编辑器工具栏 |
| Toolbar | `toolbar-mode-markdown` | Markdown 模式 |
| Toolbar | `toolbar-mode-richtext` | Word 模式 |
| Toolbar | `toolbar-view-edit` | 编辑视图 |
| Toolbar | `toolbar-view-preview` | 预览视图 |
| Toolbar | `toolbar-view-split` | 分屏视图 |
| Toolbar | `toolbar-export` | 导出按钮 |
| Menu | `menubar` | 菜单栏 |
| Menu | `menu-file` | File 菜单 |
| Menu | `menu-edit` | Edit 菜单 |
| Menu | `menu-view` | View 菜单 |
| Menu | `menu-publish` | Publish 菜单 |
| Menu | `toggle-stats-bar` | 统计栏开关 |
| Menu | `toggle-focus-mode` | 专注模式开关 |
| Menu | `toggle-ai-panel` | AI 面板开关 |
| Command | `command-palette` | 命令面板 |
| Command | `command-palette-dialog` | 命令面板对话框 |
| Command | `command-palette-input` | 搜索输入框 |
| AI | `ai-connection-status` | 连接状态指示器 |
| AI | `ai-reconnect-button` | 重连按钮 |
| AI | `ai-connection-error` | 连接错误提示 |
| File | `file-create-dialog` | 创建文件对话框 |
| File | `file-create-input` | 文件名输入框 |
| File | `file-create-confirm` | 确认创建按钮 |
| Settings | `settings-view` | 设置视图 |
| Settings | `settings-list` | 设置列表 |
| Settings | `settings-group-{name}` | 设置组 |
| Settings | `settings-item-{name}` | 设置项 |
| Status | `statusbar` | 状态栏 |
