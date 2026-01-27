# 02 - 编辑器性能方案（预算 / 测量 / 优化路径）

> Write Mode 的“体验上限”由编辑器性能决定：输入不卡、切换不卡、保存不卡。
>
> 本文把性能从“感觉”变成 **可量化预算**，并给出最小成本的实现策略。

---

## 1. 性能预算（Performance Budgets）

> 预算不是 KPI，是合并门禁：只要回归就必须修，或明确豁免。

### 1.1 核心预算（必须）

| 场景 | 指标 | 预算（建议） | 备注 |
|------|------|--------------|------|
| 连续输入 | Keypress → 可见字符更新 | P95 < 50ms | 以“用户体感不卡”为目标 |
| 连续输入 | 1 分钟输入期间掉帧 | 0 次明显卡顿 | 以录屏/trace 判定 |
| 文件切换 | 点击文件 → 编辑器可输入 | < 200ms（小文档） | 小文档：< 50KB |
| 文件切换 | 点击文件 → 编辑器可输入 | < 800ms（大文档） | 大文档：~500KB |
| 自动保存 | 停止输入 → Saved 指示 | < 1500ms | 可被配置/节流 |
| 启动 | Launch → 可输入 | < 3s（冷启动） | 桌面优先 |

> 预算解释（避免“数字拍脑袋”）：
> - 50ms（P95）是“主观不卡”的经验阈值：超过后用户会感到输入被拖拽。
> - 200ms 文件切换属于 IDE 的“立即响应”范围；800ms 属于“可接受但需要优化”。
> - 冷启动 3s 是“打开就能写”的下限；超过后必须通过预热/延迟加载拆解。

### 1.2 极限规模（必须写清阈值）

- 项目规模：
  - 目标：1k 文件（可用）
  - 极限：10k 文件（不崩溃，允许降级）
- 单文档规模：
  - 目标：100k 字符（可用）
  - 极限：1M 字符（不崩溃，允许只读/分段加载策略）

> 注：具体阈值可随真实用户数据调整，但必须写进 spec 并可回归验证。

---

## 2. 测量方法（必须可自动化）

### 2.1 最低成本的“自动化测量”策略

- 在 Renderer 内打点：`performance.mark()` / `performance.measure()`
- 在 E2E 中读取窗口内的统计结果（通过 `page.evaluate` 获取）
- 失败即保存：Playwright trace + screenshot + 本地日志

### 2.1.1 建议最小实现（代码示例）

在 renderer 内提供一个只在 E2E 模式启用的 “perf bridge”，让 Playwright 能读取指标：

```ts
declare global {
  interface Window {
    __WN_PERF__?: {
      measures: Record<string, number>
    }
  }
}

export function wnPerfMeasure(name: string, startMark: string, endMark: string) {
  performance.measure(name, startMark, endMark)
  const entry = performance.getEntriesByName(name).slice(-1)[0]
  if (!entry) return
  window.__WN_PERF__ ??= { measures: {} }
  window.__WN_PERF__.measures[name] = entry.duration
}
```

Playwright 读取：

```ts
const perf = await page.evaluate(() => window.__WN_PERF__?.measures ?? {})
expect(perf['wm.file.open']).toBeLessThan(200)
```

Why：这比引入专门的性能框架成本更低，但足以阻断回归。

### 2.2 建议的测量点

1) **编辑器就绪**
- mark：`wm.editor.mount.start` / `wm.editor.ready`

2) **文件切换**
- mark：`wm.file.open.click` / `wm.file.open.ready`

3) **自动保存**
- mark：`wm.save.schedule` / `wm.save.done`

4) **AI 取消清理**（性能 + correctness）
- mark：`wm.ai.cancel.request` / `wm.ai.cancel.cleared`

---

## 2.3 性能基线环境（避免“测了但没意义”）

为了让数据可比较，必须固定最小基线：

- Electron：production build（不要在 dev server 上测）
- 硬件：至少在 CI 环境 + 1 台本地基线机（例如 mac M1 / win i5）
- 文档样本：
  - small：10KB / 2k 字符
  - medium：200KB / 50k 字符
  - large：500KB / 100k 字符
- 项目样本：
  - 1k 文件（目标）
  - 10k 文件（极限）

策略：CI 只跑 small/medium（成本可控）；每周/每次 release 跑 large/10k（防止慢性退化）。

---

## 3. TipTap 性能策略（Write Mode 主编辑器）

### 3.1 关键原则

