# 00 - 开发策略总纲（最低成本 · 最高质量 · 性能优先）

> 本文回答：**WriteNow（WN）如何用相对最低的研发成本，交付尽可能高的质量**，并把 IDE Write Mode 做成产品级体验。
>
> 重要前提：安装包体积不设上限；性能/体验优先；旧实现若不如新方案 **必须替换**（不向后兼容）。

---

## 0. TL;DR（可执行结论）

1. **Write Mode SSOT**：把写作主路径（打开 → 写 → 保存/恢复 → AI 可控 → 版本）定为唯一验收基线。
2. **单链路**：同一能力不允许两套实现长期并存；新方案落地必须删旧方案。
3. **E2E-first 门禁**：任何影响 Write Mode 主路径的 PR，必须有真实 Playwright E2E 覆盖，且成为 required check。
4. **性能预算写进规范**：输入延迟、打开/切换、保存、AI 取消清理等都要可量化。
5. **把“高质量”外包给工程系统**：契约自动化、错误码、可观测日志、回归测试矩阵 —— 让质量成为默认结果，而不是靠人肉。

> 额外强约束（本 Sprint 生效）：
> - **写作主路径只允许 1 套实现**（UI/状态机/持久化都要 SSOT）。
> - **不做向后兼容**：旧路径如果不如新路径，直接删除旧路径（不保留“备用入口/开关/双实现”）。

---

## 1. 产品目标拆解：什么叫“写作 IDE 的 Write Mode”

Write Mode 不是单纯“编辑器 + 侧边栏”。它的本质是：

- **连续输入不中断**：任何后台任务（保存、索引、AI、渲染）都不能阻塞输入。
- **不丢稿**：崩溃/断电/误操作后可以恢复，且恢复点可解释。
- **可控 AI**：AI 永远不能“偷偷改文”，必须 diff + accept/reject + 可取消。
- **IDE 的组织力**：项目化（文件/大纲/角色/设定/版本），并且键盘优先。

> Strategy：只要把上面四点做到极致，其他功能（发布、协作、云）都可以后置。

---

## 1.1 Write Mode 的系统位置（架构图）

Write Mode 不是“一个 React 页面”，它跨越 renderer/main/backend 三层。为了降低长期成本，必须从一开始就把边界定清楚：

```
┌──────────────────────────────┐
│            User              │
│  typing / hotkeys / clicks   │
└──────────────┬───────────────┘
               │
               ▼
┌──────────────────────────────┐
│ Renderer (React + TipTap)     │
│ - AppShell / WriteModePage    │
│ - TipTapEditor (SSOT)         │
│ - stores (zustand)            │
│ - features/* hooks            │
└──────────────┬───────────────┘
               │  WebSocket JSON-RPC
               ▼
┌──────────────────────────────┐
│ Theia Backend (Node)          │
│ - standalone-rpc invoke bridge│
│ - services: AI/Skills/...     │
│ - file/project/version/search │
└──────────────┬───────────────┘
               │  file I/O / db
               ▼
┌──────────────────────────────┐
│ Local FS / SQLite / Index     │
└──────────────────────────────┘
```

Write Mode 的“低成本”来自：
- Renderer 只负责 UI/交互与轻量状态，不做重 I/O
- 契约（`ipc-generated.ts`）保证接口稳定，减少联调成本
- E2E 从 UI 一直打到落盘，避免“看起来能用”但实际上丢稿

---

## 2. “最低成本”不是少写代码，而是少维护代码

### 2.1 成本模型（写给工程决策）

- **研发成本**：设计/实现/联调/测试/排障/文档
- **维护成本**：修 bug、追回归、处理漂移、应付双栈
- **机会成本**：把精力花在“非主路径”的功能上

WN 的策略是：

- **宁愿一次写对（强门禁）**，也不愿反复返工（回归/漂移）。
- **宁愿删旧代码**，也不愿背双栈维护债。

### 2.2 单链路原则（强制）

