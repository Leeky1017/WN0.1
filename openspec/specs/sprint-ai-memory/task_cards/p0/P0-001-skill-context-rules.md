# P0-001: SKILL `context_rules` 声明式注入

Status: done  
Issue: #279  
PR: https://github.com/Leeky1017/WN0.1/pull/280  
RUN_LOG: openspec/_ops/task_runs/ISSUE-279.md

## 元信息

| 字段 | 值 |
|------|-----|
| ID | P0-001 |
| Phase | 0 - 注入规则 + 稳定前缀 |
| 优先级 | P0 |
| 状态 | Done |
| 依赖 | 无 |

## 必读前置（执行前必须阅读）

- [x] `openspec/specs/sprint-ai-memory/spec.md`
- [x] `openspec/specs/sprint-ai-memory/design/04-skill-context-injection.md`
- [x] `openspec/specs/api-contract/spec.md`（IPC Envelope + 错误码）
- [x] repo-root `AGENTS.md`（交付硬约束：E2E、错误语义、留痕）

## 目标

让 SKILL 以声明式方式描述其所需上下文（`context_rules`），并由系统按需注入，避免“所有 SKILL 都塞满全部上下文”的 token 浪费与质量噪声。

## 任务清单

- [x] 扩展 SKILL frontmatter：支持 `context_rules` 字段（mapping）
- [x] 在 `skills` 的解析/校验流程中校验 `context_rules`（非法字段/非法类型返回 `INVALID_ARGUMENT`）
- [x] 将 `context_rules` 持久化到 SQLite（稳定 JSON / 结构化 JSON；序列化 MUST 确定性）
- [x] renderer 的 ContextAssembler 按 `context_rules` 选择性拉取：
  - [x] surrounding（选区前后文裁剪）
  - [x] style guide / project settings（按需加载，带引用）
  - [x] characters（按需加载，带引用）
  - [x] recent summary（按需加载）
- [x] 为“注入结果”提供可审计的最小元数据（例如注入项 ID / 文件引用列表）
- [x] 增加验证：脚本/单测覆盖 refs 校验与 stable prefix 约束（见 RUN_LOG）

## 验收标准

- [x] `context_rules` 缺失时：MUST 使用稳定默认值（等价于 schema 默认：不注入额外上下文）
- [x] `context_rules` 非法时：返回 `IpcResponse.ok=false` 且 `error.code="INVALID_ARGUMENT"`（无异常堆栈泄漏）
- [x] 相同 SKILL 在相同输入下，注入选择结果可复现（排序/裁剪稳定）
- [x] E2E 覆盖：至少包含“润色/扩写/一致性检查”三类 SKILL 的注入差异路径
- [x] 注入差异可观测：`injected.refs[]`/`injected.contextRules` 回显且 refs 为 project-relative

## 可观测信号 / 验证方式

- `context_rules` 解析结果必须可审计：
  - DB 中存储稳定序列化后的 `skills.context_rules`（key 顺序固定）
  - 运行时可读取到本次生效的规则（例如 `injected.contextRules` 或等价调试输出）
- 注入差异必须可观测：
  - `ai:skill:run` 的 start 响应或 run meta MUST 返回 `injected.refs[]`（project-relative 引用）
  - `injected.refs[]` MUST NOT 包含绝对路径

## E2E 场景（建议步骤）

- [ ] 准备：创建测试项目并写入 `.writenow/style-guide.md` 与 `.writenow/characters/zhangsan.md`
- [ ] 创建/选择 2 个 SKILL：
  - [ ] A：`context_rules: { style_guide: true, characters: false, surrounding: 200 }`
  - [ ] B：`context_rules: { style_guide: true, characters: true, surrounding: 200 }`
- [ ] 在编辑器选中一段包含“张三”的文本并分别运行 A/B
- [ ] 断言：
  - [ ] A 的 `injected.refs[]` 不包含 characters 引用
  - [ ] B 的 `injected.refs[]` 包含 characters 引用
  - [ ] 两者的 `injected.refs[]` 均包含 style guide 引用且为 project-relative

## 产出

- `context_rules` 规范落地（解析/校验/持久化）
- renderer ContextAssembler 的按需注入实现
- E2E 测试用例与运行证据（RUN_LOG）
