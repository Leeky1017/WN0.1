# Sprint：IDE Write Mode 任务卡片索引

## 概览

| Phase | 主题 | 任务数 | 状态 |
|-------|------|--------|------|
| P0 | 单链路统一（SSOT）+ 最小可用 Write Mode | 2 | Planned |
| P1 | Write Mode UX / 交互模型落地 | 3 | Planned |
| P2 | 真实 E2E + 性能预算门禁 | 2 | Planned |
| P3 | 打包与离线体验（体积换体验） | 1 | Planned |

**总计：8 个任务**

---

## Phase 0：单链路统一（SSOT）+ 最小可用 Write Mode

| ID | 任务 | 优先级 | 状态 |
|----|------|--------|------|
| [P0-001](p0/P0-001-write-mode-ssot.md) | Write Mode 单链路：替换 demo UI，接通真实数据/编辑器/AI | P0 | Planned |
| [P0-002](p0/P0-002-save-status-ssot.md) | 保存/连接/dirty 状态贯穿（Header/StatusBar/FileTree） | P0 | Planned |

---

## Phase 1：Write Mode UX / 交互模型落地

| ID | 任务 | 优先级 | 状态 |
|----|------|--------|------|
| [P1-001](p1/P1-001-command-palette-ui.md) | Command Palette UI（Cmd/Ctrl+K）接入真实 recent/files/skills | P0 | Planned |
| [P1-002](p1/P1-002-focus-zen-mode.md) | Focus/Zen 模式 + Esc 优先级（取消 AI / 退出 Review / 退出 Focus） | P0 | Planned |
| [P1-003](p1/P1-003-ai-review-mode.md) | Review Mode：AI Diff 可读 + Accept/Reject + 可回退 | P0 | Planned |

---

## Phase 2：真实 E2E + 性能预算门禁

| ID | 任务 | 优先级 | 状态 |
|----|------|--------|------|
| [P2-001](p2/P2-001-e2e-write-mode.md) | Playwright 真实 E2E：写作主路径 + 边界分支（取消/错误/恢复） | P0 | Planned |
| [P2-002](p2/P2-002-perf-budgets.md) | 性能预算 + 自动化测量（perf marks + E2E 断言） | P0 | Planned |

---

## Phase 3：打包与离线体验（体积换体验）

| ID | 任务 | 优先级 | 状态 |
|----|------|--------|------|
| [P3-001](p3/P3-001-packaging-offline.md) | 随包资源策略：字体/本地模型/预编译依赖 + 自动化验收 | P1 | Planned |

---

## 依赖关系图（建议）

```
P0-001 → P0-002
   ↓        ↓
P1-001 → P1-002 → P1-003
                 ↓
              P2-001 → P2-002
                 ↓
              P3-001
```

Why：先把主路径变成“真实链路”（SSOT），再把交互与 AI 做到可用，最后用 E2E/性能门禁锁住质量。

