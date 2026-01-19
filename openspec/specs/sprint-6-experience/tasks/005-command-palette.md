# 任务 005: 命令面板（Command Palette, Ctrl+K）

## 目标

实现统一入口的命令面板：支持 `Ctrl/Cmd+K` 打开，模糊搜索命令并执行；覆盖核心动作（打开视图、切换专注模式、番茄钟控制、创作统计、记忆管理、AI 面板等），并具备可扩展的命令注册机制与快捷键冲突策略。

## 依赖

- 快捷键基础设施（全局监听与分发）
- （建议）任务 001/002/003：用于提供可被调用的命令目标（统计/番茄钟/记忆）

## 实现步骤

1. 命令数据结构与注册机制：
   - 定义 `Command`：`id` / `title` / `keywords` / `group` / `shortcut` / `run()`
   - 提供注册表（静态数组或可注入 registry），便于后续扩展新增命令
2. 命令面板 UI：
   - 使用现有 `src/components/ui/command.tsx`（cmdk + dialog）实现 `CommandPalette` 组件
   - 支持：输入过滤、上下键选择、回车执行、`Esc` 关闭、分组展示、快捷键提示
3. 全局快捷键：
   - 在应用层监听 `Ctrl/Cmd+K` 打开/关闭
   - 冲突处理：当焦点在输入框/编辑器时仍可触发，但需避免与编辑器快捷键冲突（策略需明确）
4. 首批内置命令（建议最小集合）：
   - 视图：打开文件列表/大纲/统计/设置（以及新增的记忆视图）
   - 写作：切换专注模式、切换编辑/预览（若已有）
   - 番茄钟：开始/暂停/重置
   - AI：打开/关闭 AI 面板、触发常用 SKILL（若可用）
5. 体验增强（可选）：
   - 最近执行命令（recent）
   - 命令别名（keywords）与中文/英文双语关键词

## 新增/修改文件

- `src/components/CommandPalette.tsx`（或 `src/components/CommandPalette/index.tsx`）- 命令面板组件（新增）
- `src/lib/commands/registry.ts` - 命令注册表与类型定义（新增）
- `src/App.tsx` - 全局快捷键与打开/关闭状态（修改）
- （可选）`src/stores/*` - 为命令提供可调用的 actions（修改）

## 验收标准

- [ ] `Ctrl+K`（macOS `Cmd+K`）可打开命令面板，`Esc` 可关闭
- [ ] 可通过键盘完成搜索、选择与执行命令
- [ ] 至少支持打开统计视图、切换专注模式、番茄钟开始/暂停等核心命令
- [ ] 命令注册机制可扩展：新增命令无需改动面板核心渲染逻辑

## 参考

- Sprint 6 规范：`openspec/specs/sprint-6-experience/spec.md`
- 核心规范：`openspec/specs/writenow-spec/spec.md` 第 386-402 行（快捷键：命令面板 `Ctrl/Cmd+K`、取消 `Esc`）
