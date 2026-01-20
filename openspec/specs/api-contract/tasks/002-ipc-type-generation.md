# 任务 002: 生成渲染进程 IPC 类型（ipc-generated.ts）

## 目标

- 通过脚本从主进程契约声明生成 `src/types/ipc-generated.ts`，作为渲染进程 IPC 类型唯一来源。

## 实现步骤

1. 新增 `scripts/ipc-contract-sync.js`：
   - 支持 `generate` 与 `check` 两种模式
   - 输出 deterministic（稳定排序、稳定 header）
2. 将 `src/types/ipc.ts` 调整为 re-export `src/types/ipc-generated.ts`（保持现有 import 路径不变）。

## 新增/修改文件

- `scripts/ipc-contract-sync.js`
- `src/types/ipc-generated.ts`
- `src/types/ipc.ts`

## 验收标准

- [ ] `npm run contract:generate` 可一键生成/更新 `src/types/ipc-generated.ts`
- [ ] 渲染进程编译通过，且不需要手工维护 IPC 类型

