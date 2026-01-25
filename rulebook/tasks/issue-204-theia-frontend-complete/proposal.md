# Proposal: WriteNow Theia 前端功能补齐与布局优化

## 变更摘要

补齐 Theia 版缺失的后端服务和 UI 入口，优化布局对标 Cursor IDE。

## 影响范围

- `writenow-theia/writenow-core/src/browser/` - 布局和 UI 组件
- `writenow-theia/writenow-core/src/node/` - 后端服务补齐
- 样式使用 CSS 变量 `--wn-*`

## 技术方案

### Phase 1: 布局调整
1. 修改 `writenow-layout-contribution.ts` 移除右侧 Outline
2. 在 AI Panel 添加收起/展开按钮
3. 将 Outline 注册到左侧 Activity Bar

### Phase 2: 后端服务
1. 在 `node/services/` 实现 stats-service.ts
2. 在 `node/services/` 实现 snapshot-service.ts
3. 在 `node/services/` 实现 export-service.ts

### Phase 3: UI 入口
1. 增强 `editor-toolbar.tsx` 添加模式切换
2. 增强 `ai-panel-widget.tsx` 添加斜杠命令
