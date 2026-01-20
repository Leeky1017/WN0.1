# Design: ContextViewer (Prompt Inspection UI)

## Goals

- 用户可查看“本次发送的完整上下文”，并理解每段内容来自哪里。
- 分层展示 + Token 统计：Rules/Settings/Retrieved/Immediate 的 used/budget 直观可见。
- 裁剪可解释：展示删了哪些 chunk、为什么删、节省了多少 token。

## UI structure (suggested)

入口：
- AI 面板：生成前/生成中/生成后均可展开“查看上下文”

展示内容：
- Tabs 或分区：
  - Overview：total used/limit，per-layer used/budget，裁剪摘要
  - Prompt：渲染后的 systemPrompt + userContent（可复制）
  - Chunks：分层列表（source/token/priority/content，可折叠）

## Safety & redaction

必须支持脱敏规则（最小可用）：
- API Key/Token：永不出现在 viewer（强制替换为 `***REDACTED***`）
- 文件路径：允许展示相对路径；用户目录绝对路径可按需脱敏

## Evidence requirements

ContextViewer 必须能展示：
- 每个 chunk 的 `source` 与 tokenCount
- 预算裁剪证据（removed/compressed）
- 若失败/拒绝发送：明确错误 + 下一步建议（例如缩小选区/切换模型/提高预算）

