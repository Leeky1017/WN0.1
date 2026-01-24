# 任务 010: 平台适配改写（`references/` 按需引用示例包）

Status: paused (2026-01-24; unblocked by Theia baseline; needs re-scheduling)

## 目标

交付一个用户可直接使用的“平台适配改写” SKILL（示例 package），并以此端到端验证 V2 的 `references/` progressive disclosure 机制：

- refs 元数据可用于 UI 列表（平台列表）
- refs 正文仅在用户选择平台后才按需读取并注入 Prompt
- 用户可新增 ref 文件扩展平台，无需重启

## 依赖

- 任务 001：refs slots 解析与校验
- 任务 002：refs 元数据索引与增量监听
- 任务 003：refs 可选项 IPC + 运行参数收集
- （可选）任务 004：Skill Studio refs 管理（若希望纯 UI 完成 ref 新增/编辑）

## 实现步骤

1. 提供示例 package（Builtin 或可导入）：
   - `rewrite-for-platform/skills/rewrite-for-platform/SKILL.md`
   - `rewrite-for-platform/skills/rewrite-for-platform/references/*.md`（wechat/zhihu/xhs/weibo 等）
2. 定义 ref slot（例如 `platform`）：
   - UI 运行前展示平台列表（来自 refs 元数据）
   - 选择平台后才读取该 ref 正文并注入 Prompt（Context Viewer 可见来源与 token）
3. Prompt 注入与预算策略：
   - refs 注入放入动态区（避免破坏稳定前缀）
   - 超预算时优先选择 low-tier variant / 关闭可选上下文层；仍超限则以 `INVALID_ARGUMENT` 失败并提示缩短 refs
4. 可扩展性：
   - 新增 `references/my-blog.md` 后，平台列表增量更新
5. E2E（真实 UI + 真实持久化）：
   - 选择不同平台分别运行并进入 Diff→确认闭环
   - 新增一个 ref 文件后，平台列表出现新条目并可运行
   - 预算失败分支可观测（错误码/提示明确，loading 状态清理）

## 新增/修改文件

- `electron/services/skills/`（修改）：refs 元数据扫描与正文按需读取接口
- `electron/ipc/skills.cjs`（修改）：refs:list + run 参数传递
- `src/components/AIPanel.tsx` / `src/stores/aiStore.ts`（修改）：运行前参数选择与 refs 注入
- `openspec/specs/skill-system-v2/design/skill-package.md`（已定义结构，按实现落地）
- `tests/e2e/`（新增/修改）：平台适配 refs 的端到端用例

## 验收标准

- [ ] 平台适配 SKILL 可用：运行前显示平台列表，选择后改写成功并进入 Diff→确认→应用
- [ ] refs 正文只在用户选择平台后才被读取并注入（progressive disclosure）
- [ ] 用户新增 ref 文件后平台列表自动更新，无需重启
- [ ] 超预算分支失败可观测且可恢复（错误码明确、loading 状态清理）
- [ ] E2E 覆盖成功路径 + 新增 ref + 超预算/取消等关键边界
