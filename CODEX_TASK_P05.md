# Codex Phase 0.5 任务: 基础设施完善

---

## 任务背景

Phase 0 已完成规范层面的准备 (IPC 契约、代码规范、测试规范、类型定义)。
Phase 0.5 的目标是完成所有 Sprint 共用的**代码级基础设施**, 确保后续 Sprint 1-7 可以直接开始功能实现, 不再需要边做边补基础设施。

---

## 必读文档

- `AGENTS.md` - 宪法级约束
- `openspec/specs/api-contract/spec.md` - IPC 契约规范
- `openspec/specs/writenow-spec/spec.md` - 核心规范
- `docs/code-standards.md` - 代码规范
- `docs/testing-standards.md` - 测试规范
- `src/types/` - 所有类型定义

---

## 宪法级约束 (必须遵守)

1. 代码必须同时"正确"和"好"
2. 禁止 any 类型
3. 全项目风格统一
4. 所有模块必须有测试
5. 边界条件必测

---

## 任务清单

### 任务 1: Window API 类型声明

创建文件: `src/types/window.d.ts`

内容:
```typescript
import type { IpcChannel, IpcInvokePayloadMap, IpcInvokeResponseMap } from './ipc';

declare global {
  interface Window {
    writenow: {
      invoke<T extends IpcChannel>(
        channel: T,
        payload: IpcInvokePayloadMap[T]
      ): Promise<IpcInvokeResponseMap[T]>;
      
      // 用于流式响应的事件监听
      on(event: string, callback: (...args: unknown[]) => void): void;
      off(event: string, callback: (...args: unknown[]) => void): void;
    };
  }
}

export {};
```

更新 `tsconfig.json` 确保包含此文件。

---

### 任务 2: 更新规范 - 路径与存储

更新文件: `docs/code-standards.md`

新增章节 **3.7 路径与存储规范**:

1. 应用数据根目录: `app.getPath('userData')`
   - Windows: `%APPDATA%/WriteNow/`
   - macOS: `~/Library/Application Support/WriteNow/`
   - Linux: `~/.config/WriteNow/`

2. 子目录结构:
   - `documents/` - 用户文档 (.md 文件)
   - `data/` - 数据库文件
   - `snapshots/` - 崩溃恢复快照
   - `logs/` - 日志文件
   - `models/` - 本地 AI 模型 (如 embedding)
   - `cache/` - 临时缓存

3. 数据库文件: `data/writenow.db`

4. 配置文件: 使用 settings 表, 不使用独立 JSON

5. API Key 存储: 使用 Electron safeStorage API 加密存储

---

### 任务 3: 更新规范 - 日志

更新文件: `docs/code-standards.md`

新增章节 **3.8 日志规范**:

1. 日志级别: `debug | info | warn | error`

2. 日志格式: `[ISO时间戳] [级别] [模块名] 消息 {可选JSON细节}`

3. 主进程日志:
   - 文件: `logs/main.log`
   - 轮转: 单文件 10MB, 保留 5 个

4. 渲染进程:
   - 开发模式: console
   - 生产模式: 关键错误通过 IPC 上报

5. 日志模块接口:
```typescript
interface Logger {
  debug(module: string, message: string, details?: object): void;
  info(module: string, message: string, details?: object): void;
  warn(module: string, message: string, details?: object): void;
  error(module: string, message: string, details?: object): void;
}
```

---

### 任务 4: 数据库初始化模块

创建文件: `electron/database/init.cjs`

功能要求:

1. 导出 `initDatabase(): Database` 函数

2. 创建数据目录 (如不存在)

3. 创建/打开 SQLite 数据库

4. 执行 Schema 创建 (所有表, 参考核心规范第 753-837 行):
   - articles
   - articles_fts (FTS5 虚拟表)
   - article_snapshots
   - projects
   - characters
   - skills
   - user_memory
   - writing_stats
   - settings

5. 版本管理: 在 settings 表存储 schema_version

6. 返回 better-sqlite3 实例

创建文件: `electron/database/schema.sql`

存放完整建表 SQL, 便于审计和版本控制。

