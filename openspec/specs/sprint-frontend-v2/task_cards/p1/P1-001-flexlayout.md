# P1-001: 集成 FlexLayout 布局系统

## 元信息

| 字段 | 值 |
|------|-----|
| ID | P1-001 |
| Phase | 1 - 核心布局 |
| 优先级 | P0 |
| 状态 | Pending |
| 依赖 | P0-005 |

## 必读前置（执行前必须阅读）

- [ ] `design/03-layout-system.md` — 布局系统设计
- [ ] `design/02-tech-stack.md` — **技术选型（禁止替换 FlexLayout）**

## 目标

使用 FlexLayout 实现 IDE 级别的可拖拽布局系统。

## 任务清单

- [ ] 安装 FlexLayout 依赖
- [ ] 创建 `components/layout/AppLayout.tsx`
- [ ] 定义默认布局配置（四区布局）
- [ ] 实现面板工厂函数（根据组件类型渲染面板）
- [ ] 添加面板拖拽、调整大小功能
- [ ] 添加面板最大化、最小化功能
- [ ] 调整 FlexLayout 样式以符合 Design Tokens

## 验收标准

- [ ] 四区布局正确展示
- [ ] 面板可拖拽重排
- [ ] 面板边缘可调整大小
- [ ] 双击标题栏可最大化

## 产出

- `src/components/layout/AppLayout.tsx`
- `src/components/layout/layout-config.ts`
- `src/styles/flexlayout-overrides.css`

## 技术细节

参考 `design/03-layout-system.md` 中的布局配置。

### FlexLayout 样式覆盖

```css
/* flexlayout-overrides.css */
.flexlayout__layout {
  background: var(--bg-app);
}

.flexlayout__tab {
  background: var(--bg-panel);
  color: var(--text-primary);
}

.flexlayout__tabset_header {
  background: var(--bg-sidebar);
  border-bottom: 1px solid var(--border-subtle);
}

.flexlayout__splitter {
  background: var(--border-subtle);
}

.flexlayout__splitter:hover {
  background: var(--accent);
}
```
