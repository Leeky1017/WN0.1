## 1. Implementation
- [x] 1.1 定义评估数据集：建立 1 个项目样本（人物/地点/事件/时间点），并落盘为可复现的 seed（SQLite）。
- [x] 1.2 SQLite 图模拟 PoC：实体检索（name/description）、关系扩展（1-hop/2-hop）、时序字段模拟（`metadata_json.valid_from/valid_to/source`）。
- [x] 1.3 基准与指标：为关键查询输出延迟统计（P50/P95）与资源占用的最小可复现记录。
- [ ] 1.4 （可选）Graphiti 最小 PoC：跑通 episode 插入 + 查询，并记录依赖/运行方式/资源占用。

## 2. Testing
- [x] 2.1 本地运行 SQLite 图模拟 PoC，产出可复现输出并写入 RUN_LOG（命令 + 关键输出 + 证据路径）。
- [ ] 2.2 运行 `npx openspec validate --specs --strict --no-interactive` 与 `rulebook task validate issue-327-p2-002-graphiti-eval` 并记录证据。

## 3. Documentation
- [x] 3.1 输出评估报告：`rulebook/tasks/issue-327-p2-002-graphiti-eval/evidence/graphiti-eval.md`
- [ ] 3.2 更新 task card 验收勾选与完成元信息（Status/Issue/PR/RUN_LOG）
- [x] 3.3 更新 `openspec/_ops/task_runs/ISSUE-327.md`（Runs 只追加不回写）