---

### 任务 5: 日志模块

创建文件: `electron/lib/logger.cjs`

功能要求:

1. 实现 Logger 接口

2. 写入文件: `logs/main.log`

3. 日志轮转: 10MB 单文件, 保留 5 个

4. 开发模式同时输出到控制台

5. 格式: `[2024-01-20T10:30:00.000Z] [INFO] [database] 消息 {"key":"value"}`

创建文件: `src/lib/logger.ts`

渲染进程日志工具:
- 开发模式: console
- 生产模式: 调用 IPC 上报到主进程

---

### 任务 6: 配置管理模块

创建文件: `electron/lib/config.cjs`

功能要求:

1. 读取/写入 settings 表

2. 敏感配置 (API Key) 使用 safeStorage 加密

3. 导出接口:
```javascript
module.exports = {
  get(key),           // 获取配置值
  set(key, value),    // 设置配置值
  getSecure(key),     // 获取加密配置
  setSecure(key, value), // 设置加密配置
  getAll(),           // 获取所有配置
}
```

4. 预定义配置项:
   - `theme`: 'dark' | 'light' | 'system'
   - `language`: 'zh-CN' | 'en'
   - `defaultEditMode`: 'markdown' | 'richtext'
   - `autoSaveDelay`: number (ms)
   - `ai.provider`: 'openai' | 'anthropic' | 'custom'
   - `ai.baseUrl`: string
   - `ai.apiKey`: string (加密)
   - `ai.model`: string

---

### 任务 7: IPC 客户端封装

创建文件: `src/lib/ipc.ts`

功能要求:

1. 封装 `window.writenow.invoke`

2. 类型安全的调用接口:
```typescript
export async function invoke<T extends IpcChannel>(
  channel: T,
  payload: IpcInvokePayloadMap[T]
): Promise<IpcInvokeDataMap[T]> {
  const response = await window.writenow.invoke(channel, payload);
  if (!response.ok) {
    throw new IpcError(response.error);
  }
  return response.data;
}
```

3. 导出 IpcError 类:
```typescript
export class IpcError extends Error {
  code: IpcErrorCode;
  details?: unknown;
  retryable?: boolean;
  
  constructor(error: IpcError) {
    super(error.message);
    this.code = error.code;
    this.details = error.details;
    this.retryable = error.retryable;
  }
}
```

4. 导出便捷方法 (可选, 按需):
```typescript
export const fileOps = {
  list: () => invoke('file:list', {}),
  read: (path: string) => invoke('file:read', { path }),
  write: (path: string, content: string) => invoke('file:write', { path, content }),
  create: (name: string) => invoke('file:create', { name }),
  delete: (path: string) => invoke('file:delete', { path }),
};
```

---

### 任务 8: 错误处理工具

创建文件: `src/lib/errors.ts`

功能要求:

1. 错误码到用户友好消息的映射:
```typescript
export function toUserMessage(code: IpcErrorCode, fallback?: string): string {
  const messages: Record<IpcErrorCode, string> = {
    INVALID_ARGUMENT: '参数错误',
    NOT_FOUND: '未找到',
    ALREADY_EXISTS: '已存在',
    // ... 其他映射
  };
  return messages[code] || fallback || '未知错误';
}
```

2. 错误日志格式化:
```typescript
export function toLogMessage(error: IpcError): string {
  return `[${error.code}] ${error.message}${error.details ? ' ' + JSON.stringify(error.details) : ''}`;
}
```

---

### 任务 9: 测试基础设施

创建/更新以下文件:

1. 安装测试依赖:
   - vitest (单元/集成测试)
   - @playwright/test (E2E 测试)
   - @testing-library/react (组件测试)

2. 创建 `vitest.config.ts`:
```typescript
import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    globals: true,
    environment: 'jsdom',
    include: ['src/**/*.test.ts', 'src/**/*.test.tsx'],
    coverage: {
      provider: 'v8',
      reporter: ['text', 'json', 'html'],
    },
  },
});
```

