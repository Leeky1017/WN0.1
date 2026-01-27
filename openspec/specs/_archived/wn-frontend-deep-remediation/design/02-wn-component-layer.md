# Design: `src/components/wn/` Component Layer

## Goals

- 把 shadcn/ui 的“基础可用”提升为 WriteNow 的“统一设计语言”。
- 让业务开发只关注信息架构与交互，而不是重复处理圆角/阴影/hover/focus/密度。

## Layering

- **shadcn/ui**：底层 primitives（Dialog/Tooltip/Popover/Resizable/…）
- **WN components (`Wn*`)**：封装统一外观/交互/可访问性/密度
- **Features / Screens**：组合 WN components，实现业务

## Required Components (Initial Set)

- Layout: `WnPanel`, `WnResizable`, `WnDivider`
- Inputs: `WnButton`, `WnIconButton`, `WnInput`, `WnTextarea`, `WnSelect`
- Overlay: `WnDialog`, `WnPopover`, `WnTooltip`, `WnContextMenu`
- List: `WnList`, `WnListItem`

## API Conventions

- Controlled state: `open` + `onOpenChange`
- Disabled: `isDisabled`（避免 `disabled`/`disabled` 混用）
- Variants: `variant` / `size` / `density`
- Events: `onClick`/`onValueChange` 等保持一致

## Migration Strategy

1. 先迁移“高复用、低风险”组件（Button/Input/Panel）。
2. 再迁移“高影响布局”组件（Sidebar/AIPanel/Main 布局）。
3. 以“替换式迁移”为主：保留原行为，仅改变实现与样式来源（token 化）。

## Documentation & Examples

- 每个 `Wn*` 组件必须有：
  - props 类型定义（严格 TypeScript）
  - 最小用例示例（Markdown 或同目录 demo）
  - 可被 E2E 覆盖的可访问性语义（role/label）

