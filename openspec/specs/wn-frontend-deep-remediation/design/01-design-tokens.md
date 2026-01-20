# Design: Design Tokens SSOT (Primitive → Semantic → Component)

## Why

目前样式存在两类风险：

1. **碎片化**：既有 Tailwind 硬编码，也有零散 CSS class，且缺少“可追溯来源”。
2. **不可扩展**：主题（深蓝/羊皮纸）需要大规模手工替换，回归风险不可控。

## Token Layers

### 1) Primitive tokens（不可直接在业务组件消费）

目的：表达“原材料”，为主题映射与语义复用提供稳定底座。

建议命名：

- `--wn-color-neutral-0..1000`
- `--wn-color-accent-0..1000`
- `--wn-radius-1..n`
- `--wn-shadow-1..n`
- `--wn-space-1..n`

### 2) Semantic tokens（业务组件与 WN 组件的主要消费层）

目的：表达“含义”，而非具体颜色/数值。

建议命名：

- Surface：`--wn-bg-canvas`、`--wn-bg-surface-1..6`、`--wn-bg-hover`、`--wn-bg-active`
- Text：`--wn-text-primary/secondary/tertiary/disabled`
- Border：`--wn-border-default/subtle`
- Focus：`--wn-focus-ring`
- Shadow：`--wn-shadow-float/elevated`

### 3) Component tokens（仅在 WN 组件封装层使用）

目的：允许组件级细微调优但保持可追溯。

示例：

- `--wn-panel-bg` → 引用 `--wn-bg-surface-2`
- `--wn-button-primary-bg` → 引用 `--wn-color-accent-600`

## Theme Mapping Strategy

- `:root[data-theme="dark"]` 与 `:root[data-theme="light"]` 必须提供同构语义 token 映射。
- “亮灰色乱入块”属于语义 token 缺失或误用的信号，必须通过 token audit + 视觉回归定位。

## Migration Strategy (No Big Bang)

1. 新增 `tokens` SSOT 文件（CSS/TS 二选一，避免双写）。
2. 在现有 `src/styles/theme.css` 中建立“兼容映射层”（旧变量 → 新语义 token），逐步迁移组件消费点。
3. 引入 CI guard：禁止新增硬编码颜色；旧代码以“债务清单”分批消化。

## Enforcement

- **Hard-coded color ban**：检测 `#RGB` / `rgb()` / `hsl()` / `oklch()` 等颜色字面量进入 JSX/CSS。
- **Unknown `wn-*` ban**：检测未在 tokens/样式规范注册的 `wn-*` class 出现。

