# Proposal: issue-137-p1-basic-layout

## Why
当前 `writenow-theia` 仍然偏 Theia 默认 IDE 观感，缺少 WriteNow 品牌入口与稳定的布局骨架；这会误导用户心智，并让后续 AI Panel/知识图谱/人物卡片等 Widget 缺乏明确的挂载与演进策略。

## What Changes
- Branding：统一应用名称为 WriteNow（Browser/Electron 标题一致），并为 Electron 打包接入 `productName` 与应用图标资源（占位图标可替换）。
- Theme：配置默认暗色主题，并确保 Theia 的主题切换机制可用。
- Layout：建立稳定的三栏骨架（左：Explorer；中：Editor/Welcome；右：AI Panel 预留位），并裁剪 Activity Bar 至创作相关入口（Explorer / Search / Settings）。
- Startup：默认打开 Explorer + WriteNow Welcome（可通过命令再次打开）。
- Testing：新增 Phase 1 / Task 007 的可复现 UI smoke（真实 Theia UI + 真实 filesystem），覆盖标题/Activity Bar/Explorer/右侧面板/打开 `.md` 的最短链路。

## Impact
- Affected specs:
  - `openspec/specs/sprint-theia-migration/task_cards/p1/007-basic-layout.md`
  - `openspec/specs/writenow-spec/spec.md`
- Affected code:
  - `writenow-theia/browser-app/package.json`
  - `writenow-theia/electron-app/package.json`
  - `writenow-theia/writenow-core/src/browser/*`
  - `writenow-theia/resources/*`
  - `writenow-theia/scripts/*`
- Breaking change: NO
- User benefit: 启动即呈现 WriteNow 品牌与“创作 IDE”布局心智；后续面板类能力可直接接入既定插槽，无需反复重排基础骨架。
