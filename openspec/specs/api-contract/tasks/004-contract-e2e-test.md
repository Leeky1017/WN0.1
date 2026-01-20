# 任务 004: 契约自动化端到端测试

## 目标

- 用真实仓库源（`electron/ipc/**`）跑一遍 contract check 的端到端路径，避免“脚本存在但不可用”。

## 实现步骤

1. 新增测试：运行 `npm run contract:check` 并断言成功退出。
2. 测试必须基于真实代码与真实生成逻辑，禁止 mock/假数据。

## 新增/修改文件

- `src/**.test.ts`（Node 环境测试）

## 验收标准

- [ ] `npm test` 覆盖契约 check 的 E2E 路径

