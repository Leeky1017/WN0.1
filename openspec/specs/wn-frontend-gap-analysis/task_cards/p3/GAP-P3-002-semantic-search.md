# GAP-P3-002: 语义搜索 UI

Status: pending

## Goal

创建语义搜索界面，暴露后端 embedding 和 RAG 能力。

## Dependencies

- 无

## Expected File Changes

| 操作 | 文件路径 |
|------|---------|
| Add | `writenow-core/src/browser/semantic-search-widget.tsx` |
| Add | `writenow-core/src/browser/style/semantic-search.css` |
| Update | `writenow-core/src/browser/writenow-core-frontend-module.ts` |
| Update | `writenow-core/src/browser/writenow-core-contribution.ts` |

## Acceptance Criteria

- [ ] Cmd+Shift+P 打开语义搜索
- [ ] 可输入自然语言查询
- [ ] 显示相关文档片段列表
- [ ] 显示相似度分数
- [ ] 点击结果跳转到对应位置
- [ ] 支持按文档过滤

## Tests

- [ ] E2E：语义搜索返回相关结果
- [ ] E2E：点击结果跳转到文档
