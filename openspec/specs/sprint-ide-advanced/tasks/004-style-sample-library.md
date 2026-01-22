# 任务 004: 风格样本库（存储 + 检索）

## 目标

提供“风格样本库”闭环：用户可将满意段落保存为风格样本，样本可浏览与检索，并在用户显式触发的 SKILL 中作为参考注入；支持 embedding（本地优先）以增强检索，但索引失败可降级。

## 依赖

- Sprint 3：本地 embedding 与向量存储能力（如 sqlite-vec）
- SKILL 系统的可控注入点（禁止隐式注入）

## 实现步骤

1. 样本存储：
   - 保存样本文本 + 来源证据 + 标签/备注 + 时间戳
2. 检索能力：
   - 关键词/标签检索（基础）
   - embedding 相似检索（可选增强；失败可降级）
3. 注入策略（仅用户触发）：
   - 用户选择样本后，再触发 SKILL 才允许注入
   - 注入内容必须可审计（用户可见）
4. 状态与失败语义：
   - embedding 未就绪/失败：显示状态并允许重试，不影响样本 CRUD

## 验收标准

- [ ] 用户可保存样本，且样本可在库中浏览/检索
- [ ] embedding 未就绪/失败时可降级为关键词检索，并可重试索引构建
- [ ] 样本仅在用户显式触发的 SKILL 中注入，且注入内容可见可控

## 参考

- IDE-Advanced 规范：`openspec/specs/sprint-ide-advanced/spec.md`
- Sprint 3：`openspec/specs/sprint-3-rag/spec.md`（索引/检索闭环）
- 核心规范：`openspec/specs/writenow-spec/spec.md`（外挂记忆：风格样本）
