# Design：P1 体验 —— 编辑器微交互（打字手感）

## Why

写作工具的核心体验来自“连续输入”的手感。即使功能齐全，如果光标/选区/滚动/排版细节粗糙，也会造成显著差距（Plan 中对标 iA Writer / Ulysses）。

## 范围

聚焦 `writenow-frontend` 的 TipTap 编辑器体验（不替换编辑器，不引入双栈）：

- 光标与选区视觉质量
- 滚动与惯性/平滑策略
- 行高/段间距/字间距的用户可控（Settings）
- “配置可回退”：必须有开关（避免在低性能设备上造成退化）

## 设计原则

- **性能优先**：不得引入会显著增加 reflow/repaint 的持续动画；优先 CSS + GPU 合成层，必要时提供降级。
- **可回退**：任何微交互增强必须可禁用（Settings），并默认对性能敏感场景保持保守配置。
- **可量化**：至少提供一个可观测指标（例如输入延迟/编辑器帧率采样或关键 `performance.mark`）。

## 建议实现点（参考）

- 编辑器组件：`writenow-frontend/src/components/editor/TipTapEditor.tsx`
- 主题与 tokens：`writenow-frontend/src/styles/tokens/*`
- 动画/动效：`writenow-frontend/src/lib/motion/*`
- Settings：
  - `writenow-frontend/src/features/settings/sections/AppearanceSection.tsx`

## 交互清单（最小可用）

- 光标：
  - 提供更清晰的光标颜色/宽度策略（随主题 tokens）
  - 可选“平滑光标移动”（默认关闭或轻量）
- 选区：
  - 优化 selection 背景色与对比度（避免刺眼的灰块）
  - 可选淡入淡出（短时，低成本）
- 滚动：
  - 提供“平滑滚动”开关（CSS `scroll-behavior` 或编辑器容器策略）
- 排版：
  - 行高/段间距的配置项（立即生效 + 持久化）

## 验收与测试

- 主观：连续输入不“拖泥带水”，滚动不抖动
- 客观：
  - 不引入明显性能回归（维持现有 perf budgets）
  - 至少 1 条 E2E 验证 Settings 变更后样式生效（可通过计算样式或截图对比）

