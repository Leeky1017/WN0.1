# WriteNow 前端缺口分析规范

Status: active (2026-01-24)

> 本规范系统性分析 WriteNow Theia 前端的功能缺口、交互缺陷和显示问题。
> 通过深入代码审计，识别后端已有但前端未暴露的能力，以及用户体验层面的关键缺失。

## 1. 执行摘要

### 1.1 审计范围

| 层面 | 审计对象 |
|------|---------|
| 前端组件 | `writenow-theia/writenow-core/src/browser/` |
| IPC 契约 | `src/types/ipc-generated.ts` |
| 数据库 | `writenow-core/src/node/database/schema.sql` |
| Sprint 规范 | `openspec/specs/sprint-*/spec.md` |

### 1.2 关键发现

| 类别 | 问题数量 | 严重程度 |
|------|---------|---------|
| 后端能力无前端入口 | 12+ 模块 | 🔴 严重 |
| 数据库表无前端展示 | 10/17 表 | 🔴 严重 |
| Welcome 页面功能缺失 | 8+ 项 | 🔴 严重 |
| 交互反馈缺失 | 6+ 类 | 🟠 中等 |
| 功能发现性问题 | 5+ 项 | 🟠 中等 |
| 视觉设计问题 | 已另案处理 | 🟡 低 |

---

## 2. 已实现前端组件清单

### 2.1 Widget 组件（5 个可用）

| 组件 | ID | 功能状态 | 入口方式 |
|------|---|---------|---------|
| TipTapMarkdownEditorWidget | `writenow-tiptap-markdown-editor` | ✅ 完整 | 打开 .md 文件 |
| AiPanelWidget | `writenow.aiPanel` | ✅ 基本可用 | Cmd+K / 命令 |
| VersionHistoryWidget | `writenow.versionHistory` | ✅ 基本可用 | 命令（无菜单入口） |
| KnowledgeGraphWidget | `writenow.knowledgeGraph` | ✅ 基本可用 | View 菜单 |
| WritenowWelcomeWidget | `writenow.welcome` | 🟠 严重不足 | 启动时自动显示 |

### 2.2 已注册命令

| 命令 ID | 快捷键 | 菜单入口 |
|--------|-------|---------|
| `writenow.aiPanel.open` | Cmd+K | 无 |
| `writenow.aiPanel.close` | Escape | 无 |
| `writenow.versionHistory.open` | 无 | 无 |
| `writenow.versionHistory.save` | 无 | 无 |
| `writenow.knowledgeGraph.open` | 无 | View 菜单 |
| `writenow.knowledgeGraph.createEntityFromSelection` | 无 | Edit 菜单 |

---

## 3. 后端能力无前端入口（🔴 严重）

### 3.1 用户记忆系统（Memory）

**后端能力**：
- 数据库表：`user_memory`（type: preference/feedback/style）
- IPC 接口：`memory:list`, `memory:create`, `memory:update`, `memory:delete`
- IPC 接口：`memory:settings:get`, `memory:settings:update`
- IPC 接口：`memory:injection:preview`, `memory:preferences:ingest`

**前端状态**：❌ 完全缺失

**用户影响**：
- 用户无法查看 AI 学到了什么偏好
- 用户无法管理/删除错误的记忆
- 用户无法控制记忆注入行为

**需要的 UI**：
- 记忆列表面板（CRUD）
- 记忆注入预览
- 偏好学习开关

---

### 3.2 创作统计系统（Stats）

**后端能力**：
- 数据库表：`writing_stats`（date, word_count, writing_minutes, articles_created, skills_used）
- IPC 接口：`stats:getToday`, `stats:getRange`, `stats:increment`

**前端状态**：❌ 完全缺失

**用户影响**：
- 用户不知道自己的创作进度
- 无法追踪写作习惯
- 无法设定目标

**需要的 UI**：
- 今日统计卡片（字数/时长）
- 历史趋势图表
- 目标设定与进度

---

### 3.3 写作约束系统（Constraints）

**后端能力**：
- 数据库表：`writing_constraints`（type, config, level, enabled）
- 数据库表：`terminology`（term, aliases, definition）
- 数据库表：`forbidden_words`（word, category）
- IPC 接口：`constraints:get`, `constraints:set`
- IPC 接口：`judge:l2:prompt`, `judge:model:ensure`, `judge:model:getState`

**前端状态**：❌ 完全缺失

**用户影响**：
- 用户无法配置写作约束
- 用户无法管理术语表
- 用户无法设置禁用词
- 用户看不到约束检查结果

