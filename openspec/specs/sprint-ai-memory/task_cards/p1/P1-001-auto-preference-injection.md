# P1-001: 偏好自动注入到 SKILL 流程

## 元信息

| 字段 | 值 |
|------|-----|
| ID | P1-001 |
| Phase | 1 - 偏好自动化 |
| 优先级 | P0 |
| 状态 | Pending |
| 依赖 | P0-001, P0-002 |

## 必读前置（执行前必须阅读）

- [ ] `openspec/specs/sprint-ai-memory/design/03-user-preference-learning.md`
- [ ] `openspec/specs/sprint-ai-memory/design/02-kv-cache-optimization.md`
- [ ] `electron/ipc/memory.cjs`（现有 `memory:injection:preview` / `memory:preferences:*`）

## 目标

将用户偏好（显式 + 隐式学习）默认自动注入到每次 `ai:skill:run` 的稳定模板中，让用户“零操作”获得更贴合的输出，同时保持透明可控。

## 任务清单

- [ ] 在 SKILL 运行链路中自动调用 `memory:injection:preview`（或等价接口）获取可注入偏好条目
- [ ] 将偏好条目写入 stable system prompt 的“用户偏好”章节（确定性排序 + token 预算上限）
- [ ] 无偏好时注入稳定空占位，避免 prompt 结构漂移
- [ ] UI 提供注入透明性入口（至少：本次注入了哪些偏好、来源、置信度）
- [ ] 增加 E2E：创建/学习偏好后，运行 SKILL 并验证注入可观测且可关闭

## 验收标准

- [ ] 默认路径无需手动“预览注入”即可运行 SKILL（自动注入）
- [ ] 注入内容确定性：相同偏好集合产生稳定文本（排序/格式固定）
- [ ] 用户可关闭自动注入（关闭后稳定空占位仍在，模板不漂移）
- [ ] E2E 通过并写入 RUN_LOG 证据

## 产出

- 自动偏好注入能力（renderer + memory IPC 协作）
- 注入透明性 UI（最小可用）
- E2E 覆盖与证据

