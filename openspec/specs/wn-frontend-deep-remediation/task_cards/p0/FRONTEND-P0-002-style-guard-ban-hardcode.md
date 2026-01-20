# FRONTEND-P0-002: Style Guard（禁止硬编码颜色与未定义 wn-*）

## Goal

把“设计系统纪律”变成自动化门禁：禁止新增硬编码颜色与未定义 `wn-*` class，阻止风格漂移与主题扩展破裂。

## Dependencies

- `FRONTEND-P0-001`（tokens SSOT 存在后，才能定义“什么是合法 token”）

## Expected File Changes

- Add: `scripts/style-guard.mjs`（扫描 ts/tsx/css，输出可定位错误；或选择 ESLint/Stylelint 方案）
- Update: `package.json`（新增 `lint:styles` 或纳入 `npm run lint`）
- Add/Update: `.github/workflows/ci.yml`（将 style guard 作为 required step）
- Add: `docs/style-guard.md`（如何修复与豁免策略）

## Acceptance Criteria

- [ ] 新增硬编码颜色（hex/rgb/hsl/oklch）会导致 CI 失败并提示替代方案（使用语义 token）
- [ ] 新增未定义 `wn-*` class 会导致 CI 失败，并提示在哪里注册/定义
- [ ] 支持最小豁免策略（仅对第三方库/迁移遗留做显式白名单，且必须有理由）

## Tests

- [ ] 在 CI 中运行 `npm run lint:styles`（或等价命令）并在 PR 中展示失败样例与修复样例的证据

