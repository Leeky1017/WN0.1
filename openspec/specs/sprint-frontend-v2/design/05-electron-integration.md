# Electron 集成

## 主进程职责

```typescript
// electron/main.ts
import { app, BrowserWindow } from 'electron';
import { spawn } from 'child_process';

let theiaProcess: ChildProcess | null = null;

async function startTheiaBackend(): Promise<void> {
  // 启动 Theia 后端服务
  theiaProcess = spawn('node', ['./theia-backend/main.js'], {
    env: { ...process.env, WRITENOW_THEIA_DATA_DIR: app.getPath('userData') },
  });
  // 等待后端就绪
  await waitForPort(3000);
}

async function createWindow(): Promise<void> {
  const win = new BrowserWindow({
    width: 1400,
    height: 900,
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
    },
  });
  // 加载前端
  if (isDev) {
    win.loadURL('http://localhost:5173');
  } else {
    win.loadFile('dist/index.html');
  }
}

app.whenReady().then(async () => {
  await startTheiaBackend();
  await createWindow();
});

app.on('quit', () => {
  theiaProcess?.kill();
});
```

## 预加载脚本

```typescript
// electron/preload.ts
import { contextBridge, ipcRenderer } from 'electron';

contextBridge.exposeInMainWorld('electronAPI', {
  // 暴露必要的 Electron API
  platform: process.platform,
  
  // 系统对话框
  showOpenDialog: (options) => ipcRenderer.invoke('dialog:showOpen', options),
  showSaveDialog: (options) => ipcRenderer.invoke('dialog:showSave', options),
  
  // 剪贴板
  writeText: (text) => ipcRenderer.invoke('clipboard:writeText', text),
  readText: () => ipcRenderer.invoke('clipboard:readText'),
  
  // 更新
  checkForUpdates: () => ipcRenderer.invoke('update:check'),
  downloadUpdate: () => ipcRenderer.invoke('update:download'),
  installUpdate: () => ipcRenderer.invoke('update:install'),
});
```

## 打包配置

```json5
// electron-builder.json5
{
  "appId": "com.writenow.app",
  "productName": "WriteNow",
  "directories": {
    "output": "release"
  },
  "files": [
    "dist/**/*",
    "dist-electron/**/*",
    "theia-backend/**/*"
  ],
  "win": {
    "target": ["nsis"],
    "icon": "public/icon.ico"
  },
  "mac": {
    "target": ["dmg"],
    "icon": "public/icon.icns"
  },
  "linux": {
    "target": ["AppImage"],
    "icon": "public/icon.png"
  }
}
```

## electron-vite 配置

```typescript
// electron.vite.config.ts
import { defineConfig, externalizeDepsPlugin } from 'electron-vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  main: {
    plugins: [externalizeDepsPlugin()],
    build: {
      rollupOptions: {
        input: {
          index: 'electron/main.ts',
        },
      },
    },
  },
  preload: {
    plugins: [externalizeDepsPlugin()],
    build: {
      rollupOptions: {
        input: {
          index: 'electron/preload.ts',
        },
      },
    },
  },
  renderer: {
    plugins: [react()],
    root: '.',
    build: {
      rollupOptions: {
        input: {
          index: 'index.html',
        },
      },
    },
  },
});
```
