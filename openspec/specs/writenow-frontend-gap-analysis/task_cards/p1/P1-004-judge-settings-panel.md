# P1-004: Judge 模型管理（Settings）

Status: pending

## Goal

在 Settings 中提供 Judge（L2 本地模型约束检查）的可发现入口，使用户可以：

- 查看模型状态（`judge:model:getState`）
- 触发确保模型就绪（`judge:model:ensure`）
- 查看/配置 L2 prompt（`judge:l2:prompt`，按后端能力决定读写）

## Dependencies

- `openspec/specs/writenow-frontend-gap-analysis/spec.md`
- `openspec/specs/writenow-frontend-gap-analysis/design/03-p1-custom-skill-conversations-memory-judge.md`
- `openspec/specs/api-contract/spec.md`

## Expected File Changes

| 操作 | 文件路径 |
|------|---------|
| Add | `writenow-frontend/src/features/settings/sections/JudgeSection.tsx`（或等价合并到 AiSection） |
| Update | `writenow-frontend/src/features/settings/sections/index.ts` |
| Update | `writenow-frontend/src/features/settings/SettingsPanel.tsx` |
| Update | `writenow-frontend/src/locales/zh-CN.json` |
| Update | `writenow-frontend/src/locales/en.json` |
| Add | `writenow-frontend/tests/e2e/write-mode/judge-settings.spec.ts` |

## Acceptance Criteria

- [ ] Settings 中存在 “Judge” 区域（可发现，且 i18n 完整）
- [ ] 展示 `judge:model:getState`：
  - [ ] 未就绪/下载中/就绪/错误等状态可读
- [ ] “确保模型就绪”按钮：
  - [ ] 调用 `judge:model:ensure`
  - [ ] 过程有 loading 状态，完成后有明确反馈
- [ ] `judge:l2:prompt`：
  - [ ] 至少可查看当前 prompt（若支持写入则提供保存）
  - [ ] 参数错误时展示 `INVALID_ARGUMENT` 且不丢失用户输入
- [ ] 错误语义清晰：`TIMEOUT` / `CANCELED` 区分并可重试

## Tests

- [ ] Playwright E2E：打开 Settings → 找到 Judge 区域 → 展示模型状态（或明确“后端未连接”提示）
- [ ] Playwright E2E：点击 ensure（至少验证按钮存在与链路不崩）

