# Design：信息架构与面板入口（ActivityBar / SidebarPanel）

## Why

差距补全首先是“可发现性”问题：能力存在但用户找不到/进不去。Write Mode 作为 SSOT 主路径（见相关 Sprint 规范）必须提供稳定、统一的入口与信息架构。

## Proposed Sidebar Views（建议）

现有侧边栏视图：`files/search/outline/history/memory/skills/projects/settings`。

本规范新增（建议命名，最终以实现为准但必须稳定）：

- `knowledgeGraph`：知识图谱
- `characters`：人物
- `constraints`：约束
- `context`：上下文调试/设定文件/规则片段
- `conversations`：对话记录

> 命名要求：作为状态机 key 与测试选择器的一部分，必须稳定且可读；不得为展示文案服务（文案在 i18n）。

## Integration Points（代码落点）

新增视图通常涉及以下修改点（必须统一更新，避免“半接入”）：

- `writenow-frontend/src/components/layout/activity-bar.tsx`
  - 扩展 `SidebarTab` union
  - 增加 `NAV_ITEMS` 中的 icon + labelKey
- `writenow-frontend/src/stores/layoutStore.ts`
  - 扩展 `SidebarView` union + `isSidebarView` 校验
  - 保持持久化 key 的向后兼容（新增字段不得破坏读取）
- `writenow-frontend/src/components/layout/AppShell.tsx`
  - 在 `SidebarPanel` 内新增对应 view 的渲染分支
- `writenow-frontend/src/locales/{zh-CN,en}.json`
  - `activityBar.<id>` 与 `sidebar.title.<id>`

## Testability（稳定选择器）

必须为 E2E 提供稳定选择器：

- ActivityBar：`data-testid="activity-tab-<id>"`
- Sidebar 面板根：复用现有 `data-testid="layout-sidebar"`
- 每个新面板：提供 `data-testid="<id>-panel"`（或等价稳定选择器）

## Focus Mode & Mobile

- Focus Mode 下侧边栏会折叠，但能力不得“不可用/不可发现”：
  - 若允许：命令面板（Cmd/Ctrl+K）应能打开对应面板
  - 若不允许：必须在 UI 给出明确提示（而不是点击无反应）
- Mobile 下通过 overlay 展示侧边栏：新增面板必须在 overlay 分支同样可访问（见 `AppShell.tsx` 的 MobileOverlay 部分）

## Failure Semantics（失败语义）

所有面板的数据请求必须使用 `invoke()`（Envelope + 错误码），并在 UI 中显式处理：

- `INVALID_ARGUMENT`：提示用户修正输入（例如非法阈值/空字段）
- `MODEL_NOT_READY`：给出“去下载/初始化/重建索引”的操作入口
- `TIMEOUT` / `CANCELED`：区分“超时”和“取消”，并清理 pending 状态
- `DB_ERROR` / `IO_ERROR` / `INTERNAL`：展示可读信息 + 可重试入口

> 禁止 silent failure：不得只 `console.error` 或吞错（见 repo-root `AGENTS.md`）。

