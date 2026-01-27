# 设计概述：AI Memory Sprint

本目录是 `openspec/specs/sprint-ai-memory/spec.md` 的设计落地细化（设计先行）。目标是把“研究报告里的好点子”变成 **可实现的模块边界 + 可验证的接口**。

## 目录结构（落地点）

> 注：以下为“实现建议落地点”，用于后续任务卡验收时定位代码改动范围。

```
WriteNow/
├── writenow-frontend/
│   └── src/lib/ai/
│       ├── skill-template.ts        # SKILL prompt 模板渲染（已存在）
│       ├── context-assembler.ts     # 上下文选择/裁剪（本 Sprint 引入/增强）
│       └── stable-system-prompt.ts  # 稳定前缀模板构建（本 Sprint 引入/增强）
│
├── electron/
│   └── ipc/
│       ├── ai.cjs             # LLM 调用 / stream / run meta（prompt 字符串由 renderer 提供）
│       ├── skills.cjs         # SKILL 管理（含 context_rules）
│       ├── memory.cjs         # 用户偏好 / 记忆条目 / 学习管线
│       ├── context.cjs        # 上下文工程（full/compact、截断策略）
│       ├── characters.cjs     # 人物/设定（文件化、按需加载）
│       └── knowledgeGraph.cjs # 知识图谱（本 Sprint 设计先行）
│
├── src/types/ipc-generated.ts  # IPC 契约类型（SSOT 同步：electron/ipc/contract）
└── openspec/specs/sprint-ai-memory/
    ├── spec.md
    ├── design/
    └── task_cards/
```

## 系统架构图（数据流）

```
┌────────────────────────────────────────────────────────────────────┐
│ Renderer (writenow-frontend)                                        │
│  - 用户选中文本 → 选择 SKILL                                        │
│  - 读取 skill 定义（含 context_rules）                               │
│  - ContextAssembler: 按规则拉取 Layer 0–5（IPC 调用）                │
│  - buildStableSystemPrompt(): 生成 systemPrompt + userContent        │
│  - invoke ai:skill:run(prompt.systemPrompt, prompt.userContent)      │
└───────────────────────────────────────────────┬────────────────────┘
                                                │ IPC (invoke / stream)
┌───────────────────────────────────────────────▼────────────────────┐
│ Main Process (electron/ipc)                                        │
│                                                                    │
│  [1] skills.cjs / memory.cjs / characters.cjs / context.cjs         │
│      - 作为数据源与规则校验/持久化层                                │
│                                                                    │
│  [2] ai.cjs                                                          │
│      - 调用 LLM API（KV-cache 复用依赖 stable prefix）               │
│      - stream 输出                                                   │
│      - 记录 run meta（runId / prefixHash / promptHash / injected）   │
└───────────────────────────────────────────────┬────────────────────┘
                                                │
                                                ▼
┌────────────────────────────────────────────────────────────────────┐
│ Local persistence (本地优先)                                       │
│  - SQLite: memory/preferences, runs, summaries, indexes             │
│  - Files: .writenow/** (characters, world, style-guide, snapshots)  │
└────────────────────────────────────────────────────────────────────┘
```

## 关键策略（必须保持一致）

### 1) Progressive Disclosure（渐进式披露）

- SKILL 列表阶段：仅 `name + description`（最小元信息）
- SKILL 触发阶段：加载 SKILL.md 全指令（含 context_rules）
- 执行阶段：仅按 context_rules 拉取所需上下文（动态发现）

### 2) Stable Prefix + Append-only（KV-cache 友好）

- Layer 0–3 属于“稳定前缀”；结构与顺序 MUST 稳定
- 动态信息只允许追加到末尾（Append-only），避免缓存失效
- 所有可序列化信息 MUST 使用确定性序列化（见 `02-kv-cache-optimization.md`）

### 3) Local-first Memory（本地优先的无限记忆）

- 大内容写入文件（而不是常驻 prompt）
- prompt 中只保留路径引用 + 必要片段（并带证据引用），需要细节时再按需读取

## 术语约定

- **Layer 0–5**：上下文/记忆分层（见 `01-memory-layers.md`）
- **Full / Compact**：完整历史 vs 结构化摘要（见 `context.cjs` 相关任务卡）
- **context_rules**：SKILL 声明式上下文需求（见 `04-skill-context-injection.md`）
