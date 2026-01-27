## 1. Implementation
- [x] 1.1 P0-001（ai-memory）：扩展 SKILL frontmatter 支持 `context_rules`；解析/校验/稳定序列化并持久化
- [x] 1.2 P0-002（ai-memory）：Stable Prefix（Layer 0–3 固定顺序）与 `stablePrefixHash` / `promptHash`
- [x] 1.3 P0-001（open-source-opt）：Anthropic Prompt Caching（`cache_control: { type: 'ephemeral' }`）+ 观测/开关

## 2. Testing
- [x] 2.1 脚本/测试：`injected.refs[]` project-relative 校验 + 归一化（拒绝绝对路径/URL；排序去重回显）
- [x] 2.2 测试：同一 SKILL 在相同静态条件下 stable prefix 字节级稳定；改变动态层不影响稳定 hash

## 3. Documentation
- [ ] 3.1 Task cards：勾选验收项并补齐 `Status/Issue/PR/RUN_LOG`
- [ ] 3.2 必要时更新 `openspec/specs/writenow-spec/spec.md` 以避免“任务完成但未同步路线图”门禁
