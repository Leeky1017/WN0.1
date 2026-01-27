# P2-002: 性能预算 + 自动化测量（perf marks + E2E 断言）

## 元信息

| 字段 | 值 |
|------|-----|
| ID | P2-002 |
| Phase | P2 - 性能门禁（预算 + 回归） |
| 优先级 | P0 |
| 状态 | Planned |
| 依赖 | P2-001 |

## 必读前置（执行前必须阅读）

- [ ] `openspec/specs/sprint-write-mode-ide/spec.md`（性能预算 Requirement）
- [ ] `design/02-editor-performance.md`（预算 + perf bridge 建议实现）
- [ ] `design/03-quality-gates.md`（E2E 与 artifact 约定）

## 目标

把“不卡顿”变成可回归验证的工程约束：

1) 对关键链路打点并暴露到 E2E（可读指标）
2) 用 E2E 断言阻断明显回归（P95/阈值）
3) 为大文档/大项目定义降级策略（不崩溃、不长时间无响应）

## 任务清单

- [ ] 1) 定义并落地 perf marks（写入代码）
  - [ ] `wm.editor.ready`
  - [ ] `wm.file.open.start` / `wm.file.open.ready`
  - [ ] `wm.save.schedule` / `wm.save.done`
  - [ ] `wm.ai.cancel.request` / `wm.ai.cancel.cleared`
- [ ] 2) 暴露 perf measures 给 Playwright（仅 E2E 模式）
  - [ ] `window.__WN_PERF__` 或等价 bridge（见 `design/02` 代码示例）
  - [ ] 注意：不要暴露敏感信息（只暴露 duration）
- [ ] 3) 在 E2E 中加预算断言（最小集合）
  - [ ] small 文档：文件切换 < 200ms；editor ready < 200ms（示例预算）
  - [ ] autosave：停止输入后 Saved < 1500ms
- [ ] 4) 大文档降级（策略先写清、实现可分期）
  - [ ] 触发阈值：字符数/节点数/渲染耗时（写入 spec/design）
  - [ ] L1：禁用重型 decorations（diff 降级为 panel-only）
  - [ ] L2：只读/分段加载
  - [ ] L3：提示拆分 + 工具

## 验收标准

- [ ] E2E 可以读取 perf 指标并断言预算（失败即产出 trace/log）
- [ ] perf 数据不会导致业务逻辑依赖（仅测试/观测使用）
- [ ] 大文档策略至少在 UI 层可解释（用户知道发生了什么）

## 产出

- perf marks 实现（renderer）
- E2E 用例中新增 perf 断言
- 文档：`design/02-editor-performance.md` 与 spec 中预算保持一致（防漂移）

