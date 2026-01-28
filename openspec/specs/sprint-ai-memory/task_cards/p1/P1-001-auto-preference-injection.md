# P1-001: 偏好自动注入到 SKILL 流程

## 元信息

| 字段 | 值 |
|------|-----|
| ID | P1-001 |
| Phase | 1 - 偏好自动化 |
| 优先级 | P0 |
| 状态 | done |
| 依赖 | P0-001, P0-002 |
| Issue | #282 |
| PR | #284 |
| RUN_LOG | openspec/_ops/task_runs/ISSUE-282.md |

## 必读前置（执行前必须阅读）

- [ ] `openspec/specs/sprint-ai-memory/design/03-user-preference-learning.md`
- [ ] `openspec/specs/sprint-ai-memory/design/02-kv-cache-optimization.md`
- [ ] `electron/ipc/memory.cjs`（现有 `memory:injection:preview` / `memory:preferences:*`）

## 目标

将用户偏好（显式 + 隐式学习）默认自动注入到每次 `ai:skill:run` 的稳定模板中，让用户“零操作”获得更贴合的输出，同时保持透明可控。

## 任务清单

- [x] 在 SKILL 运行链路中自动调用 `memory:injection:preview`（或等价接口）获取可注入偏好条目
- [x] 将偏好条目写入 stable system prompt 的“用户偏好”章节（确定性排序 + token 预算上限）
- [x] 无偏好时注入稳定空占位，避免 prompt 结构漂移
- [ ] UI 提供注入透明性入口（至少：本次注入了哪些偏好、来源、置信度）— 后续增强
- [x] 增加 E2E：创建/学习偏好后，运行 SKILL 并验证注入可观测且可关闭

## 验收标准

- [x] 默认路径无需手动“预览注入”即可运行 SKILL（自动注入）
- [x] 注入内容确定性：相同偏好集合产生稳定文本（排序/格式固定）
- [x] 用户可关闭自动注入（关闭后稳定空占位仍在，模板不漂移）
- [x] E2E 通过并写入 RUN_LOG 证据

## 可观测信号 / 验证方式

- `ai:skill:run` start 响应或 run meta 必须返回：
  - `injected.memory`（实际注入的偏好条目/引用的最小集合）
  - `stablePrefixHash`（用于观测 Layer 2 变化是否影响稳定前缀）
- UI 必须能展示“本次注入了哪些偏好”（来源/置信度/证据数）

## E2E 场景（建议步骤）

- [ ] 通过真实 IPC 写入一条偏好（例如 `memory:preferences:ingest`），并确保落盘（SQLite）
- [ ] 运行任意改写类 SKILL
- [ ] 断言：start 响应中的 `injected.memory` 非空，且 UI 可查看注入条目
- [ ] 关闭自动注入后再次运行
- [ ] 断言：`injected.memory` 为空（或仅含稳定占位），且模板结构不漂移

## 产出

- 自动偏好注入能力（renderer + memory IPC 协作）
- 注入透明性 UI（最小可用）
- E2E 覆盖与证据
