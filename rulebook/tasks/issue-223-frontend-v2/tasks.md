# Tasks: ISSUE-223 — Sprint Frontend V2 (P0–P6)

> Scope source of truth:
> - `openspec/specs/sprint-frontend-v2/spec.md`
> - `openspec/specs/sprint-frontend-v2/task_cards/**`

## 1. Implementation
- [ ] 1.1 纠察并修复 P0–P1 现有实现的规范偏离（技术栈版本/Design Tokens/shadcn/ui/RPC/文件树/布局持久化）
- [ ] 1.2 P2：TipTap 编辑器迁移（打开/编辑/保存 + 多标签/dirty + 分屏 + 工具栏 + 双模式 + 导出）
- [ ] 1.3 P3：AI 面板迁移（对话 + 流式输出 + 取消 + Diff + 斜杠命令）
- [ ] 1.4 P4：cmdk 命令面板 + 设置面板 + 主题切换（持久化）
- [ ] 1.5 P5：版本历史面板（list/diff/restore）+ Toast 通知（sonner）+ 全局快捷键系统
- [ ] 1.6 P6：electron-vite 集成 + 主进程启动 Theia 后端 + electron-builder 打包配置

## 2. Testing (must run; no fake/stub)
- [ ] 2.1 `writenow-frontend`: `npm run lint` + `npm run build`
- [ ] 2.2 真机联调：启动 Theia 后端后，`writenow-frontend` 可连接 `ws://localhost:3000/standalone-rpc` 并完成文件读写/AI 调用
- [ ] 2.3 E2E（真实 Electron + 真实持久化）：覆盖“新建→打开→编辑→自动保存→手动保存→主题切换→AI 调用”核心链路
- [ ] 2.4 导出/版本历史等高风险路径补充边界测试（空内容/超长内容/取消/超时/错误码分支）

## 3. Documentation / Governance
- [ ] 3.1 RUN_LOG：`openspec/_ops/task_runs/ISSUE-223.md`（只追加 Runs；更新 Status/Next Actions/Errors）
- [ ] 3.2 Task cards：相关 checklist 全部 `- [x]` + 补齐 `Status/Issue/PR/RUN_LOG`
- [ ] 3.3 若 task cards 完成项发生切换（`- [ ]`→`- [x]`），同步更新 `openspec/specs/writenow-spec/spec.md` 状态（openspec-log-guard 要求）