- 每个用户能力必须有唯一入口（唯一 UI、唯一状态机、唯一持久化）。
- 如果必须过渡：过渡期也必须有明确“删除点”（remove-by date / PR）。

**最常见的成本陷阱**：
- “先保留旧实现以防万一” → 结果永远没人删。
- “先做一个 demo UI” → 结果 demo 进入生产主路径，E2E 写不上。

### 2.3 低成本的“决策规则”（避免拉扯）

> 下面是“写作 IDE 优先级”在评审/排期时的默认判定规则。目的是减少争论，把时间留给实现与打磨。

1) **写作主路径 > 任何旁路功能**
- 写作主路径：打开项目/文档 → 输入 → 保存/恢复 → AI 可控 → 版本
- 旁路功能：主题切换、装饰性动效、非关键设置

2) **可维护性 > 代码复用**
- 不为了“以后可能复用”提前抽象。
- 只要复用会引入双路径/双状态机，就宁愿复制一小段、但保持单链路（后续再统一）。

3) **真实链路 > demo/stub**
- 任何 UI 只要进入主路径，必须接真实数据（文件、项目、AI、持久化）。
- demo 只能存在于 storybook/visual test 或者 dev-only route（且必须可被 CI guard 阻断进入主路径）。

4) **可诊断 > “先跑起来”**
- 任何 catch 都要输出可判定结果（error.code + message）。
- 任何 async pending 都必须能被取消/超时，并且清理 loading 状态（防 UI 卡死）。

---

## 3. “最高质量”来自 3 个工程闭环

### 3.1 契约闭环（防漂移）

- IPC/JSON-RPC 的类型 **必须**以 `src/types/ipc-generated.ts` 为 SSOT，并且 CI 校验阻断漂移。
- 任何新通道必须先写规范/契约，再写实现。

### 3.2 测试闭环（防回归）

**Write Mode 只认 E2E**：
- 真实 UI 交互
- 真实持久化（SQLite + 文件）
- 真实 IPC/后端

把 E2E 变成 required checks 的原因：
- 这是唯一能验证“输入不中断 + 不丢稿 + UI 状态正确”的手段。

### 3.3 观测闭环（防黑盒）

- 每个关键链路必须可观测：保存、崩溃恢复、AI run、取消、超时、模型下载等。
- 日志必须结构化（runId/requestId、error.code、latencyMs），禁止落盘 prompt 明文。

---

## 4. Write Mode 的“黄金路径”清单（必须跑通）

> 这不是愿景，是验收清单。

1. 打开项目（最近项目 / 新建）
2. 打开文件 / 新建文件
3. 进入 Write Mode（默认）
4. 输入、撤销/重做
5. 自动保存（可见状态：Saving → Saved）
6. 强制退出/崩溃 → 重启恢复
7. 触发 AI（选区 → Skill → Diff）
8. Accept/Reject（可取消、不会残留状态）
9. 版本历史可对比/可回退
10. Focus/Zen 模式切换（Esc 退出）

任何阶段的开发策略都必须围绕这条路径。

---

## 5. 具体执行策略（如何做才能“低成本+高质量”）

### 5.1 PR 粒度策略（减少联调成本）

- 每个 PR 只交付一条“可演示”的增量。
- PR 必须包含：spec/task card 更新 + RUN_LOG + 关键 E2E 证据。

推荐拆分顺序：
1) 接通真实数据（文件/项目/保存）
2) 再接通 UI（Write Mode）
3) 再接通 AI（diff/tab）
4) 最后做性能打磨与 polish

### 5.2 先删后加（避免双栈）

- 替换某组件时，优先“把旧入口切掉”，再补齐细节。
- 避免出现“新 UI 只在某个隐藏开关里”的长期并存。

### 5.2.1 Feature Flag 策略（必须短命）

