# 任务 005: Pro 功能权限控制

## 目标

基于商业模型与权限矩阵实现功能 gating：在客户端对 Pro-only 功能做明确限制与升级引导，并在云端通过数据隔离策略（如 RLS）保证越权不可行；同时与订阅系统联动，保证权益实时生效/过期可控。

## 依赖

- 任务 001：Supabase Auth（用户身份）
- 任务 002：Stripe 订阅管理（订阅状态来源）
- 任务 003：云同步（需要对同步入口做 gating）

## 实现步骤

1. 权限模型（Entitlements）：
   - 将权限矩阵映射为应用内 `entitlements`（例如：`cloud_sync`、`custom_skill`、`premium_models` 等）
   - 支持状态：Free/Pro/Team（Sprint 7 可仅完整交付 Free/Pro，Team 预留）
2. 客户端 gating：
   - 对 Pro-only 入口（云同步、自定义 SKILL、高端模型等）显示锁定态与升级入口
   - 对已开启的 Pro 功能在过期时给出明确提示并停止云端写入
3. 云端强制（建议）：
   - 在 Supabase 表启用 RLS：按 `user_id` 隔离读写
   - 对需要 Pro 的写入路径增加服务端校验（例如 Edge Function 检查订阅状态）
4. 刷新与一致性：
   - 提供“刷新订阅状态/权益”动作，避免客户端缓存导致的错判
   - 权益变化必须能在应用内反映（允许短暂延迟但需可恢复）

## 新增/修改文件（建议）

- `src/stores/entitlementsStore.ts` - 权益计算/刷新（新增）
- `src/components/common/ProGate.tsx` - 统一的 Pro 锁定态组件（新增）
- `src/components/settings/BillingSection.tsx` - 升级/管理订阅入口（修改）
- `supabase/migrations/*` - RLS/表结构（新增，若采用 Supabase CLI 管理）

## 验收标准

- [ ] Free 用户访问 Pro-only 功能会被显式阻断，并提供升级入口
- [ ] Pro 用户权益可生效，订阅过期后权益可被正确回收并提示续费
- [ ] 云端数据按用户隔离，越权不可行（至少策略明确且可验证）

## 参考

- Sprint 7 规范：`openspec/specs/sprint-7-cloud/spec.md`
- 核心规范：`openspec/specs/writenow-spec/spec.md` 第 552-578 行（套餐/权限矩阵）
