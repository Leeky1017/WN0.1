# Codex Sprint 4 启动指南 (可与 Sprint 1 并行)

## 任务来源

- 规范: `openspec/specs/sprint-4-release/spec.md`
- 任务卡: `openspec/specs/sprint-4-release/tasks/`

请先阅读上述规范和任务卡, 按任务卡顺序执行。

---

## 依赖与前置条件

- Phase 0.5 基础设施已完成
- 不依赖 Sprint 1 编辑器, 可并行执行

---

## P0.5 已提供的能力

| 能力 | 模块 | 说明 |
|------|------|------|
| 配置 | `electron/lib/config.cjs` | 存储更新/语言偏好 |
| 日志 | `electron/lib/logger.cjs` | 记录更新日志 |
| IPC 框架 | `electron/main.cjs` | createInvokeHandler 已就绪 |

---

## 必读文档

- `AGENTS.md` - 宪法级约束
- `openspec/specs/api-contract/spec.md` 第 540-605 行 (update:*)
- `openspec/specs/writenow-spec/spec.md` 第 458-530 行 (导出/更新/i18n)

---

## 关键提示

1. electron-updater 开发模式下无法真正测试, 需打包后测试
2. 使用 GitHub Releases 作为更新源
3. i18n 使用 i18next + react-i18next
4. 导出功能: Markdown 直接保存, Word 用 docx 包, PDF 用 printToPDF
5. 平台适配 MVP 阶段只做格式转换, 不做 API 直发

---

## 验收标准

见 `openspec/specs/sprint-4-release/spec.md` 中的 Requirements/Scenario
