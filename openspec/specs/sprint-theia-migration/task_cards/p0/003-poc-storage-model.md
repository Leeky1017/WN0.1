# 003: PoC — 存储语义决策（userData-first vs workspace-first）

## Context

WriteNow 现状更接近 userData-first：应用托管 documents 目录与 DB，并以 `projectId` 做逻辑隔离；而 Theia 的核心语义是 workspace-first（workspace root + file explorer + watcher）。迁移的最大风险是“概念与路径不一致”导致 UI、索引、watcher、E2E 全链路重写成本失控。

## Requirements

- 基于现有实现与 Theia 语义，给出至少两种可行存储模型（userData-first / workspace-first / hybrid）。
- 做最小可运行 PoC：将某个 project root（或 Theia workspace root）与 `.writenow`、DB、markdown 文件建立一致关系，并能被 File Explorer 正确展示/编辑/保存。
- 输出决策文档：推荐方案、理由、风险、迁移策略，以及对 task cards 的影响清单。

## Acceptance Criteria

- [ ] PoC 能明确回答：File Explorer 展示什么路径？项目 root 在哪里？`.writenow` 与 DB 在哪里？
- [ ] 选定方案对 E2E 的影响被明确：如何隔离 userData/workspace、如何创建临时项目、如何验收真实持久化。
- [ ] 选定方案对索引器/watcher 的影响被明确：监听根目录、忽略规则、增量索引策略。
- [ ] 形成正式决策记录（写入 `design/storage-model.md` 或等价位置），并标明“未来变更需再次 PoC/为何不支持双栈”。

## Dependencies

- `002`（建议先确认 native + DB 可行性，再定存储语义的落地边界）

## Estimated Effort

- S–M（1–2 天；取决于 Theia workspace 接线复杂度）

