# P6-001: 配置 electron-vite

## 元信息

| 字段 | 值 |
|------|-----|
| ID | P6-001 |
| Phase | 6 - Electron 打包 |
| 优先级 | P0 |
| 状态 | Done |
| Issue | #223 |
| PR | TBD |
| RUN_LOG | openspec/_ops/task_runs/ISSUE-223.md |
| 依赖 | P5-003 |

## 必读前置（执行前必须阅读）

- [x] `design/05-electron-integration.md` — Electron 集成设计
- [x] `design/02-tech-stack.md` — **技术选型（禁止替换 electron-vite）**

## 目标

使用 electron-vite 配置 Electron 开发环境。

## 任务清单

- [x] 安装 electron 和 electron-vite 依赖
- [x] 创建 `electron.vite.config.ts`
- [x] 创建 `electron/main.ts` 主进程入口
- [x] 创建 `electron/preload.ts` 预加载脚本
- [x] 配置开发脚本（`npm run dev:electron`）
- [x] 验证 HMR 工作正常

## 验收标准

- [x] Electron 窗口可启动
- [x] 渲染进程加载前端页面
- [x] HMR 正常工作
- [x] DevTools 可打开

## 产出

- `electron.vite.config.ts`
- `electron/main.ts`
- `electron/preload.ts`
- `package.json` scripts 更新

## 技术细节

参考 `design/05-electron-integration.md` 中的配置。

### package.json scripts

```json
{
  "scripts": {
    "dev": "vite",
    "dev:electron": "electron-vite dev",
    "build": "vite build",
    "build:electron": "electron-vite build",
    "preview": "electron-vite preview"
  }
}
```

### 主进程基础

```typescript
// electron/main.ts
import { app, BrowserWindow } from 'electron';
import path from 'path';

let mainWindow: BrowserWindow | null = null;

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1400,
    height: 900,
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      nodeIntegration: false,
      contextIsolation: true,
    },
  });

  // 开发环境加载 Vite dev server
  if (process.env.NODE_ENV === 'development') {
    mainWindow.loadURL('http://localhost:5173');
    mainWindow.webContents.openDevTools();
  } else {
    mainWindow.loadFile(path.join(__dirname, '../renderer/index.html'));
  }
}

app.whenReady().then(createWindow);

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});

app.on('activate', () => {
  if (BrowserWindow.getAllWindows().length === 0) {
    createWindow();
  }
});
```
