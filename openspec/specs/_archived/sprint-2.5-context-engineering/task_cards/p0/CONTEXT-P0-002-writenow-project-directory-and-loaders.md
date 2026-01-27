# CONTEXT-P0-002: `.writenow/` 项目目录结构 + Rules/Settings Loader

## Goal

实现 `.writenow/` 作为“文件系统即上下文”的标准结构：Rules 预加载缓存、Settings 按需加载、文件变更监听刷新，并对上层暴露稳定接口供 ContextAssembler 组装。

## Dependencies

- `openspec/specs/sprint-2.5-context-engineering/spec.md`
- `openspec/specs/sprint-2.5-context-engineering/task_cards/p0/CONTEXT-P0-001-context-types-and-contracts.md`

## Expected File Changes

- Add: `src/lib/context/rules-loader.ts`
- Add: `src/lib/context/settings-loader.ts`
- Add/Update: `electron/ipc/`（提供读取 `.writenow/*` 与 watch 事件的 IPC）
- Update: `electron/preload.cjs`（暴露安全的 `writenow.*` API）
- Update: `electron/main.cjs`（注册 IPC handlers）
- Add: `src/lib/context/writenow-paths.ts`（目录约定与 path helpers，避免散落字符串）
- Add: `src/lib/context/loaders.test.ts`（vitest：tmp dir 真实文件读写/监听）
- Add: `tests/e2e/sprint-2.5-context-engineering-writenow-load.spec.ts`

## Acceptance Criteria

- [ ] 项目加载时 `rules/` 全量预加载并缓存；`characters/` 与 `settings/` 默认不加载
- [ ] `.writenow/` 文件变更后自动刷新缓存；刷新结果可被 ContextViewer 观察到（来源/更新时间可追溯）
- [ ] 缺失/损坏文件时返回明确错误（禁止 silent failure），且不影响编辑器基本写作流

## Tests

- [ ] Vitest：在真实临时目录创建 `.writenow/`，验证 rules 预加载与 settings 按需加载
- [ ] Playwright E2E：创建项目目录 → 写入 `.writenow/rules/style.md` → 触发“查看上下文” → 断言 Rules 内容可见；修改 rules 文件后可见刷新

## Effort Estimate

- M（2–3 天）