**需要的 UI**：
- 约束配置面板
- 术语表管理
- 禁用词管理
- 约束违规提示（编辑器内）

---

### 3.4 大纲系统（Outline）

**后端能力**：
- 数据库表：`outlines`（project_id, article_id, outline_json）
- IPC 接口：`outline:get`, `outline:save`

**前端状态**：❌ 完全缺失

**用户影响**：
- 用户无法创建/编辑大纲
- 用户无法从大纲导航到正文
- 无法实现大纲-正文双向同步

**需要的 UI**：
- 大纲编辑器（树状结构）
- 大纲-正文定位跳转
- 大纲节点拖拽排序

---

### 3.5 人物设定系统（Characters）

**后端能力**：
- 数据库表：`characters`（name, description, traits, relationships）
- IPC 接口：`character:create`, `character:update`, `character:delete`, `character:list`

**前端状态**：❌ 完全缺失（知识图谱有实体但不是人物卡片）

**用户影响**：
- 用户无法创建结构化人物设定
- 用户无法管理人物关系
- 用户无法在写作时快速查阅人物信息

**需要的 UI**：
- 人物卡片列表
- 人物卡片编辑器
- 人物关系图
- 写作时人物快速查阅

---

### 3.6 导出系统（Export）

**后端能力**：
- IPC 接口：`export:docx`, `export:markdown`, `export:pdf`

**前端状态**：❌ 完全缺失

**用户影响**：
- 用户无法将作品导出为其他格式
- 无法分享或投稿

**需要的 UI**：
- 导出菜单（File → Export）
- 格式选择对话框
- 导出进度/结果反馈

---

### 3.7 更新系统（Update）

**后端能力**：
- IPC 接口：`update:check`, `update:getState`, `update:download`, `update:install`
- IPC 接口：`update:skipVersion`, `update:clearSkipped`

**前端状态**：❌ 完全缺失

**用户影响**：
- 用户不知道有新版本
- 用户无法控制更新行为

**需要的 UI**：
- 更新提示通知
- 更新下载进度
- 更新设置（自动/手动）

---

### 3.8 上下文预览系统（Context Debug）

**后端能力**：
- IPC 接口：`context:writenow:rules:get`, `context:writenow:settings:list`
- IPC 接口：`context:writenow:conversations:list`
- Sprint 2.5 规范中定义了 Context Viewer

**前端状态**：❌ 完全缺失

**用户影响**：
- 用户不知道 AI 在用什么上下文
- 用户无法调试 AI 响应质量
- 用户无法控制上下文内容

**需要的 UI**：
- 上下文预览面板（分层展示）
- Token 使用统计
- 上下文裁剪证据

---

### 3.9 对话历史系统

**后端能力**：
- IPC 接口：`context:writenow:conversations:save`, `list`, `read`

**前端状态**：❌ 完全缺失

**用户影响**：
- 用户无法查看历史对话
- 用户无法复用之前的 AI 建议
- 刷新/重启后对话丢失

**需要的 UI**：
- 对话历史列表
- 对话详情查看
- 对话搜索

---

### 3.10 搜索系统

**后端能力**：
- 数据库表：`articles_fts`（FTS5 全文索引）
- IPC 接口：`search:fulltext`, `search:semantic`

**前端状态**：❌ 完全缺失

**用户影响**：
- 用户无法搜索自己的内容
- 用户无法快速定位文档

**需要的 UI**：
- 全局搜索入口（Cmd+P / Cmd+Shift+F）
- 搜索结果列表
- 结果预览与跳转

---

### 3.11 主题切换

**后端能力**：
- 已定义三套主题：Midnight, Warm Gray, Parchment
- CSS 变量已就绪

**前端状态**：❌ 无切换入口

**用户影响**：
- 用户不知道有其他主题
- 用户无法根据环境/偏好切换

**需要的 UI**：
- 主题选择器（Settings 或状态栏）
- 主题预览

---

### 3.12 技能管理

**后端能力**：
- 数据库表：`skills`（完整 SKILL 定义）
- IPC 接口：`skill:list`, `skill:read`, `skill:toggle`, `skill:write`

**前端状态**：🟠 部分（AI Panel 有技能列表，但无管理）

**用户影响**：
- 用户无法启用/禁用技能
- 用户无法查看技能详情
- 用户无法创建自定义技能

**需要的 UI**：
- 技能管理面板
- 技能详情查看
- 技能开关
- 自定义技能编辑器

---

## 4. Welcome 页面功能缺失（🔴 严重）