Write Mode 的策略不是“不用 feature flag”，而是：
- **可以用，但必须短命**（用来做灰度/保护开发过程中不可避免的临时状态）
- 每个 flag 必须写在 task card 里，并带 remove-by（日期或 PR）
- CI SHOULD 有 guard：禁止 flag 存活超过阈值（例如 14 天）

原因：长命 flag 等价于双栈，维护成本会指数级上升。

### 5.3 “体积换体验”的明确使用场景

WN 允许：
- 随包携带本地 LLM 模型（默认 1 个推荐模型）
- 随包携带预编译 native deps
- 随包携带更多 UI 资产（字体、icon、模板）

目的：
- 减少首次启动的下载/配置摩擦
- 提升离线能力

---

## 6. Definition of Done（DoD）

任何影响 Write Mode 的任务完成，必须满足：

- [ ] 真实 E2E 覆盖（成功 + 至少 1 个边界分支：取消/超时/错误）
- [ ] 打点/日志可诊断（error.code/runId/latencyMs）
- [ ] 无双栈并存（旧入口已删除或明确 remove-by）
- [ ] 文档同步：spec/design/task card + RUN_LOG

### 6.1 Definition of Ready（DoR）

为了降低返工成本，进入实现前必须满足：
- [ ] 该能力落在 Write Mode 黄金路径的哪一步已明确
- [ ] 唯一入口/唯一状态机/唯一持久化来源已明确（SSOT 选择已写入 design/04）
- [ ] 错误语义（取消/超时/失败）已定义并能映射到 `IpcErrorCode`
- [ ] 至少 1 条 E2E 用例草案已写在 task card 里（Steps + Asserts）

---

## 7. 当前代码库中“最值得优先统一/优化”的点（明确，不泛化）

> 这些点会直接影响 Write Mode 的开发成本与质量。

1) **UI 与业务逻辑断裂（低成本高收益）**
- 现状：`writenow-frontend/src/components/*` 里存在大量 demo/stub UI（例如 `Editor.tsx`、`AIPanel.tsx`、`AppShell.tsx`）
- 同时：真实逻辑已在 `writenow-frontend/src/features/ai-panel/useAISkill.ts`、`lib/rpc/*`、`stores/*` 中存在
- 策略：优先把 demo UI 替换为“真实逻辑驱动”的 UI（这是最低成本的升级路径）

2) **E2E 未成为 required check（质量瓶颈）**
- 现状：GitHub workflow 的 `merge-serial` 仅 `lint/build`，不跑 Playwright
- 策略：对 Write Mode 相关变更，把最小 E2E 套件加入 required checks（见 `design/03-quality-gates.md`）

3) **Write Mode 未定义成 SSOT（需求漂移）**
- 现状：`writenow-spec` 仅有“专注模式快捷键”，缺少 Write Mode 形态与验收清单
- 策略：本 Sprint 把 Write Mode 的 UX、性能预算、DoD 写进 spec，并与任务卡绑定

4) **“连接层”存在两套语义（潜在漂移）**
- 现状：
  - `writenow-frontend/src/lib/rpc/client.ts`（`/standalone-rpc` invoke bridge）
  - `writenow-frontend/src/lib/rpc/jsonrpc-client.ts`（`/services/...` streaming/services）
- 风险：重连、错误处理、状态上报两套逻辑会逐步漂移，导致排障成本上升
- 策略：保留“两个 endpoint 的必要性”，但统一到 **同一套连接基类/退避策略/状态枚举**（详见 `design/04-migration-unification.md`）

5) **保存/dirty 状态尚未贯穿 UI（用户信任风险）**
- 现状：存在 `statusBarStore` / `editorFilesStore`，但 `Header`/`FileItem` 仍用 stub（例如 `AppShell.tsx` 写死 `isSaved={true}`）
- 策略：把“Saving/Saved/Error/Unsaved”贯穿到 Header、Footer、文件树 modified dot，并写入 E2E（详见 `design/01-write-mode-ux.md` + `design/03-quality-gates.md`）
