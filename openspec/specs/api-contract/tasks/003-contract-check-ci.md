# 任务 003: CI 集成契约漂移检测

## 目标

- CI 在 PR/main 上运行契约检测，发现漂移直接阻断。

## 实现步骤

1. 在 `package.json` 增加：
   - `contract:generate`
   - `contract:check`
2. 更新 `.github/workflows/ci.yml`：
   - 在 `npm ci` 后、lint/build 前（或其间）执行 `npm run contract:check`

## 验收标准

- [ ] PR CI 会执行 `npm run contract:check`
- [ ] 当契约源变更但未提交生成结果时，CI 失败

