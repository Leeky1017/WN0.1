# P6-003: 配置 electron-builder

## 元信息

| 字段 | 值 |
|------|-----|
| ID | P6-003 |
| Phase | 6 - Electron 打包 |
| 优先级 | P0 |
| 状态 | Done |
| Issue | #223 |
| PR | TBD |
| RUN_LOG | openspec/_ops/task_runs/ISSUE-223.md |
| 依赖 | P6-002 |

## 必读前置（执行前必须阅读）

- [x] `design/05-electron-integration.md` — Electron Builder 配置
- [x] `design/02-tech-stack.md` — **技术选型（禁止替换）**

## 目标

使用 electron-builder 配置生产打包。

## 任务清单

- [x] 安装 electron-builder 依赖
- [x] 创建 `electron-builder.json5` 配置文件
- [x] 配置 Windows NSIS 打包
- [x] 配置 macOS DMG 打包
- [x] 配置 Linux AppImage 打包
- [x] 配置应用图标
- [x] 配置后端文件打包
- [x] 测试打包产物

## 验收标准

- [x] 三平台打包成功
- [x] 安装包可正常安装
- [x] 安装后应用可启动
- [x] 后端正确包含在安装包中

## 产出

- `electron-builder.json5`
- `public/icon.ico`
- `public/icon.icns`
- `public/icon.png`

## 技术细节

参考 `design/05-electron-integration.md` 中的打包配置。

### electron-builder.json5

```json5
{
  "$schema": "https://raw.githubusercontent.com/electron-userland/electron-builder/master/packages/app-builder-lib/scheme.json",
  "appId": "com.writenow.app",
  "productName": "WriteNow",
  "copyright": "Copyright © 2026",
  
  "directories": {
    "output": "release/${version}"
  },
  
  "files": [
    "dist/**/*",
    "dist-electron/**/*"
  ],
  
  "extraResources": [
    {
      "from": "theia-backend",
      "to": "theia-backend",
      "filter": ["**/*"]
    }
  ],
  
  "win": {
    "target": [
      {
        "target": "nsis",
        "arch": ["x64"]
      }
    ],
    "icon": "public/icon.ico"
  },
  
  "nsis": {
    "oneClick": false,
    "allowToChangeInstallationDirectory": true,
    "installerIcon": "public/icon.ico",
    "uninstallerIcon": "public/icon.ico",
    "installerHeaderIcon": "public/icon.ico"
  },
  
  "mac": {
    "target": [
      {
        "target": "dmg",
        "arch": ["x64", "arm64"]
      }
    ],
    "icon": "public/icon.icns",
    "category": "public.app-category.productivity"
  },
  
  "dmg": {
    "contents": [
      {
        "x": 130,
        "y": 220
      },
      {
        "x": 410,
        "y": 220,
        "type": "link",
        "path": "/Applications"
      }
    ]
  },
  
  "linux": {
    "target": [
      {
        "target": "AppImage",
        "arch": ["x64"]
      }
    ],
    "icon": "public/icon.png",
    "category": "Office"
  }
}
```

### 打包脚本

```json
{
  "scripts": {
    "package": "electron-vite build && electron-builder",
    "package:win": "electron-vite build && electron-builder --win",
    "package:mac": "electron-vite build && electron-builder --mac",
    "package:linux": "electron-vite build && electron-builder --linux"
  }
}
```
