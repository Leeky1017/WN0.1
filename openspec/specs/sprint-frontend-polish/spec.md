# Sprint Frontend Polish：前端优化（待排期）

## Purpose

在商业化基石（AI Memory + Open Source Optimization）完成后，对 WriteNow 前端进行全面优化，涵盖代码质量、构建优化、测试覆盖、样式/UI/UX 等维度。

本规范是 `openspec/specs/writenow-spec/spec.md` 在前端优化范围内的可执行增量。

**状态**：待排期（Pending）
**调研完成时间**：2026-01-27
**Plan 文件**：`.cursor/plans/前端优化策略建议_8d3c4032.plan.md`

## Requirements

### Requirement: 前端代码 MUST 符合工程质量标准

前端代码 MUST 无硬编码值、无未使用依赖、日志统一、组件拆分合理。

#### Scenario: 无硬编码 WebSocket URL
- **WHEN** 前端需要连接 RPC 服务
- **THEN** URL MUST 从环境变量 `VITE_RPC_URL` 读取，不得硬编码

#### Scenario: 无未使用依赖
- **WHEN** 检查 `package.json`
- **THEN** 所有依赖 MUST 有实际使用，未使用的 MUST 移除

#### Scenario: 日志统一
- **WHEN** 需要输出日志
- **THEN** MUST 使用统一的日志工具，不得直接使用 `console.log/warn/error`

---

### Requirement: 编辑器样式 MUST 完备

TipTap 编辑器的内容样式 MUST 完备，包括标题、列表、引用、代码等。

#### Scenario: TipTap 内容样式可见
- **WHEN** 用户在编辑器中输入标题、列表、引用、代码等
- **THEN** 内容 MUST 有明确的视觉样式区分

#### Scenario: 光标和选区样式
- **WHEN** 用户在编辑器中选择文本
- **THEN** 光标和选区 MUST 使用设计系统定义的颜色

---

### Requirement: 核心交互组件 MUST 实现

命令面板和设置面板 MUST 完整实现，不得为占位文本。

#### Scenario: 命令面板可用
- **WHEN** 用户按 Cmd+K
- **THEN** MUST 显示完整可用的命令面板（cmdk）

#### Scenario: 设置面板可用
- **WHEN** 用户点击设置
- **THEN** MUST 显示完整可用的设置界面（主题/字体/偏好）

---

### Requirement: 布局 MUST 支持响应式适配

布局 MUST 支持响应式适配，在不同屏幕尺寸下提供合理的用户体验。

#### Scenario: 小屏幕适配
- **WHEN** 窗口宽度小于 768px
- **THEN** 侧边栏 MUST 全屏覆盖模式或折叠

#### Scenario: 中等屏幕适配
- **WHEN** 窗口宽度在 768px-1280px
- **THEN** AI 面板 MUST 默认隐藏

---

## 执行计划

### Phase 1：代码质量（3-5 天）

- 统一日志系统
- 移除未使用依赖
- 拆分大组件
- 移除硬编码演示数据

### Phase 2：构建优化（2-3 天）

- Vite 配置优化
- 添加 Bundle 分析工具
- 添加 Prettier 配置

### Phase 3：测试覆盖（5-7 天）

- 关键 hooks 单元测试
- Zustand stores 状态转换测试
- 核心用户流程 E2E 测试

### Phase 4：编辑器样式（2-3 天）

- 添加 TipTap 内容样式
- 光标和选区样式定制
- AI Diff 视觉呈现

### Phase 5：核心组件补全（3-5 天）

- 实现命令面板 UI
- 实现设置面板
- 浮动工具栏优化

### Phase 6：响应式与动效（3-5 天）

- 响应式断点适配
- 统一 framer-motion 动画预设
- 列表 stagger 动画

### Phase 7：设计系统完善（2-3 天）[可选]

- 明确 midnight vs dark 差异
- 实现 high-contrast 主题

---

## References

- Plan 文件：`.cursor/plans/前端优化策略建议_8d3c4032.plan.md`
- 前端代码：`writenow-frontend/`
- 设计规范：`docs/style-guard.md`
