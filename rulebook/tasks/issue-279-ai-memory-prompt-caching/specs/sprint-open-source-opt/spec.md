# Delta Spec: sprint-open-source-opt (Issue #279)

本任务卡实现并验收 `openspec/specs/sprint-open-source-opt/spec.md` 的以下增量：

- Prompt Caching（L59–77）

## Requirements

### R1. Anthropic MUST 显式启用 ephemeral prompt caching

- Anthropic Messages API 的 `system` MUST 使用 system blocks 结构。
- 稳定、可复用的 system block MUST 设置 `cache_control: { type: 'ephemeral' }`。
- 动态/敏感内容 MUST NOT 放入可缓存 block。

### R2. 缓存不可用时仍可用且可诊断

- provider 不支持/拒绝缓存时 MUST 继续完成请求（回退为非缓存路径）。
- 日志/指标 MUST 不落盘完整 prompt；仅记录 hash/耗时/节省 token（若可得）。

