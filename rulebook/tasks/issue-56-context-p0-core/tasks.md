## 1. Implementation
- [ ] 1.1 定义 `src/types/context.ts`（Layer 1-4、chunks、budget stats、assemble result）
- [ ] 1.2 实现 `.writenow/` 路径约定 + Rules/Settings loaders + file watch IPC
- [ ] 1.3 实现 TokenBudgetManager（裁剪顺序/证据/确定性）
- [ ] 1.4 实现 ContextAssembler + PromptTemplate（稳定前缀 + 动态后缀）

## 2. Testing
- [ ] 2.1 Vitest：types/loader/budget/assembler 的最小到充分覆盖（边界+确定性）
- [ ] 2.2 Playwright E2E：通过 Electron + IPC 走真实 `.writenow/` 文件系统路径验证加载/刷新/裁剪/组装

## 3. Documentation
- [ ] 3.1 `openspec/_ops/task_runs/ISSUE-56.md` 记录关键命令与输出证据
