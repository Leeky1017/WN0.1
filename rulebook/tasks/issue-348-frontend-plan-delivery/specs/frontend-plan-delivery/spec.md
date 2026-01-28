## Delta Spec: writenow-frontend i18n + Update UI delivery (Issue #348)

### 背景 / Why

`writenow-frontend/` 存在一批基于 `~/.cursor/plans/wn_前端全面优化_c8d2d8f1.plan.md` 的改动，需要以可审计方式交付；本 spec 定义本次交付的最小可验收增量（i18n 与 update UI 为核心）。

### 范围 / Scope

- i18n（i18next + react-i18next）初始化、资源文件与语言切换（持久化）
- Settings 中 Update 管理 UI（`update:*`）
- a11y 基线（增量）
- E2E 覆盖新增入口

### 需求 / Requirements

#### R1. i18n 初始化与资源

- App 必须初始化 i18next（react-i18next provider 在根节点可用）。
- 默认语言：`zh-CN`。
- 支持语言：`zh-CN`、`en`（允许从环境/浏览器语言做归一化，但必须落到上述集合）。
- 翻译资源 SSOT 位于 `writenow-frontend/src/locales/{zh-CN,en}.json`。

#### R2. 语言切换与持久化

- Settings 中提供语言选择（`zh-CN` / `en`）。
- 切换必须“立即生效”，无需重启。
- 语言设置必须持久化到本地存储（localStorage），重启后仍保持所选语言。
- 存储失败不得阻断主流程（非关键偏好，允许静默降级）。

#### R3. Update 管理 UI（Settings）

- Settings 中提供 Update 区块，展示：
  - 当前版本（优先后端 state，其次 `__VERSION__`）
  - 上次检查时间（若无显示 `—`）
  - 当前状态（idle/checking/available/not_available/downloading/downloaded/error）
  - 最新版本信息（如有：version/notes/publishedAt）
  - 跳过版本（如有）
- 必须接入以下 IPC：
  - `update:getState`
  - `update:check`
  - `update:download`
  - `update:install`
  - `update:skipVersion`
  - `update:clearSkipped`
- `checking` / `downloading` 状态下必须轮询刷新 state，UI 需可见进度与错误信息。

#### R4. a11y 基线（增量）

- icon-only 按钮必须有可读标签（`aria-label`）；若调用方未显式提供，允许用 tooltip 文案兜底。
- 可折叠区块按钮必须提供可读标签（包含“展开/收起 + section title”）。
- Update 状态必须用 `role="status"` + `aria-live="polite"`；错误信息必须用 `role="alert"`。

### 场景 / Scenarios

#### S1. 语言切换立即生效并持久化

1. 打开 Settings → 外观与编辑器
2. 语言从 `zh-CN` 切换到 `en`
3. 断言：同页文案（如 “Appearance & Editor”）立即变为英文
4. 重启应用
5. 断言：语言保持为 `en`

#### S2. Update UI：渲染与检查更新可触发状态变化

1. 打开 Settings → Update
2. 断言：Update 区块可见，状态字段存在
3. 点击“检查更新”
4. 断言：状态从 `idle` 进入 `checking` 或进入其他非 idle 状态（取决于后端实现与网络环境）

### 测试 / Evidence

- 单元/构建：`writenow-frontend` 的 `npm run lint`、`npm run test`、`npm run build`
- E2E：新增用例
  - `writenow-frontend/tests/e2e/write-mode/i18n-language-switch.spec.ts`
  - `writenow-frontend/tests/e2e/write-mode/update-ui.spec.ts`
  - 运行证据记录在 `openspec/_ops/task_runs/ISSUE-348.md`

