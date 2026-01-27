# 任务 001: Claude API 集成（支持中转站 + 流式响应）

## 目标

通过 Electron 主进程代理集成 Claude API，支持核心规范的 `AIConfig`（provider/baseUrl/apiKey/model），并以**流式响应**将生成内容回传渲染进程，为后续 SKILL/Diff/版本历史提供统一的 AI 调用通道。

## 依赖

- Sprint 1：编辑器与文件闭环（至少能打开并编辑一篇文档）
- 任务 002：SKILL 系统核心架构（用于以统一定义触发 AI）

## 实现步骤

1. 明确配置入口（最小闭环）：
   - 支持 `provider=anthropic`（Claude）
   - 支持 `baseUrl`（官方端点或中转站）
   - API Key 本地安全存储（渲染进程不可直接访问明文）
2. 主进程实现 AI 代理 IPC：
   - 设计 IPC 通道（例如 `ai:stream` / `ai:cancel`）
   - 在主进程内部调用 Claude SDK，并将 token/片段流式推送到渲染进程
3. 支持取消与错误处理：
   - 使用 `AbortController` 取消请求
   - 对鉴权/限流/网络错误给出明确错误码与可读信息
4. 渲染进程接入流式协议：
   - Zustand 维护请求状态（streaming/done/error/canceled）
   - UI 展示流式内容与取消按钮

## 新增/修改文件

- `electron/ipc/ai.cjs` - AI 代理 IPC（新增）
- `electron/main.cjs` - 注册 AI IPC（修改）
- `src/stores/aiStore.ts` - AI 状态管理（新增）
- `src/components/AI/*` 或 `src/components/AIPanel.tsx` - AI 面板流式展示（修改/拆分）
- `openspec/specs/sprint-2-ai/spec.md` - 对应验收口径（参考）

## 验收标准

- [ ] 可配置 `baseUrl`（支持中转站）并成功调用 Claude
- [ ] 生成内容以流式方式展示（无需等待完整返回）
- [ ] 支持取消请求，取消后不修改正文
- [ ] 失败时展示明确错误信息（禁止 silent failure）

## 参考

- 核心规范：`openspec/specs/writenow-spec/spec.md` 第 615-643 行（AIConfig + 中转站支持）
- 核心规范：`openspec/specs/writenow-spec/spec.md` 第 351-359 行（流式反馈 + 取消 + 确认机制）

