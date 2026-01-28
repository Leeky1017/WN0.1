# P3-001: LiteLLM Proxy 多模型统一 + 缓存（可选）

Status: done  
Issue: #330  
PR: https://github.com/Leeky1017/WN0.1/pull/332  
RUN_LOG: openspec/_ops/task_runs/ISSUE-330.md

## 元信息

| 字段 | 值 |
|------|-----|
| ID | P3-001 |
| Phase | 3 - 可选能力（多模型统一） |
| 优先级 | P3 |
| 状态 | Done |
| 依赖 | P0-001（推荐：先完成 provider 原生缓存与观测） |

## 必读前置（执行前必须阅读）

- [x] `openspec/specs/sprint-open-source-opt/spec.md`
- [x] `openspec/specs/sprint-open-source-opt/design/05-litellm-proxy.md`

## 目标

- 为多模型支持提供统一入口：路由、缓存、fallback、观测。
- 保持默认路径不依赖 Proxy；启用时必须单链路（不双栈并存）。

## 任务清单

- [x] 明确桌面端引入方式：外置 Proxy（推荐）/随应用打包（不推荐默认）。
- [x] 设计配置项：`ai.proxy.enabled/baseUrl/apiKey`，并与现有 provider 配置互斥/优先级明确。
- [x] 接入 AI 请求层：当开关开启时，所有请求走 LiteLLM；否则直连 provider SDK。
- [x] 缓存策略：桌面场景磁盘缓存路径与一键清空（外置 LiteLLM 配置示例 + 文档指引）。
- [x] 观测与排障：请求延迟、错误码分布、cache hit/fallback 次数；禁止记录 prompt 明文（最小日志满足）。
- [x] E2E：
  - [x] 默认路径不需要 LiteLLM
  - [x] 启用 LiteLLM 时能跑通关键 AI 请求（通过 fake LiteLLM + CI e2e-write-mode 验证）

## 验收标准

- [x] LiteLLM 开关关闭时不需要任何额外进程（默认路径稳定）。
- [x] 开关开启时，关键请求走 Proxy，且缓存/路由行为可观测。
- [x] 失败路径有明确错误码与可重试策略。

## 产出

- 代码：LiteLLM Proxy 集成（可选开关）
  - `electron/ipc/ai.cjs`
  - `writenow-theia/writenow-core/src/node/services/ai-service.ts`
- 文档：配置说明与排障路径
  - `openspec/specs/sprint-open-source-opt/evidence/litellm-proxy.md`
  - `litellm/README.md`
- 测试：E2E 覆盖默认/开启两种模式
  - `writenow-frontend/tests/e2e/write-mode/litellm-proxy.spec.ts`
