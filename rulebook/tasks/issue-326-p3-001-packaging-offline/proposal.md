# Proposal: issue-326-p3-001-packaging-offline

## Why
当前打包链路存在“可发布但不可用”的高风险：`extraResources` 依赖 Theia backend 构建产物，但打包脚本未强制构建，可能导致随包后端缺失/陈旧；同时 Write Mode 仍依赖在线字体（Google Fonts），离线体验不可控；本地 LLM 已实现但离线随包模型/预编译校验缺少自动化门禁。

## What Changes
- 固化打包顺序：build Theia backend → 资源准备/校验 → electron-builder 打包（不可绕过）。
- 随包资源：字体改为本地随包（移除对 Google Fonts 的硬依赖）；本地模型支持“随包只读资源 → 按需复制到 userData”以保证离线可用且不拖慢冷启动。
- native deps：补齐 electron-builder 配置与最小 smoke，避免 `.node` 运行时报错。
- 自动化验收：提供可在 CI/release 调用的打包 smoke（可取证日志）。

## Impact
- Affected specs: `openspec/specs/sprint-write-mode-ide/design/05-packaging.md`, task card `P3-001`
- Affected code: `writenow-frontend/` packaging config + scripts + `electron/main.ts`
- Breaking change: NO
- User benefit: 安装后无需联网即可进入可写状态；离线字体一致且更稳定；本地 LLM 可在离线环境使用（随包模型存在时）
