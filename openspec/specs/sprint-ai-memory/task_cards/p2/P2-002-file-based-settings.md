# P2-002: 人物/设定文件化存储按需加载

## 元信息

| 字段 | 值 |
|------|-----|
| ID | P2-002 |
| Phase | 2 - 长会话支撑 |
| 优先级 | P1 |
| 状态 | Pending |
| 依赖 | P0-001 |

## 必读前置（执行前必须阅读）

- [ ] `openspec/specs/sprint-ai-memory/design/01-memory-layers.md`（Layer 3 定义）
- [ ] `openspec/specs/sprint-ai-memory/design/04-skill-context-injection.md`
- [ ] `electron/ipc/characters.cjs`

## 目标

将人物卡/世界观/风格指南等大设定以文件形式持久化，并在 SKILL 需要时按需加载与裁剪；prompt 中默认只注入“引用 + 必要片段”，避免常驻上下文导致成本飙升与噪声增加。

## 任务清单

- [ ] 定义项目内设定文件规范（目录/命名/格式，例如 `.writenow/characters/*.md|json`）
- [ ] characters.cjs 支持“按需读取 + 摘要/片段裁剪 + 引用返回”
- [ ] 与 `context_rules` 联动：只有声明 `characters/style_guide` 的 SKILL 才加载
- [ ] 注入内容必须带证据引用（文件路径/条目 ID/范围），便于可追溯
- [ ] 增加 E2E：创建人物卡文件 → 运行需要人物设定的 SKILL → 验证按需加载与引用可观测

## 验收标准

- [ ] 大设定默认不常驻 prompt；按需加载且遵循预算裁剪
- [ ] 引用可追溯：输出/注入元数据包含来源引用
- [ ] 缺失文件/权限/IO 错误返回稳定错误码（`NOT_FOUND`/`IO_ERROR`），UI 不挂起
- [ ] E2E 通过并写入 RUN_LOG 证据

## 产出

- 设定文件规范（目录结构 + 格式）
- characters.cjs 的按需加载能力（含裁剪与引用）
- E2E 覆盖与证据

