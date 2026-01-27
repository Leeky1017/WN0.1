# 03 - 质量门禁与回归体系（E2E-first + 观测证据）

> 目标：用最少的“人肉 QA”成本，持续保持最高质量。
>
> 核心策略：**把 Write Mode 的关键用户路径写成真实 E2E，并变成 required checks**。

---

## 1. 为什么必须 E2E-first

Write Mode 的关键风险不是“函数算错”，而是：
- UI 状态错误（保存状态、焦点、面板切换）
- 异步竞态（保存/切换文件/AI streaming）
- 数据丢失（崩溃/重启/恢复）

这些问题只有真实 E2E 能覆盖。

Repo 事实：当前 `writenow-frontend/src/__tests__/BROWSER_VALIDATION_CHECKLIST.md` 存在大量“手工验证项”。
策略：把其中与 Write Mode 主路径相关的条目迁移为 Playwright E2E（让质量从“人肉”变成“系统默认”）。

---

## 2. required checks（建议作为本 Sprint 的核心策略产出）

### 2.1 目标

把以下门禁纳入 required checks（至少对 Write Mode 相关 PR）：

- `openspec validate --specs --strict --no-interactive`
- `contract:check`（已在 `npm run lint` 内）
- `build`
- `playwright:e2e`（最小套件）

### 2.1.1 与当前 CI 的差距（Repo 事实）

当前 GitHub workflow：
- `.github/workflows/ci.yml`：openspec + contract:check + lint + build（✅）
- `.github/workflows/merge-serial.yml`：openspec + npm ci + lint + build（✅）

缺口：**没有任何 Playwright/E2E 门禁**。这会导致：
- 写作主路径的回归只能靠人工发现（成本高、且容易漏）
- “demo UI 进入主路径”的风险无法自动阻断

本 Sprint 的策略目标是：至少为 Write Mode 相关变更引入最小 E2E gate（哪怕用例少，也必须硬）。

### 2.2 最小 E2E 套件（Write Mode Gate）

> 原则：宁愿少而硬，不要多而松。

建议新增一个“只跑 Write Mode 关键路径”的 Playwright 项目或 grep 过滤，例如：

- `tests/e2e/write-mode/*.spec.ts`

或在现有测试中加 tag：

- `test.describe('@write-mode', ...)`

CI 执行：

- `npx playwright test -g "@write-mode"`

---

## 3. E2E 测试矩阵（必须写具体步骤与断言）

### 3.1 WM-001 启动 → 新建文档 → 输入 → 自动保存

**Steps**
1. 启动 Electron（设置 `WN_E2E=1`，`WN_USER_DATA_DIR=<tmp>`）
2. 新建文件（UI 点击或命令面板）
3. 在 TipTap 编辑器输入 `# Title\n\nHello`（必须真实输入）
4. 等待状态变为 Saved

**Asserts**
- UI：编辑器可见、可输入
- UI：Saving → Saved
- Disk：`<userData>/documents/<name>.md` 存在且内容包含 `Hello`

### 3.1.1 E2E 环境开关（必须明确，降低 flake）

Write Mode 的 E2E 必须具备“可控环境”，避免被 devtools/欢迎页/自动更新打断：

- 已支持：
  - `WN_USER_DATA_DIR=<tmp>`：隔离用户数据（`electron/main.ts`）
  - `WN_E2E=1`：E2E 模式（`electron/main.ts` 用于禁止自动打开 devtools）
  - `WN_DISABLE_GPU=1`：在 CI/WSL 兼容环境禁用 GPU
- 建议补齐（作为任务卡）：
  - `WN_SKIP_WELCOME=1`：跳过 WelcomeScreen（避免测试必须点击“Start”）
  - `WN_DISABLE_AUTO_UPDATE=1`：禁用自动更新（避免弹窗/重启）

原则：E2E 环境开关是“测试基础设施”，属于低成本高收益的投入。

### 3.2 WM-002 Focus Mode 切换（写作不中断）

**Steps**
1. 在编辑器输入若干字符
2. 触发 Focus/Zen（快捷键）
3. 继续输入
4. Esc 退出 Focus

**Asserts**
- Focus 时侧栏/AI panel 不可见（或 width=0）
- Focus 时仍可输入
- 退出后布局恢复

### 3.3 WM-003 AI 改写 → Diff → Accept → 版本/内容一致

