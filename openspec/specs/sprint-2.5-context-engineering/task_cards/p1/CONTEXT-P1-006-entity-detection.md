# CONTEXT-P1-006: 实体检测（Phase 1：字符串匹配）+ Settings 预加载

## Goal

实现 Phase 1 实体检测：从 selectedText/currentParagraph/surroundingContext 中识别人物/地点等实体名（字符串匹配），并触发 SettingsLoader 预加载对应设定文件，为上下文组装提速。

## Dependencies

- `openspec/specs/sprint-2.5-context-engineering/task_cards/p1/CONTEXT-P1-005-editor-context-sync.md`
- `openspec/specs/sprint-2.5-context-engineering/task_cards/p0/CONTEXT-P0-002-writenow-project-directory-and-loaders.md`

## Expected File Changes

- Add: `src/lib/context/entity-detect.ts`
- Update: `src/stores/editorContextStore.ts`（detectedEntities）
- Update: `src/lib/context/settings-loader.ts`（支持 prefetchByEntities）
- Add: `src/lib/context/entity-detect.test.ts`
- Add: `tests/e2e/sprint-2.5-context-engineering-entity-detect.spec.ts`

## Acceptance Criteria

- [ ] 实体检测输出稳定且可解释（命中哪条规则/来源哪份 terminology）
- [ ] 命中实体后，相关人物/设定文件被预加载并可在 ContextViewer 中看到来源
- [ ] 未命中或误命中不得导致崩溃；必须可降级为不加载 Settings

## Tests

- [ ] Vitest：覆盖中英文/同名冲突/部分匹配误判等边界
- [ ] Playwright E2E：在正文输入人物名 → 触发上下文预览 → 断言对应 `.writenow/characters/<name>.md` 被注入

## Effort Estimate

- S-M（1–2 天）

