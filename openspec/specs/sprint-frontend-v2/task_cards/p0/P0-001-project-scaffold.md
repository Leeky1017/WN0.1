# P0-001: 创建 writenow-frontend 项目骨架

## 元信息

| 字段 | 值 |
|------|-----|
| ID | P0-001 |
| Phase | 0 - 基础设施 |
| 优先级 | P0 |
| 状态 | Done |
| Issue | #223 |
| PR | https://github.com/Leeky1017/WN0.1/pull/224 |
| RUN_LOG | openspec/_ops/task_runs/ISSUE-223.md |
| 依赖 | 无 |

## 必读前置（执行前必须阅读）

- [x] `design/00-overview.md` — 目录结构
- [x] `design/02-tech-stack.md` — **技术选型（禁止替换）**

## 目标

创建独立的 `writenow-frontend/` 项目，使用 Vite + React + TypeScript 技术栈。

## 任务清单

- [x] 使用 `npm create vite@latest` 创建项目
- [x] 配置 TypeScript 严格模式
- [x] 配置路径别名（`@/` 指向 `src/`）
- [x] 创建基础目录结构（参考 design/00-overview.md）
- [x] 配置 ESLint + Prettier
- [x] 验证开发服务器可启动

## 验收标准

- [x] `npm run dev` 可正常启动开发服务器
- [x] TypeScript 严格模式无错误
- [x] 目录结构符合规范

## 产出

- `writenow-frontend/` 项目目录
- `package.json`、`vite.config.ts`、`tsconfig.json`

## 技术细节

### Vite 配置

```typescript
// vite.config.ts
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import path from 'path';

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
});
```

### TypeScript 配置

```json
{
  "compilerOptions": {
    "strict": true,
    "noImplicitAny": true,
    "strictNullChecks": true,
    "paths": {
      "@/*": ["./src/*"]
    }
  }
}
```
