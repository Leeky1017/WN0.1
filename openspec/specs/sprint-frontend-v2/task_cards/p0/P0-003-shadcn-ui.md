# P0-003: 集成 shadcn/ui 基础组件

## 元信息

| 字段 | 值 |
|------|-----|
| ID | P0-003 |
| Phase | 0 - 基础设施 |
| 优先级 | P0 |
| 状态 | Pending |
| 依赖 | P0-002 |

## 目标

集成 shadcn/ui 基础组件库，并调整样式以符合 Design Tokens。

## 任务清单

- [ ] 初始化 shadcn/ui（`npx shadcn@latest init`）
- [ ] 安装基础组件：Button、Input、Card、Dialog、Dropdown
- [ ] 安装扩展组件：Tabs、Tooltip、ScrollArea、Separator
- [ ] 调整组件样式以使用 Design Tokens
- [ ] 创建组件展示页面验证效果

## 验收标准

- [ ] 所有基础组件可正常渲染
- [ ] 组件样式符合 Cursor/Linear 风格
- [ ] 键盘导航正常工作

## 产出

- `src/components/ui/` 目录
- 基础组件文件（button.tsx、input.tsx 等）

## 技术细节

### 初始化命令

```bash
npx shadcn@latest init
# 选择 "Default" 样式
# 选择 "Zinc" 作为基础颜色（后续会覆盖为自定义 Tokens）
```

### 需要的组件列表

```bash
npx shadcn@latest add button input card dialog dropdown-menu
npx shadcn@latest add tabs tooltip scroll-area separator
npx shadcn@latest add context-menu popover select switch
```

### 样式调整示例

```tsx
// components/ui/button.tsx
// 将硬编码颜色替换为 Design Tokens
const buttonVariants = cva(
  'inline-flex items-center justify-center rounded-[var(--radius-md)] ...',
  {
    variants: {
      variant: {
        default: 'bg-[var(--accent)] text-white hover:bg-[var(--accent-hover)]',
        outline: 'border border-[var(--border-default)] bg-transparent ...',
      },
    },
  }
);
```
