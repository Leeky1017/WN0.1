# 00 - 整体优化策略概述

本 Sprint 目标：用成熟开源/第三方方案 **降低成本 + 提升体验 + 提升可测试性**，并保持 WriteNow 的“本地优先”产品定位。

> 记忆层：本 Sprint **不重复定义**。统一以 `openspec/specs/sprint-ai-memory/spec.md` 为准。

---

## 范围与分期

| Phase | 主题 | 任务卡 |
|------:|------|--------|
| P0 | LLM 成本优化 | `task_cards/p0/P0-001-prompt-caching.md` |
| P1 | 编辑器 AI 体验（Diff/Suggestion） | `task_cards/p1/P1-001-ai-diff-extension.md` |
| P1 | 本地 LLM Tab 续写（离线、零 API 成本） | `task_cards/p1/P1-002-local-llm-tab.md` |
| P2 | 质量门禁（核心用户路径 E2E） | `task_cards/p2/P2-001-e2e-playwright.md` |
| P2 | 知识图谱方案评估（Graphiti） | `task_cards/p2/P2-002-graphiti-eval.md` |
| P3 | 多模型统一（可选） | `task_cards/p3/P3-001-litellm-proxy.md` |

---

## 总体架构（高层）

```
┌───────────────────────────────────────────────────────────────────────────┐
│ WriteNow (Electron App)                                                   │
│                                                                           │
│  ┌──────────────────────────────┐              ┌───────────────────────┐ │
│  │ Renderer (writenow-frontend)  │              │ Local persistence      │ │
│  │ - TipTapEditor                │              │ - SQLite (projects,   │ │
│  │ - AI Panel / SKILL UI         │              │   versions, kg, ...)  │ │
│  │ - Local LLM Tab ghost text    │              └───────────────────────┘ │
│  └───────────────┬──────────────┘                         ▲              │
│                  │                                         │              │
│                  │ WebSocket JSON-RPC / IPC invoke          │              │
│                  ▼                                         │              │
│  ┌──────────────────────────────┐                         │              │
│  │ Backend / Main services       │                         │              │
│  │ - AI request proxy (provider) │                         │              │
│  │ - Prompt Caching enablement   │                         │              │
│  │ - Local LLM service (optional)│                         │              │
│  │ - Knowledge graph (SQLite)    │                         │              │
│  └───────────────┬──────────────┘                         │              │
│                  │                                         │              │
│                  │ Cloud LLM (optional via LiteLLM)         │              │
│                  ▼                                         │              │
│  ┌───────────────────────────────────────────────────────┐ │              │
│  │ Provider APIs                                          │ │              │
│  │ - Anthropic / OpenAI native Prompt Caching              │ │              │
│  │ - (Optional) LiteLLM Proxy: routing + caching + fallback│ │              │
│  └───────────────────────────────────────────────────────┘ │              │
└───────────────────────────────────────────────────────────────────────────┘
```

---

## 核心决策与原则

### 1) 先用 Provider 原生 Prompt Caching（不自建缓存）

- Why：实现成本极低、收益极高；并且避免“缓存一致性/过期/隐私”带来的自建负担。
- How：Anthropic 通过 `cache_control: { type: 'ephemeral' }` 显式开启；OpenAI 通过稳定前缀结构获得自动缓存收益。

### 2) 编辑器 AI 交互自研（基于 TipTap/ProseMirror）

- Why：WriteNow 已具备 streaming；核心缺口是“**可控的差异呈现 + 可恢复的应用语义**”。
- How：TipTap Extension + ProseMirror Plugin/Decorations 表达 diff，并提供 commands（accept/reject/clear）。

### 3) 本地 LLM 续写走 node-llama-cpp（可选下载模型）

- Why：Tab 续写属于高频短输出，云端成本高且网络依赖强；本地模型可提供“离线可用”差异化。
- How：本地推理在主进程/后端服务侧执行；Renderer 仅做 UI 与取消语义；模型下载需明确用户同意。

### 4) 质量门禁以 E2E 为主

- Why：写作 IDE 的关键价值是“可用 + 稳定 + 不丢稿”。
- How：Playwright 驱动 Electron / UI，走真实持久化与真实 IPC（禁止 stub）。

---

## 不在本 Sprint 解决的问题（Non-goals）

- 记忆层架构/数据模型/注入策略：见 `openspec/specs/sprint-ai-memory/spec.md`。
- 新增第二套 AI 通道实现（双栈并存）：任何引入必须替换旧路径或明确 feature-flag 为唯一入口。
- 大规模重写现有上下文工程或技能系统：本 Sprint 聚焦“成本/交互/可测试性”的增量。