3. 创建 `playwright.config.ts`:
```typescript
import { defineConfig } from '@playwright/test';

export default defineConfig({
  testDir: './tests/e2e',
  use: {
    trace: 'on-first-retry',
  },
});
```

4. 更新 `package.json` scripts:
```json
{
  "scripts": {
    "test": "vitest",
    "test:e2e": "playwright test",
    "test:coverage": "vitest --coverage"
  }
}
```

5. 创建示例测试确保配置正确:
   - `src/lib/errors.test.ts`
   - `tests/e2e/app-launch.spec.ts`

---

### 任务 10: Preload 脚本更新

更新文件: `electron/preload.cjs`

功能要求:

1. 暴露 `window.writenow` 对象:
```javascript
const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('writenow', {
  invoke: (channel, payload) => ipcRenderer.invoke(channel, payload),
  on: (event, callback) => ipcRenderer.on(event, callback),
  off: (event, callback) => ipcRenderer.removeListener(event, callback),
});
```

2. 限制暴露的通道 (安全考虑):
   - 只允许 api-contract 定义的通道
   - 拒绝其他通道调用

---

### 任务 11: 主进程入口更新

更新文件: `electron/main.cjs`

功能要求:

1. 应用启动时初始化:
   - 日志模块
   - 数据库
   - 配置模块
   - 创建必要目录

2. 注册所有 IPC 处理器:
   - 导入 ipc/*.cjs 并注册
   - 统一错误处理 (包装为 Envelope)

3. 窗口创建时加载 preload

4. 应用退出时清理:
   - 关闭数据库连接
   - 刷新日志

---

## 输出清单

完成后应存在以下文件:

```
src/types/window.d.ts              (新建)
docs/code-standards.md             (更新: 3.7, 3.8 节)
electron/database/init.cjs         (新建)
electron/database/schema.sql       (新建)
electron/lib/logger.cjs            (新建)
electron/lib/config.cjs            (新建)
electron/preload.cjs               (更新)
electron/main.cjs                  (更新)
src/lib/ipc.ts                     (新建)
src/lib/logger.ts                  (新建)
src/lib/errors.ts                  (新建)
src/lib/errors.test.ts             (新建)
vitest.config.ts                   (新建)
playwright.config.ts               (新建)
tests/e2e/app-launch.spec.ts       (新建)
package.json                       (更新: 测试依赖和脚本)
```

---

## 验收标准

- [ ] Window API 类型声明完整, TypeScript 编译无错误
- [ ] 路径规范文档完整, 包含所有子目录定义
- [ ] 日志规范文档完整, 包含接口定义
- [ ] 数据库初始化模块可创建所有表
- [ ] Schema SQL 文件与核心规范一致
- [ ] 日志模块可写入文件并轮转
- [ ] 配置模块可读写普通和加密配置
- [ ] IPC 客户端封装类型安全
- [ ] IpcError 类可正确捕获和传递错误信息
- [ ] 错误处理工具可映射所有错误码
- [ ] Vitest 配置正确, 示例测试通过
- [ ] Playwright 配置正确, 示例测试通过
- [ ] Preload 正确暴露 window.writenow
- [ ] 主进程启动时正确初始化所有模块
- [ ] 无 any 类型
- [ ] 所有新模块有对应测试

---

## 执行顺序建议

1. 任务 1 (Window 类型) - 解除 TypeScript 阻塞
2. 任务 2, 3 (更新规范) - 确定路径和日志规范
3. 任务 5 (日志模块) - 后续模块依赖日志
4. 任务 4 (数据库) - 核心存储
5. 任务 6 (配置) - 依赖数据库
6. 任务 10 (Preload) - IPC 基础
7. 任务 7 (IPC 客户端) - 依赖 Preload 类型
8. 任务 8 (错误处理) - 依赖 IPC 类型
9. 任务 9 (测试基础设施) - 可并行
10. 任务 11 (主进程) - 最后整合

---

## 完成后

Phase 0.5 完成后, Sprint 1-7 可直接开始功能实现:
- 数据库已初始化
- IPC 通信已就绪
- 日志/配置/错误处理已统一
- 测试基础设施已配置

不再需要每个 Sprint 补基础设施。
