# Spec Delta: sprint-ide-advanced (Issue #103)

## Purpose

为后续 IDE-Advanced 实现提供 spec-first 的单一事实来源：将“客观工具赋能，不做主动判断”的产品护栏固化为可验收条款，并将 P0 范围拆解为可落地的需求（时间线可视化、人物出场追踪、大纲-正文双向同步、风格样本库）。

SSOT：

- `openspec/specs/sprint-ide-advanced/spec.md`
- `openspec/specs/sprint-ide-advanced/tasks/*`

## Requirements (Index)

- Guardrails（客观呈现）
  - 展示必须可回溯证据
  - 潜在矛盾不得自动升级为“错误/警告”
  - 失败必须可观测、可重试且不阻塞写作
- Timeline Engine（时间线）
  - 支持提取/存储/可视化；条目可跳转正文证据
  - 未生成/过期状态可观测，支持显式生成/刷新
- Character Appearance Tracking（人物出场）
  - 基于人物卡 name/aliases 建索引；命中可跳转正文
  - 名称变更后支持刷新；歧义命中保持中立呈现
- Outline ↔ Body Binding（大纲-正文）
  - 双向定位；绑定失效可观测并可修复
  - 不误绑（无法判定时显示未绑定）
- Style Sample Library（风格样本）
  - 样本可保存/检索；仅用户触发的 SKILL 才允许注入
  - embedding 未就绪/失败可降级为关键词检索

## Scenarios (Executable)

- **WHEN** 系统展示时间线/出场/绑定/样本
  - **THEN** 每条信息携带证据并可跳转
- **WHEN** 存在看似冲突的事实并列
  - **THEN** 不自动提示“错误/矛盾”，仅并列呈现证据
- **WHEN** 生成/刷新失败或超时
  - **THEN** 状态可观测、可重试且不阻塞写作

## References

- `openspec/specs/sprint-ide-advanced/spec.md`
