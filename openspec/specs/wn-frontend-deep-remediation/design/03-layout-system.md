# Design: Layout System (Resizable Panels + Continuity)

## Target Layout

窗口布局为四栏贯穿结构：

`ActivityBar | Sidebar | MainContent | AIPanel`

关键点：

- 侧边容器从顶部贯穿到底部，避免顶部横条切断（“三明治陷阱”）。
- 顶部空间最小化：把“内容”作为一等公民。

## Resizable Strategy

- Sidebar 与 AIPanel：用户可拖拽调宽度
- MainContent：占据剩余空间
- 小屏策略：可折叠/自动隐藏某些面板（不改变功能，只改变呈现）

## State Persistence

布局状态建议结构：

- `sidebarWidthPx`
- `aiPanelWidthPx`
- `isSidebarCollapsed`
- `isAiPanelCollapsed`
- `lastActivePane`（用于键盘切换/恢复）

持久化策略：

- **短期**：localStorage（快速闭环）
- **中期**：写入 SQLite user_preferences（跨设备/未来云同步预留）

## Accessibility

- 拖拽手柄必须可键盘操作（左右箭头微调），并暴露可访问性 label。

