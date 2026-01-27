# Sprint Open Source Optimization 任务卡片索引

## 概览

| Phase | 主题 | 任务数 | 状态 |
|-------|------|--------|------|
| P0 | LLM 成本优化 | 1 | Pending |
| P1 | 编辑器 AI 交互 + 本地 LLM | 2 | Pending |
| P2 | 质量门禁 + 知识图谱评估 | 2 | Pending |
| P3 | 多模型统一（可选） | 1 | Optional |

**总计：6 个任务**

---

## Phase 0：LLM 成本优化

| ID | 任务 | 优先级 | 状态 |
|----|------|--------|------|
| [P0-001](p0/P0-001-prompt-caching.md) | 启用 OpenAI/Anthropic 原生 Prompt Caching | P0 | Todo |

---

## Phase 1：编辑器 AI 交互 + 本地 LLM

| ID | 任务 | 优先级 | 状态 |
|----|------|--------|------|
| [P1-001](p1/P1-001-ai-diff-extension.md) | 自研 TipTap AI Diff/Suggestion Extension | P0 | Todo |
| [P1-002](p1/P1-002-local-llm-tab.md) | 本地 LLM Tab 续写（node-llama-cpp） | P1 | Todo |

---

## Phase 2：质量门禁 + 知识图谱评估

| ID | 任务 | 优先级 | 状态 |
|----|------|--------|------|
| [P2-001](p2/P2-001-e2e-playwright.md) | 完善 Playwright E2E 覆盖核心用户流程 | P0 | Todo |
| [P2-002](p2/P2-002-graphiti-eval.md) | 评估 Graphiti 知识图谱集成（SQLite 图模拟先行） | P1 | Todo |

---

## Phase 3：多模型统一（可选）

| ID | 任务 | 优先级 | 状态 |
|----|------|--------|------|
| [P3-001](p3/P3-001-litellm-proxy.md) | LiteLLM Proxy 多模型统一 + 缓存（可选） | P3 | Todo |

---

## 依赖关系图（高层）

```
P0-001
  ↓
P1-001 ──┐
  ↓      │
P2-001   │
         │
P1-002 ──┘

P2-002 (相对独立：基于现有 KG + SQLite 图模拟)

P3-001 (可选：建议在 P0/P1 稳定后再引入)
```
