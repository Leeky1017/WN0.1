# Design: Markdown Preview + Split Mode

## Preview Rendering Pipeline

目标：把“假预览（whitespace-pre-wrap）”升级为写作者可依赖的全保真预览。

建议管线：

- `react-markdown` + `remark-gfm`
- Code highlight: Shiki（支持多主题，与 app theme 联动）
- Math: KaTeX
- Mermaid: 渲染到 SVG（并做安全策略：禁用任意脚本）

## Scroll Sync

可选实现策略（择一并可证伪）：

1. **Mapping-based**：为 Markdown AST 节点添加位置标注（line/offset），在预览 DOM 中映射到对应元素。
2. **Heuristic-based**：以段落/标题为锚点，滚动时对齐最近锚点（容错更强，精度略低）。

必须满足：

- 不抖动
- 双向同步
- 大文档性能可控

## Split Mode Handle

- 手柄视觉：低调但可发现（hover 变亮、cursor 显示可拖拽）
- 手柄交互：拖拽 + 双击复位（可选）

## Performance

- 大文档渲染应避免每 keystroke 全量重新渲染预览：
  - debounce
  - memoized render
  - 增量更新（如可行）