**Steps**
1. 选中一段文本
2. 触发 Skill（或 panel 输入 `/polish`）
3. 等待 AI 输出完成（stream done）
4. 出现 diff（panel 或 editor inline）
5. 点击 Accept

**Asserts**
- diff 可见（至少一种表达：panel diff / editor decorations）
- Accept 后正文发生可验证变化
- 版本历史新增节点（如果 UI 暴露）或持久化版本记录存在

### 3.4 WM-004 AI 取消语义（Esc）

**Steps**
1. 触发 AI run
2. 在 streaming 中按 Esc

**Asserts**
- run 进入 canceled
- UI 不残留“输出中…”或幽灵 diff
- editor 可继续输入

### 3.5 WM-005 崩溃/重启恢复（不丢稿）

**Steps**
1. 输入一段文本
2. 强制关闭 electronApp（模拟 crash）
3. 重启

**Asserts**
- 文档内容恢复（至少到最近 autosave）
- UI 显示恢复点（时间戳或提示）

---

## 3.6 “真实 E2E”红线（禁止 fake）

为了保证门禁有效性，E2E 必须满足：

- **真实 UI 事件**：必须使用 `page.keyboard.type()` / click 等真实交互，不允许直接 set React state 或调用内部函数
- **真实持久化**：必须断言真实落盘文件存在/内容正确（userData 下的 documents/ 或实际落盘路径）
- **真实 RPC/IPC**：不得 mock `invoke()`；必须走真实 backend（Theia）与真实 Electron 主进程

> Why：这三条是“防伪”，否则 E2E 只是在测试自己写的 stub。

---

## 4. 证据与诊断（失败必须可定位）

### 4.1 Playwright trace 作为默认

- CI 中必须启用 trace（失败自动保存）
- 同时保存 screenshot（关键状态：Focus、Diff、Error toast）

### 4.2 日志收集

- Electron main log：优先写到 `app.getPath('logs')/main.log`（现有 `writenow-frontend/electron/main.ts` 已支持）
- E2E 失败时将日志作为 artifact 上传

### 4.2.1 最小诊断包内容（标准化，降低排障成本）

每次 E2E 失败必须能拿到：

1) Playwright trace（包含 video/network/console）
2) screenshot（至少 1 张：失败时刻）
3) `main.log`（`app.getPath('logs')/main.log`）
4) backend log（如有；至少记录 backend launcher 的 stdout/stderr 片段）
5) 若失败为保存/AI：必须包含 `error.code` 与 `requestId/runId`

建议把这些打包成 CI artifact，保留 7 天（成本低，收益高）。

### 4.3 错误码语义

- UI 逻辑禁止依赖异常字符串
- 必须基于 `IpcResponse<T>` 的 `ok` 分支 + `error.code`

---

## 5. Flake 处理策略（不牺牲门禁强度）

- 允许 `retries=1`（仅应对环境抖动）
- 任一 flake 必须：
  - 记录在 issue/任务卡的“Flake Log”
  - 72 小时内修复或降级用例

> Repo 事实：当前 `playwright.config.ts` 配置 `trace: "on-first-retry"`，但未显式设置 `retries`。
> 若不设置 `retries>=1`，很多失败将拿不到 trace（诊断成本上升）。

---

## 6. 将 E2E 变成 required check 的低成本落地方式（建议）

### 6.1 最小化执行成本

策略：只对 Write Mode 关键路径用例做门禁，并通过 tag/path filter 降低运行时间。

- 测试组织：
  - `writenow-frontend/tests/e2e/write-mode/*.spec.ts`
  - 或 `@write-mode` tag（`npx playwright test -g "@write-mode"`）
- workflow：
  - 新增 `.github/workflows/e2e-write-mode.yml`
  - `pull_request` 触发 + path filter：只在影响 `writenow-frontend/src/**` 或 `electron/**` 的 PR 运行

### 6.2 把它纳入 required checks

完成后在 GitHub branch protection 中把 `e2e-write-mode` 加入 required checks（与 `ci` / `merge-serial` 并列）。

> 这一步不一定由本 Sprint 在代码里完成，但必须写在 task card 中作为“交付收口动作”，否则策略不会真正生效。

---

## 7. “低成本”的关键：把测试当成产品的一部分

写作 IDE 的质量=用户信任。

WN 的策略是：
- 用强门禁把回归提前到 PR 阶段
- 让“修 bug”变成少数事件
- 让每一次失败都能被快速定位（trace + logs + error codes）
