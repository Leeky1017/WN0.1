# P1-001: 自定义 SKILL 创建/编辑（skill:write）

Status: pending

## Goal

在 `writenow-frontend` 提供创建/编辑自定义 SKILL 的入口与最小编辑器，并通过 `skill:write` 落地到后端/存储，使用户可以：

- 创建一个新技能
- 编辑已有技能
- 在 Skills 面板中启用/禁用
- 在 AI 交互中运行该技能（可发现、可追溯）

## Dependencies

- `openspec/specs/writenow-frontend-gap-analysis/spec.md`
- `openspec/specs/writenow-frontend-gap-analysis/design/03-p1-custom-skill-conversations-memory-judge.md`
- `openspec/specs/api-contract/spec.md`

## Expected File Changes

| 操作 | 文件路径 |
|------|---------|
| Add | `writenow-frontend/src/features/skills/SkillEditorDialog.tsx`（或等价） |
| Update | `writenow-frontend/src/features/skills/SkillsPanel.tsx` |
| Update | `writenow-frontend/src/features/skills/useSkills.ts`（如需扩展写入能力） |
| Update | `writenow-frontend/src/locales/zh-CN.json` |
| Update | `writenow-frontend/src/locales/en.json` |
| Add | `writenow-frontend/tests/e2e/write-mode/custom-skill-write.spec.ts` |

## Acceptance Criteria

- [ ] Skills 面板存在“新建自定义技能”入口（按钮或命令面板入口其一，建议两者都有）
- [ ] 用户可填写最小字段并提交创建，触发 `skill:write`：
  - [ ] 创建成功后回到列表并可见该技能
  - [ ] 可启用该技能（复用现有 toggle）
- [ ] 用户可编辑已存在的自定义技能并保存（仍通过 `skill:write`）
- [ ] 校验失败可诊断：
  - [ ] `INVALID_ARGUMENT` 显示可读错误
  - [ ] 保留用户输入（不得清空）
- [ ] 失败可恢复：提供重试，且不进入“卡死的 loading”

## Tests

- [ ] Playwright E2E：新建自定义技能 → 列表出现 → 启用 → 在 AI 入口中可见（至少验证 Skills 列表可刷新并存在该条目）

