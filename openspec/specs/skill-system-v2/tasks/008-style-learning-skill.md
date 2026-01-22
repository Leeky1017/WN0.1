# 任务 008: 风格学习（作品 → 风格 SKILL，隐私优先）（P3）

Status: paused (2026-01-22; Theia migration changes the IPC/RPC transport: see `openspec/specs/sprint-theia-migration/spec.md`)

## 目标

实现“从作品学习风格”的能力：在用户明确授权范围的前提下，从历史文章/版本中提取可审计的风格摘要与约束，生成一个风格类 SKILL（或 package 内子 skill），并支持一键撤销（删除生成物与中间产物）。默认本地优先，必要时才允许云端辅助且需再次确认。

## 依赖

- 任务 004：Skill Studio（承载入口与审阅/保存）
- 任务 001：`SKILL.md` 解析与校验器（保证生成物合规）
- 任务 002：索引服务（生成后可立即生效）

## 实现步骤

1. 授权与数据范围选择：
   - Project / 选中文档 / 选定版本集（最小化默认范围）
   - 明确展示将被读取的文件列表与大小估算
2. 风格特征提取（本地优先）：
   - 生成“风格摘要”（语气/节奏/句式偏好/常用词/禁用词等）
   - 生成“可执行约束”（output constraints / forbidden patterns）
3. 生成 `SKILL.md` 候选并进入审阅：
   - 支持生成 `variants`（low tier 生成更短的风格指令）
   - 校验失败时给出明确修复建议（拆分 references / 缩短）
4. 云端辅助（可选，需二次确认）：
   - 仅当用户选择并明确提示“将上传哪些内容”
   - 默认上传“摘要/统计”而非正文；若上传正文必须逐步确认
5. 撤销与可审计：
   - 一键撤销：删除生成的 skill/package 与所有中间文件
   - 记录元信息：学习来源范围、时间、是否使用云端、hash（不存正文）
6. E2E：
   - 成功路径：选择范围 → 学习 → 保存 → 列表出现 → 可运行
   - 撤销路径：撤销后列表消失、文件被删除、索引更新
   - 边界：空数据/极少数据/超长数据/取消/超时

## 新增/修改文件

- `src/components/skills/StyleLearner.tsx`（新增）
- `src/stores/skillsStore.ts`（修改）：style learning 状态机
- `electron/services/skills/style-learning.*`（新增）：本地提取与产物写入
- `electron/ipc/skills.cjs`（修改）：`skill:styleLearn` / `skill:styleLearn:cancel`（命名可调整）
- `tests/e2e/`（新增/修改）：学习/撤销/取消/超时

## 验收标准

- [ ] 用户可在明确授权范围下生成风格 SKILL，并在确认后落盘生效
- [ ] 默认本地优先；任何云端上传都需二次确认且可解释上传内容
- [ ] 一键撤销可删除生成物与中间产物，并同步更新索引
- [ ] E2E 覆盖成功/撤销/取消/超时与极限数据分支
