# P0-005: 验证端到端通路

## 元信息

| 字段 | 值 |
|------|-----|
| ID | P0-005 |
| Phase | 0 - 基础设施 |
| 优先级 | P0 |
| 状态 | Pending |
| 依赖 | P0-004 |

## 必读前置（执行前必须阅读）

- [ ] `design/04-rpc-client.md` — RPC 客户端设计
- [ ] `design/02-tech-stack.md` — **技术选型（禁止替换）**

## 目标

验证新前端能够成功调用 Theia 后端接口，端到端通路打通。

## 任务清单

- [ ] 启动 Theia 后端服务
- [ ] 前端连接到后端 WebSocket
- [ ] 调用 `project:bootstrap` 接口
- [ ] 调用 `file:list` 接口获取文件列表
- [ ] 在页面上展示返回的数据
- [ ] 处理错误情况（后端未启动、连接超时等）

## 验收标准

- [ ] 前端能成功调用后端 API
- [ ] 返回数据正确展示在页面上
- [ ] 错误情况有明确提示

## 产出

- 端到端通路验证页面/组件
- 验证报告（记录到 RUN_LOG）

## 验证步骤

### 1. 启动后端

```bash
cd writenow-theia
yarn start:electron
# 或仅启动后端
yarn start:browser
```

### 2. 启动前端

```bash
cd writenow-frontend
npm run dev
```

### 3. 验证调用

在浏览器控制台或通过 UI 验证：

```typescript
// 测试 project:bootstrap
const result = await invoke('project:bootstrap', {});
console.log('Project:', result);

// 测试 file:list
const files = await invoke('file:list', { path: '/' });
console.log('Files:', files);
```

### 4. 验证清单

| 接口 | 预期结果 | 实际结果 |
|------|---------|---------|
| `project:bootstrap` | 返回项目信息 | |
| `file:list` | 返回文件列表 | |
| `file:read` | 返回文件内容 | |

## 失败处理

- 后端未启动 → 显示"正在连接..."状态
- 连接超时 → 显示重试按钮
- 接口错误 → 显示错误信息和错误码
