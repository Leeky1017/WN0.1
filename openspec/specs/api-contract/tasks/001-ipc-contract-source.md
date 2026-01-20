# 任务 001: 定义 IPC 契约来源（主进程 SSOT）

## 目标

- 明确“IPC 契约类型 SSOT”落在主进程代码侧，并形成可供脚本消费的契约声明。
- 约束 invoke 通道集合：必须与 `electron/ipc/*.cjs` 的实际 `handleInvoke()` 调用一致。

## 实现步骤

1. 设计主进程契约声明结构（每个通道：请求类型名、响应类型名、支持类型定义）。
2. 为现有 `electron/ipc/*.cjs` 覆盖全部 invoke 通道：
   - `file:*`、`ai:*`、`search:*`、`embedding:*`、`rag:*`、`version:*`、`update:*`、`export:*`、`clipboard:*`
3. 为每个通道补齐请求/响应类型（与实际 handler 行为一致；必要时修正实现与类型的偏差）。

## 新增/修改文件

- `electron/ipc/**`（新增契约声明文件或在现有 handler 旁增加 contract fragments）

## 验收标准

- [ ] 主进程侧存在可聚合的 IPC 契约声明（脚本可读取）
- [ ] 契约声明覆盖所有 `handleInvoke()` 的通道，无遗漏/无多余

