## 1. Implementation
- [x] 1.1 定义会话落盘结构与 `index.json` schema（原子写入/损坏恢复）
- [x] 1.2 实现 IPC：会话写入/读取/列表/分析更新（全部返回 `IpcResponse<T>`）
- [x] 1.3 会话结束触发异步摘要生成并写回索引（含 AI 不可用 fallback + quality 标记）
- [x] 1.4 “像上次那样”回溯解析：从索引提取偏好信号并注入 Retrieved 层

## 2. Testing
- [x] 2.1 Unit：conversation transcript + summary parse + previous-reference intent
- [x] 2.2 Playwright E2E：会话保存→重启后可读取 index 与会话文件
- [x] 2.3 Playwright E2E：摘要 fallback（L2 不可用）→ quality=heuristic 写回 index
- [x] 2.4 Playwright E2E：“像上次那样”→ ContextAssembler 注入历史摘要 chunk

## 3. Documentation
- [ ] 3.1 回填对应 task card 的验收勾选与完成元数据（Issue/PR/RUN_LOG）
