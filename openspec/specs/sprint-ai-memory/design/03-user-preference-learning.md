# 用户偏好学习系统（显式 + 隐式）

目标：让 WriteNow 的改写结果“越来越像用户本人”，同时保持 **透明可控**（可查看、可删除、可关闭）。

## 设计目标

1. **零操作个性化（默认）**：用户不需要先配置一堆规则才能得到更贴合的输出
2. **可解释**：系统能回答“为什么这次按这种风格改写”（引用偏好条目与证据）
3. **可控**：用户可以删除某条偏好、禁用自动学习、或对注入结果做回滚
4. **低成本**：注入内容是“少量高价值偏好”，而不是把历史全文塞回 prompt

## 偏好来源

### A) 显式偏好（Explicit）

- 用户在设置中手动填写的写作规则（风格指南、禁用词、标点习惯等）
- 用户对某次改写的“明确评分/备注”

### B) 隐式偏好（Implicit）

基于行为信号自动学习：
- **accept / reject / partial**（采纳/拒绝/部分采纳）
- 用户反复在同一类型 SKILL 中偏好某种表达（例如更简洁、更口语）
- 用户反复拒绝某类表达（例如“华丽辞藻/感叹号”）

## 数据模型（建议）

> 锁定：SQLite + JSON 字段（本地优先，易管理）。

### 表：`user_preferences`

| 字段 | 类型 | 说明 |
|------|------|------|
| id | text | 主键 |
| project_id | text? | 可选：项目级偏好（为空则为全局用户偏好） |
| key | text | 偏好键（例如 `tone`, `verbosity`, `punctuation.no_exclamation`） |
| value | json | 偏好值（结构化） |
| source | text | `explicit | implicit` |
| confidence | real | 0..1 |
| evidence_count | integer | 证据数量 |
| updated_at | integer | epoch ms |

### 表：`skill_run_feedback`

| 字段 | 类型 | 说明 |
|------|------|------|
| run_id | text | 对应一次 `ai:skill:run` |
| project_id | text | 项目 |
| skill_id | text | SKILL |
| action | text | `accept | reject | partial` |
| evidence_ref | json | 证据引用（文件路径/版本 diff id/段落范围等） |
| created_at | integer | epoch ms |

## 学习管线（建议）

### 1) 事件采集（Feedback Tracking）

入口：`ai:skill:feedback`（见任务卡 P1-002）

- 记录行为事件（skill/run/action）
- 提取最小证据引用（避免把全文塞 DB）

### 2) 偏好更新（Ingest）

入口：`memory:preferences:ingest`（或等价内部函数）

策略（建议）：
- accept：提升相关偏好的 `confidence` 或新增候选偏好
- reject：降低相关偏好或新增“禁用项”
- partial：作为弱信号，降低权重

> 重要：学习是“规则 + 计数 + 阈值”的渐进式系统；本 Sprint 不要求 fine-tuning。

## 注入策略（Auto Preference Injection）

入口：`ai:skill:run` 在构建 system prompt 前调用 `selectMemoryForInjection()`

选择规则（建议）：

1. 只选 Top-N（例如 5–12 条），按 `confidence` 与 `skill_type` 相关性排序
2. 总 token 预算硬限制（例如 200–600 tokens）
3. 必须确定性排序，避免 prompt 漂移

注入格式（建议）：

```
- 规则: 不使用感叹号（confidence=0.92, source=implicit）
- 规则: 句子更短更直接（confidence=0.81, source=implicit）
- 规则: 避免“竟然”这个词（confidence=1.00, source=explicit）
```

## 用户控制与透明性

- **可查看**：UI 能展示本次请求注入了哪些偏好（带来源/置信度）
- **可删除**：用户可删除某条偏好；删除后注入必须立即生效
- **可关闭**：用户可关闭“自动学习”，但保留显式偏好注入

## 失败语义（必须可判定）

- DB 不可用/读写失败：`DB_ERROR`
- 超时：`TIMEOUT`
- 取消：`CANCELED`
- 参数非法：`INVALID_ARGUMENT`

IPC 边界必须返回 `IpcResponse<T>`，不得把异常堆栈透传到 renderer（见 `api-contract`）。

