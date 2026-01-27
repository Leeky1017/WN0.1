# P6-002: 实现主进程启动后端

## 元信息

| 字段 | 值 |
|------|-----|
| ID | P6-002 |
| Phase | 6 - Electron 打包 |
| 优先级 | P0 |
| 状态 | Done |
| Issue | #223 |
| PR | https://github.com/Leeky1017/WN0.1/pull/224 |
| RUN_LOG | openspec/_ops/task_runs/ISSUE-223.md |
| 依赖 | P6-001 |

## 必读前置（执行前必须阅读）

- [x] `design/05-electron-integration.md` — 主进程后端启动设计
- [x] `design/02-tech-stack.md` — **技术选型（禁止替换）**

## 目标

在 Electron 主进程中启动 Theia 后端服务。

## 任务清单

- [x] 实现后端进程启动逻辑
- [x] 实现端口等待（确保后端就绪）
- [x] 传递必要环境变量（数据目录等）
- [x] 实现后端进程管理（启动/停止/重启）
- [x] 处理后端崩溃情况
- [x] 添加后端日志收集

## 验收标准

- [x] Electron 启动时自动启动后端
- [x] 后端就绪后才加载前端
- [x] 应用退出时后端正常关闭
- [x] 后端崩溃时有提示

## 产出

- `electron/services/backendLauncher.ts`
- 更新 `electron/main.ts`

## 技术细节

### 后端启动器

```typescript
// electron/services/backendLauncher.ts
import { spawn, ChildProcess } from 'child_process';
import path from 'path';
import { app } from 'electron';
import net from 'net';

const BACKEND_PORT = 3000;

class BackendLauncher {
  private process: ChildProcess | null = null;
  
  async start(): Promise<void> {
    const backendPath = app.isPackaged
      ? path.join(process.resourcesPath, 'theia-backend')
      : path.join(__dirname, '../../writenow-theia/browser-app');
    
    const env = {
      ...process.env,
      WRITENOW_DATA_DIR: app.getPath('userData'),
      WRITENOW_LOG_DIR: app.getPath('logs'),
    };
    
    this.process = spawn('node', ['main.js'], {
      cwd: backendPath,
      env,
      stdio: ['ignore', 'pipe', 'pipe'],
    });
    
    // 收集日志
    this.process.stdout?.on('data', (data) => {
      console.log('[Backend]', data.toString());
    });
    
    this.process.stderr?.on('data', (data) => {
      console.error('[Backend Error]', data.toString());
    });
    
    this.process.on('exit', (code) => {
      console.log(`Backend exited with code ${code}`);
      if (code !== 0) {
        // 通知前端后端崩溃
        this.notifyBackendCrash(code);
      }
    });
    
    // 等待后端就绪
    await this.waitForPort(BACKEND_PORT);
  }
  
  stop(): void {
    if (this.process) {
      this.process.kill();
      this.process = null;
    }
  }
  
  private waitForPort(port: number, timeout = 30000): Promise<void> {
    return new Promise((resolve, reject) => {
      const startTime = Date.now();
      
      const check = () => {
        const socket = new net.Socket();
        
        socket.on('connect', () => {
          socket.destroy();
          resolve();
        });
        
        socket.on('error', () => {
          socket.destroy();
          if (Date.now() - startTime > timeout) {
            reject(new Error('Backend start timeout'));
          } else {
            setTimeout(check, 200);
          }
        });
        
        socket.connect(port, 'localhost');
      };
      
      check();
    });
  }
  
  private notifyBackendCrash(code: number | null): void {
    // 发送 IPC 到渲染进程
    const windows = BrowserWindow.getAllWindows();
    windows.forEach(win => {
      win.webContents.send('backend:crashed', { code });
    });
  }
}

export const backendLauncher = new BackendLauncher();
```

### 主进程集成

```typescript
// electron/main.ts
import { backendLauncher } from './services/backendLauncher';

app.whenReady().then(async () => {
  // 先启动后端
  try {
    await backendLauncher.start();
    console.log('Backend started');
  } catch (error) {
    console.error('Failed to start backend:', error);
    dialog.showErrorBox('启动失败', '后端服务启动失败，请重试');
    app.quit();
    return;
  }
  
  // 后端就绪后创建窗口
  await createWindow();
});

app.on('quit', () => {
  backendLauncher.stop();
});
```
