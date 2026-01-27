# 任务 004: Diff 展示与确认机制

## 目标

实现 AI 结果的 Diff 展示与确认机制：生成结果默认以 Diff 模式显示（绿新增/红删除），并要求用户确认（接受/拒绝）后才将修改应用到编辑器正文；禁止自动替换。

## 依赖

- 任务 001：Claude API 集成（流式调用通道）
- 任务 003：基础 SKILL（提供稳定的建议稿输出）
- Sprint 1：编辑器集成（用于将接受的修改应用到正文）

## 实现步骤

1. 定义 Diff 数据结构：
   - `originalText`（原选区）
   - `suggestedText`（建议稿）
   - `status`（streaming/done/error/canceled）
2. Diff 视图组件：
   - 以统一 Diff 展示新增/删除（绿色/红色）
   - 支持流式更新（suggestedText 逐步增长）
3. 确认交互：
   - 接受：将 suggestedText 应用到编辑器选区，标记为脏
   - 拒绝：不修改正文，清理当前结果状态
4. 键盘体验：
   - `Esc` 取消当前生成
   - 生成完成后支持快捷键接受/拒绝（可选）

## 新增/修改文件

- `src/components/AI/DiffView.tsx`（或拆分现有 `AIPanel`）- Diff 组件（新增）
- `src/stores/aiStore.ts` - Diff 状态与确认动作（修改）
- `src/components/Editor/*` - 应用选区替换（修改）

## 验收标准

- [ ] Diff 模式默认开启，能清晰展示新增/删除
- [ ] 生成过程中 Diff 可流式更新
- [ ] 接受后才应用到正文；拒绝不改变正文
- [ ] 取消请求后不会写入部分结果

## 参考

- 核心规范：`openspec/specs/writenow-spec/spec.md` 第 346-359 行（结果展示 + 确认机制）

