# Delta Spec: sprint-open-source-opt (Issue #293)

本任务实现并验收 `openspec/specs/sprint-open-source-opt/spec.md` 的以下增量：

- 本地 LLM Tab 续写（L101–119）

## Requirements

### R1. 未启用/未就绪时必须可判定且无噪声异常

- 当用户未启用本地续写或本地模型不存在时：
  - IPC MUST 返回可判定结果（`IpcResponse<T>`，`ok: false` + 稳定错误码）
  - UI/调用侧 MUST 能显示“未启用/未安装模型”的可理解状态
  - MUST NOT 泄漏主进程异常堆栈到渲染进程；不得产生噪声级日志

### R2. 停顿触发 + 取消语义正确

- 当用户停止输入达到阈值（默认 800ms）时，系统 SHOULD 触发本地 completion 生成短续写。
- 用户继续输入 / 切换文档 / 光标移动 MUST 取消正在进行的生成并清理 ghost suggestion。
- 超时 MUST 返回 `TIMEOUT`，取消 MUST 返回 `CANCELED`，并保证 pending 状态被清理（不会卡死在 loading）。

