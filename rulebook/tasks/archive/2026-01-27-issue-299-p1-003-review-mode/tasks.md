## 1. Implementation
- [x] 1.1 TipTapEditor 统一挂载 AiDiff + Local LLM Tab completion（并保证 editor 实例不因 review 状态频繁重建）
- [x] 1.2 useAISkill 驱动 diff preview（showAiDiff）并提供 accept/reject API（清理 decorations + store 状态）
- [x] 1.3 Review Mode UI：AIPanel 渲染 wm-review-root + Accept/Reject；Esc=Reject
- [x] 1.4 Accept 写版本历史（version:create pre/post snapshots，actor=auto/ai）

## 2. Testing
- [x] 2.1 unit: writenow-frontend vitest 全绿（现有套件）
- [x] 2.2 e2e: 新增 Review Mode 用例（具备 WN_E2E_AI_API_KEY gate）

## 3. Documentation
- [x] 3.1 RUN_LOG：openspec/_ops/task_runs/ISSUE-299.md（记录关键命令与输出）
- [ ] 3.2 Task card 收口（PR 合并后补齐 Status/PR/RUN_LOG + 勾选验收）
