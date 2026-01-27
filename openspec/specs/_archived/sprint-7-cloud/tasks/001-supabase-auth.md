# 任务 001: Supabase 用户认证集成

## 目标

在桌面端打通 Supabase Auth 的注册/登录/登出/会话恢复闭环，为 Sprint 7 的订阅系统与云同步提供稳定的身份基础；同时保证未登录用户仍可继续使用本地编辑能力（local-first）。

## 依赖

- Supabase 项目已创建（Auth 启用、站点 URL/重定向配置完成）
- Electron 主进程与 IPC 通道基础（用于统一处理网络错误与状态落盘）
- 设置页/引导页可承载登录入口（UI 位置可实现自定）

## 实现步骤

1. Supabase 基础配置：
   - 定义 `SUPABASE_URL` / `SUPABASE_ANON_KEY` 的配置来源（env/配置文件均可，但必须可在不同环境切换）
   - 明确 session 存储策略（至少：应用重启可恢复；失败需提示重登）
2. Auth IPC API：
   - 设计并实现 `auth:*` IPC（例如：`auth:signUp` / `auth:signIn` / `auth:signOut` / `auth:getSession` / `auth:refreshSession`）
   - 错误必须可理解（网络/账号/密码/限流等），禁止 silent failure
3. UI 集成：
   - 在设置页新增「账号」区：显示登录态、邮箱、订阅状态占位（Sprint 7.2 接入）
   - 提供注册/登录表单与登出入口
4. 会话恢复与降级：
   - 启动时加载 session（或向 Supabase 刷新）并更新应用状态
   - 离线时保持本地编辑可用；云相关入口显示离线与重试
5. 账号与本地数据关系（最小策略）：
   - 明确“本地数据默认归属本机，不因登录自动上传”
   - 仅在用户开启云同步后进入上传流程（任务 003）

## 新增/修改文件（建议）

- `electron/ipc/auth.cjs` - Supabase Auth 调用与错误处理（新增）
- `electron/preload.cjs` - 暴露 `window.writenow.auth`（修改）
- `src/stores/authStore.ts` - 登录态/会话加载/订阅状态占位（新增）
- `src/components/settings/AccountSection.tsx`（或等价位置）- 登录 UI（新增/修改）

## 验收标准

- [ ] 用户可注册/登录/登出，且 UI 正确反映登录态
- [ ] 应用重启后可恢复会话（失败必须提示并可重登）
- [ ] 离线时本地编辑可用，云相关入口显示离线与重试
- [ ] 错误信息清晰，不出现 silent failure

## 参考

- Sprint 7 规范：`openspec/specs/sprint-7-cloud/spec.md`
- 核心规范：`openspec/specs/writenow-spec/spec.md` 第 579-586 行（后端技术栈：Supabase Auth）
