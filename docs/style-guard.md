# Style Guard（硬门禁）

本仓库将“设计系统纪律”变成自动化门禁：禁止在 `src/` 中新增硬编码颜色（`#hex` / `rgb()` / `hsl()` / `oklch()` / `oklab()`）以及未定义的 `wn-*` 类名，避免主题扩展时 UI 破裂与风格漂移。

权威规范来源：`openspec/specs/wn-frontend-deep-remediation/spec.md`（`FROTNEND-DS-002`）。

## 运行

- 本地：`npm run lint`
- 单独运行：`node scripts/style-guard.js`

CI 会执行 `npm run lint`，因此该门禁会在 PR 上阻断违规提交。

## 修复指南

### 1) 硬编码颜色报错

- **不要**写 `bg-[#252526]` / `color: #fff` / `rgb(...)` 等
- **改为**使用 tokens（CSS 变量）：
  - 优先使用语义 token：`var(--wn-bg-*)` / `var(--wn-text-*)` / `var(--wn-border-*)` / `var(--wn-accent-*)`
  - 历史兼容变量（如 `--bg-primary`）允许存在，但新增样式建议直接使用 `--wn-*`

### 2) 未定义 `wn-*` 类名报错

- **不要**在 `className` 里发明新 `wn-*` 语义
- **改为**：
  - 使用已存在的 `wn-*` 类名；或
  - 在 `src/styles/*.css` 中新增对应 `.wn-...` 定义（并确保其样式可追溯到 `src/styles/tokens.css`）

## 豁免策略（最小化）

仅允许对**第三方库**或**生成文件**做显式白名单，且必须有理由。当前白名单集中在 `scripts/style-guard.js` 内的 `ALLOW_COLOR_FILES` / `EXCLUDE_FILES`（例如 `src/styles/tokens.css`、`src/index.css`），新增豁免时请附带理由并保持列表最小。

