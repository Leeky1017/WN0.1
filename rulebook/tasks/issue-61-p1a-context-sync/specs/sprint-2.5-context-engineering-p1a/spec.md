# Spec Delta: sprint-2.5-context-engineering-p1a (Issue #61)

## Purpose

交付 Sprint 2.5 Context Engineering 的 P1-A 增量：把编辑器即时上下文（Immediate）从 TipTap 实时同步为单一事实源；基于选区做 Phase 1 实体检测并触发 Settings 预加载；升级 PromptTemplateSystem 为可版本化的“稳定前缀 + 动态后缀”结构，确保 KV-Cache 友好与可观测。

规范 SSOT：

- `openspec/specs/sprint-2.5-context-engineering/spec.md`
- `openspec/specs/sprint-2.5-context-engineering/task_cards/p1/CONTEXT-P1-005-editor-context-sync.md`
- `openspec/specs/sprint-2.5-context-engineering/task_cards/p1/CONTEXT-P1-006-entity-detection.md`
- `openspec/specs/sprint-2.5-context-engineering/task_cards/p1/CONTEXT-P1-007-prompt-template-system.md`

## Requirements (Index)

- `CONTEXT-P1-005` EditorContextSync
  - TipTap selection/cursor/paragraph + 前后 N 段滑动窗口同步到 Immediate store
  - 默认 debounce ≤ 200ms（可配置），且高频光标移动不应造成编辑器卡顿
- `CONTEXT-P1-006` Entity Detection (Phase 1)
  - 从 selectedText/currentParagraph/surroundingContext 做轻量级字符串/正则匹配，输出可解释命中规则
  - 命中实体后触发 SettingsLoader 预加载；未命中/误命中必须可降级且不崩溃
- `CONTEXT-P1-007` PromptTemplateSystem
  - 模板具备版本字段
  - 稳定前缀不得出现动态元素（时间戳/随机数/不稳定排序）
  - Rules 渲染顺序固定且可追溯（按文件名排序并标注来源）
  - 动态后缀注入顺序严格为 Settings → Retrieved → Immediate
  - 支持 skill 差异化模板（不引入双栈/兼容路径）

## Scenarios (Executable)

- EditorContextSync
  - **GIVEN** 编辑器有多段文本
  - **WHEN** 选区变化/光标移动/段落变更
  - **THEN** store 在 debounce 窗口内更新 selectedText/currentParagraph/surroundingParagraphs
- Entity Detection + Prefetch
  - **WHEN** 选区包含人物/地点等实体名
  - **THEN** SettingsLoader 预加载对应 `.writenow/characters|settings/*.md` 并可被上下文组装命中
- PromptTemplateSystem stability
  - **WHEN** 同输入多次渲染 Prompt
  - **THEN** 稳定前缀完全一致（可用 hash 证明）；动态后缀按层级顺序变化且可追溯来源

## Constraints

- 单链路：替换旧实现，不保留“向后兼容/双栈并存”。
- 可观测失败：任何预加载/解析失败必须可定位且可降级为“不加载 Settings”，禁止 silent failure。
- TS 严格：禁止 `any`；新增/修改功能提供 JSDoc（解释 why 与失败语义）。
