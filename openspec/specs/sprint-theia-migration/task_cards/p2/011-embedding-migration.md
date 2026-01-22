# 011: Embedding Migration（服务 + ONNX 资产兼容性）

## Context

WriteNow 的 embedding 服务决定了语义搜索/RAG 的上限与稳定性。现有实现包含 worker 隔离、超时语义与离线资产策略，但 ONNX 资产对 CPU 特性可能有隐含假设；迁移到 Theia 后必须明确可用边界与降级策略。

## Requirements

- 迁移 Embedding service 到 Theia backend（worker/超时/取消/错误语义保持一致）。
- 验证 ONNX 资产在目标平台/CPU 上可运行（至少覆盖 Windows 10/11 作为首要平台）。
- 明确不兼容时的策略：替换资产、禁用语义搜索、或使用远程 embedding（必须可配置且可观测）。

## Acceptance Criteria

- [ ] Theia backend 可成功生成 embedding（对一段文本返回向量），并具备超时/取消的稳定语义（`TIMEOUT`/`CANCELED`）。
- [ ] ONNX 资产兼容性验证有明确证据（记录平台/CPU/结果），不通过时有明确错误信息与后续动作。
- [ ] Embedding 失败不会导致系统卡死：pending 状态清理，用户可重试或降级。

## Dependencies

- `009`
- `010`

## Estimated Effort

- M–L（2–4 天；取决于 ONNX 资产与 CPU 兼容性问题）