- **Editor 实例生命周期稳定**：避免因为 React state 变化导致 TipTap 重建。
  - 现有实现：`TipTapEditor.tsx` 使用 `useMemo` + `useEditor`，方向正确。

- **外部内容更新必须避免反馈环**：
  - 现有实现：`isApplyingExternalUpdateRef` 已避免“setContent → onUpdate → setState → setContent”。

### 3.2 必须避免的高成本模式

1) 在 `onUpdate` 里做重计算（diff、搜索索引、长文本序列化）
- 解决：只做最小事件派发；重计算放到 debounce/worker/后端。

2) 用 state 驱动每次字符变动的 React rerender
- 解决：TipTap 内部处理输入；React 只监听“高层事件”（保存状态、模式切换）。

3) 大范围 Decorations
- 解决：AI diff 只作用于 selection 范围；删除 widget 控制数量；必要时降级为 panel-only diff。

### 3.3 “主线程预算”的工程策略（最低成本）

写作主路径的性能问题几乎都来自“主线程被占满”。最低成本的策略是把重活移出热路径：

- **序列化（Markdown）**：不要在每次字符变动都序列化全文
  - 做法：onUpdate 只标记 dirty；在 debounce timer 触发时再取 markdown 并保存
- **diff 计算**：只在 AI run 完成后计算；且只针对 selection 范围（不要对全文 diff）
- **索引/搜索**：写作时不实时重建，改为 idle/后台任务（或由后端负责）

可用工具（不引入新技术栈）：
- `requestIdleCallback`（fallback 到 `setTimeout`）在空闲时做轻量任务
- debounce（800–1200ms）控制保存频率

---

## 4. 保存策略（性能与可靠性的折中）

### 4.1 原则

- **输入不等待保存**：保存必须异步。
- **可见状态**：Saving/Saved/Error 必须在 UI 有明确反馈。

### 4.2 建议实现（最低成本）

- debounce 自动保存：例如 800–1200ms（根据体验调）
- 保存触发源：TipTap markdown 变化（`onMarkdownChanged`）
- 保存执行地：后端/主进程（文件 I/O 不在 renderer）

### 4.3 保存链路的“关键不变量”（Why）

1) **永远不阻塞输入**
- 保存失败也不阻塞：失败只改变状态（Error）并提供重试

2) **保存状态必须可判定**
- `Unsaved`：内容已变更但尚未安排保存
- `Saving`：已发起保存（在飞）
- `Saved`：确认落盘成功
- `Error`：落盘失败（必须带 error.code + 可读信息）

3) **保存的竞态必须可控**
- 如果用户在 `Saving` 期间继续输入：允许合并为下一次保存（最终一致即可）
- 文件切换时：必须 flush 或明确提示“未保存”（根据策略）

这些不变量将直接影响 E2E 的断言与可靠性。

---

## 5. 大文档策略（必须有降级）

### 5.1 分层降级

- L1：禁用重型扩展（如复杂 diff decoration），仅保留基础编辑
- L2：对大文档启用“只读模式 + 分段编辑”
- L3：提示用户拆分文档（提供自动拆分工具）

### 5.2 降级触发规则

- 依据：字符数、节点数、渲染耗时
- 触发必须可见：UI 提示“性能模式已开启”（避免用户困惑）

---

## 6. 写作体验相关的“性能细节”（不做会显著掉体验）

> 这些点不一定写在代码里，但必须写进执行策略，否则会在后期返工。

1) **布局动画避免触发重排**
- `width` 动画会触发 layout reflow；如果侧栏/AI Panel 在输入过程中频繁开合，会明显卡顿
- 策略：对频繁动作优先 transform（GPU compositing）；width 动画只在低频场景使用

2) **编辑器容器避免多层滚动**
- 双滚动（EditorContent + 外层）会导致 wheel/scroll handler 冲突与性能抖动
- 策略：确保 editor scroll container 唯一且稳定

3) **字体与渲染**
- serif 字体是体验加分项，但要避免过多 font weight/variant 导致首次渲染卡顿
- 策略：随包只带 1–2 个字体家族；其余按需加载（体积允许，但渲染要可控）

---

## 7. “体积换性能”的允许项

因为安装包体积不设上限，WN 可以用更激进的方式换体验：

- 随包携带本地 LLM 模型（减少首次下载，提升离线体验）
- 随包携带预编译 native deps（减少安装与运行时编译）
- 更强的字体与排版资产（提升写作质感）

这些项必须以“不影响输入性能”为前提，且必须可测。