### 4.1 当前状态分析

Welcome 页面当前只有：
- 静态标题 "WriteNow" + "Creator IDE"
- 三个按钮：Open Folder / Open File / Settings
- 静态功能列表（不可点击）
- Footer 文字

### 4.2 缺失的核心功能

| 功能 | 重要性 | 当前状态 |
|------|-------|---------|
| 最近文件/项目列表 | 🔴 核心 | ❌ 缺失 |
| 继续上次工作入口 | 🔴 核心 | ❌ 缺失 |
| AI 功能引导/入口 | 🔴 核心 | ❌ 缺失 |
| 系统状态指示器 | 🟠 重要 | ❌ 缺失 |
| 快捷键提示 | 🟠 重要 | ❌ 缺失 |
| 主题切换入口 | 🟠 重要 | ❌ 缺失 |
| 新手引导/教程 | 🟠 重要 | ❌ 缺失 |
| 创作统计摘要 | 🟡 有用 | ❌ 缺失 |

### 4.3 功能列表问题

当前 "What's ready" 板块：

**问题 1**：信息冗余
- "Explorer + Workspace" - 用户左边已经能看到文件树

**问题 2**：不可交互
- 用户看到 "AI Assistant"，想试试，但点不了

**问题 3**：没有引导
- 用户不知道怎么打开 AI Assistant
- 用户不知道 Markdown Editor 怎么用

---

## 5. 交互反馈缺失（🟠 中等）

### 5.1 操作结果反馈

| 操作 | 预期反馈 | 当前状态 |
|------|---------|---------|
| 保存文件 | "已保存" 提示 | ❌ 无反馈 |
| AI 技能执行完成 | 成功提示 | ❌ 无反馈 |
| 应用 AI 建议 | 确认提示 | ❌ 无反馈 |
| 版本回滚 | 成功/失败提示 | ❌ 无反馈 |
| 导出完成 | 完成提示 + 文件路径 | N/A（功能缺失）|
| 错误发生 | 错误提示 + 可能的解决方案 | 🟠 有但简陋 |

### 5.2 状态指示器缺失

| 状态 | 需要展示 | 当前状态 |
|------|---------|---------|
| AI 服务连接状态 | 已连接/断开/连接中 | ❌ 缺失 |
| 自动保存状态 | 已保存/保存中/未保存 | ❌ 缺失 |
| 同步状态 | 已同步/同步中/冲突 | N/A（功能缺失）|
| 模型下载状态 | 进度条/完成 | ❌ 缺失 |

### 5.3 加载状态缺失

| 场景 | 需要展示 | 当前状态 |
|------|---------|---------|
| 打开大文件 | 加载进度 | ❌ 缺失 |
| AI 思考中 | 思考动画 | ✅ 有 |
| 搜索中 | 搜索动画 | N/A |
| 导出中 | 进度条 | N/A |

---

## 6. 功能发现性问题（🟠 中等）

### 6.1 隐藏的功能入口

| 功能 | 存在于 | 发现难度 |
|------|-------|---------|
| AI Panel | Cmd+K（无提示） | 🔴 极难 |
| 版本历史 | 命令（无菜单） | 🔴 极难 |
| 知识图谱 | View 菜单 | 🟠 中等 |
| 从选择创建实体 | Edit 菜单 | 🟠 中等 |

### 6.2 缺失的发现机制

- ❌ 命令面板（Cmd+Shift+P）
- ❌ 快捷键提示（Tooltip / Cheatsheet）
- ❌ 新功能引导（Onboarding）
- ❌ 上下文菜单（右键菜单）集成不完整

---

## 7. 数据库表前端展示情况

### 7.1 已展示（7/17）

| 表 | 展示组件 |
|---|---------|
| articles | TipTap 编辑器 |
| article_snapshots | 版本历史 Widget |
| projects | Theia Workspace |
| kg_entities | 知识图谱 Widget |
| kg_relations | 知识图谱 Widget |
| skills | AI Panel Widget |
| settings | 内部使用 |

### 7.2 未展示（10/17）

| 表 | 应有的展示 | 状态 |
|---|----------|------|
| outlines | 大纲视图 | ❌ 缺失 |
| user_memory | 记忆管理面板 | ❌ 缺失 |
| writing_stats | 统计面板 | ❌ 缺失 |
| characters | 人物卡片 | ❌ 缺失 |
| terminology | 术语表管理 | ❌ 缺失 |
| forbidden_words | 禁用词管理 | ❌ 缺失 |
| writing_constraints | 约束配置 | ❌ 缺失 |
| articles_fts | 搜索结果 | ❌ 缺失 |
| article_chunks | 内部使用 | N/A |
| entity_cards | 内部使用 | N/A |

