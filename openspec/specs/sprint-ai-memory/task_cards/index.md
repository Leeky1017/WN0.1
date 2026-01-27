# Sprint AI Memory 任务卡片索引

## 概览

| Phase | 主题 | 任务数 | 状态 |
|-------|------|--------|------|
| P0 | 注入规则 + 稳定前缀 | 2 | Pending |
| P1 | 偏好自动化 | 2 | Pending |
| P2 | 长会话支撑 | 2 | Pending |

**总计：6 个任务**

---

## Phase 0：注入规则 + 稳定前缀（P0）

| ID | 任务 | 优先级 | 状态 |
|----|------|--------|------|
| [P0-001](p0/P0-001-skill-context-rules.md) | SKILL `context_rules` 声明式注入 | P0 | Pending |
| [P0-002](p0/P0-002-kv-cache-stable-prefix.md) | KV-cache 稳定前缀模板 | P0 | Pending |

**验收标准（Phase）**：同一 SKILL 在相同静态上下文下具备字节级稳定前缀；不同 SKILL 仅注入其声明需要的上下文。

---

## Phase 1：偏好自动化（P1）

| ID | 任务 | 优先级 | 状态 |
|----|------|--------|------|
| [P1-001](p1/P1-001-auto-preference-injection.md) | 偏好自动注入到 SKILL 流程 | P0 | Pending |
| [P1-002](p1/P1-002-auto-feedback-tracking.md) | 采纳/拒绝自动追踪（反馈→学习） | P1 | Pending |

**验收标准（Phase）**：用户无需手动“预览注入”，SKILL 默认自动注入偏好；采纳/拒绝会写入可审计的反馈记录并更新偏好。

---

## Phase 2：长会话支撑（P2）

| ID | 任务 | 优先级 | 状态 |
|----|------|--------|------|
| [P2-001](p2/P2-001-full-compact-compression.md) | 历史结果 Full → Compact 压缩 | P1 | Pending |
| [P2-002](p2/P2-002-file-based-settings.md) | 人物/设定文件化存储按需加载 | P1 | Pending |

**验收标准（Phase）**：长项目在 token 预算内仍可连续运行 SKILL；大设定不常驻 prompt，按需加载并可追溯引用。

---

## 依赖关系图

```
P0-001 ──┬──> P0-002
         ├──> P1-001 ──> P1-002
         └──> P2-002

P0-002 ──> P2-001
```

