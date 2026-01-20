# 任务 001: electron-updater 自动更新机制实现

## 目标

在 Electron 主进程集成 `electron-updater`，实现后台检查与静默下载，并在 UI 提供“手动检查/安装重启/跳过版本”等可控更新体验；默认更新服务器使用 GitHub Releases。

## 依赖

- Sprint 1/2 已具备可运行的 Electron 主进程与渲染进程 UI 基础
- 具备基础构建产物能力（electron-builder 可打包出可运行的发布包）

## 实现步骤

1. 安装依赖：
   - `electron-updater`
   - （可选）`electron-log` 用于落盘更新日志
2. 补齐构建与发布配置（electron-builder）：
   - 增加 `publish`（GitHub provider）配置
   - 调整发布产物格式（Windows 建议至少包含可安装包，如 `nsis`；并确保生成更新元数据文件）
3. 主进程实现 Updater Service：
   - 初始化 `autoUpdater`（开机后台检查）
   - 监听事件：`checking-for-update` / `update-available` / `update-not-available` / `download-progress` / `update-downloaded` / `error`
   - 维护一个可序列化的更新状态（供渲染进程展示）
4. 设计 IPC 通道（渲染进程不可直连更新服务）：
   - `update:check`（手动检查）
   - `update:download`（下载更新包）
   - `update:install`（立即重启安装）
   - `update:skipVersion`（跳过当前版本）
   - `update:clearSkipped`（清除跳过）
   - `update:getState`（读取当前状态）
   - （推荐）事件推送：`update:stateChanged`
5. 渲染进程 UI 接入（设置/关于）：
   - 展示当前版本号、最后检查时间、检查/下载/就绪/失败状态
   - 提供按钮：检查更新、立即重启、稍后、跳过版本
6. 落盘证据与错误处理（禁止 silent failure）：
   - 失败需展示可理解错误信息（网络/鉴权/服务器不可用）
   - 同步写入更新日志（供排查）

## 新增/修改文件

- `electron-builder.json` - 发布产物与 `publish` 配置
- `electron/ipc/update.cjs`（新增）- Update IPC handlers
- `electron/main.cjs` - 注册 Updater 模块与事件转发
- `electron/preload.cjs` - 暴露安全的 updater API
- `src/components/Settings/*` 或 `src/components/About/*` - 更新 UI（新增/修改）
- `src/stores/*` - updater 状态管理（新增/修改）

## 验收标准

- [ ] 应用启动后后台检查更新，不阻塞编辑器可用性
- [ ] UI 可手动触发检查更新，并看到明确结果（有更新/无更新/失败）
- [ ] 下载完成后提示“新版本已就绪”，用户可选择“立即重启/稍后”
- [ ] 支持“跳过此版本”，跳过后不再提示该版本，并可清除跳过状态
- [ ] 更新失败有可理解错误信息，并有落盘日志证据

## 参考

- 核心规范：`openspec/specs/writenow-spec/spec.md` 第 484-509 行（自动更新机制）