---

## 8. Sprint 规范 vs 实际实现差异

### 8.1 Sprint 6 声称"已完成"但前端缺失

| 功能 | 规范状态 | 前端入口 |
|------|---------|---------|
| 创作统计面板 | 已完成 | ❌ Welcome 无入口 |
| 番茄钟 UI | 已完成 | ❌ 找不到入口 |
| 命令面板 | 暂停 | ❌ 无 |
| 记忆管理 | 暂停 | ❌ 无 |

### 8.2 Sprint 2 声称"已完成"但交互不完整

| 功能 | 规范状态 | 实际状态 |
|------|---------|---------|
| SKILL 触发入口 | 浮动工具栏/右键 | ❌ 只有 Cmd+K |
| 约束违规标注 | 编辑器内高亮 | ❌ 缺失 |
| 写作约束配置面板 | 已完成 | ❌ 无入口 |

---

## 9. 优先级建议

### 9.1 P0 - 阻塞用户基本使用

1. **Welcome 页面重做** - 加入最近文件、功能入口、快捷键提示
2. **AI Panel 入口可见化** - 在编辑器工具栏/Welcome 页面加入入口
3. **操作反馈系统** - 保存/执行/错误的视觉反馈

### 9.2 P1 - 影响用户核心体验

4. **搜索功能** - 全局搜索入口和结果展示
5. **导出功能** - File 菜单加入导出选项
6. **主题切换** - Settings 或状态栏加入主题选择器
7. **创作统计入口** - Welcome 页面或状态栏展示

### 9.3 P2 - 增强专业用户体验

8. **记忆管理面板** - 让用户控制 AI 学习
9. **约束配置面板** - 让用户设置写作规则
10. **大纲视图** - 结构化写作支持
11. **人物卡片** - 创意写作必备

### 9.4 P3 - 完善产品体验

12. **命令面板** - Cmd+Shift+P 快速访问所有功能
13. **上下文预览** - AI 调试工具
14. **对话历史** - AI 对话可追溯
15. **更新系统 UI** - 自动更新提示

---

## 10. 验收标准

### 10.1 Welcome 页面

- [ ] 显示最近打开的 5 个文件/项目
- [ ] "继续上次工作" 一键恢复
- [ ] AI 功能可点击入口
- [ ] 快捷键提示（至少 Cmd+K / Cmd+P）
- [ ] 主题切换入口
- [ ] 创作统计摘要（今日字数）

### 10.2 功能入口

- [ ] 所有已实现功能在菜单中可见
- [ ] 核心功能有键盘快捷键
- [ ] 快捷键在 UI 中可见

### 10.3 交互反馈

- [ ] 所有写操作有成功/失败反馈
- [ ] 所有长操作有加载指示
- [ ] 错误信息可读且可操作

### 10.4 数据展示

- [ ] 所有用户数据有查看入口
- [ ] 用户可管理自己的数据（CRUD）

---

## 11. 技术实现指引

### 11.1 添加新 Widget 流程

1. 创建 `*-widget.tsx` 文件
2. 在 `writenow-core-frontend-module.ts` 注册 Factory
3. 注册打开命令
4. 添加菜单入口
5. 添加样式文件

### 11.2 调用后端 IPC

```typescript
// 在组件中使用
const result = await this.frontendService.invokeResponse<ResponseType>('channel:name', args);
if (result.ok) {
    // 成功处理
} else {
    // 错误处理，显示 result.error.message
}
```

### 11.3 添加菜单入口

```typescript
// 在 frontend-module.ts 的 MenuContribution 中
menus.registerMenuAction(CommonMenus.FILE, {
    commandId: 'your.command.id',
    label: 'Your Label',
    order: 'z', // 排序
});
```

---

## 12. 相关文档

- 主规范：`openspec/specs/writenow-spec/spec.md`
- IPC 契约：`src/types/ipc-generated.ts`
- 数据库 Schema：`writenow-core/src/node/database/schema.sql`
- 设计系统 v2：`openspec/specs/wn-frontend-deep-remediation/spec.md`
++ b/writenow-theia/browser-app/gen-webpack.config.js
 * To customize webpack configuration change /home/leeky/work/WriteNow/writenow-theia/browser-app/webpack.config.js
++ b/writenow-theia/browser-app/gen-webpack.node.config.js
