# 任务 002: Stripe 订阅管理

## 目标

实现可产品化的订阅购买与管理闭环：Pro 订阅购买（Stripe Checkout）、订阅状态同步（Webhook/服务端同步）、订阅自助管理（Customer Portal），并将订阅状态映射为应用内 Pro 权益（任务 005）。

## 依赖

- 任务 001：Supabase Auth（需要用户身份与 `user_id`）
- Stripe 账号与产品/价格（monthly/yearly）已配置
- Supabase Edge Functions（或等价后端）可用于安全持有 Stripe Secret Key 与处理 Webhook

## 实现步骤

1. 数据模型（云端）：
   - 设计 `billing_customers` / `subscriptions`（或等价）表：与 `user_id` 绑定、记录 `status/current_period_end/price_id` 等最小字段
   - 启用 RLS：用户仅能读取自己的订阅状态（写入由服务端函数/trigger 执行）
2. Checkout 入口：
   - 实现服务端函数 `billing:createCheckoutSession`：创建 Checkout Session（success/cancel 回跳）
   - 桌面端在设置页提供「升级 Pro」按钮并跳转到 Checkout
3. Webhook 同步：
   - 实现服务端 Webhook 处理：订阅创建/更新/取消/到期等事件 → upsert 到 `subscriptions`
   - 幂等保证：重复事件不会造成错误状态（基于 event id 或 subscription id 版本）
4. Customer Portal：
   - 实现服务端函数 `billing:createPortalSession`：生成 Portal Session
   - 应用内提供「管理订阅」入口，返回应用后可刷新订阅状态
5. 权益映射（与任务 005 对齐）：
   - 客户端读取订阅状态并更新 `entitlements`（可缓存但必须可刷新）
   - 订阅过期/取消应有明确提示与续费入口

## 新增/修改文件（建议）

- `supabase/functions/billing-create-checkout-session/*`（新增）
- `supabase/functions/billing-create-portal-session/*`（新增）
- `supabase/functions/billing-webhook/*`（新增）
- `src/stores/billingStore.ts` - 订阅状态加载/刷新（新增）
- `src/components/settings/BillingSection.tsx` - 升级/管理订阅 UI（新增/修改）

## 验收标准

- [ ] 用户可从应用内发起 Checkout 并完成订阅购买
- [ ] Webhook 可同步订阅状态到云端数据模型，且幂等安全
- [ ] 应用可展示当前订阅状态，并在订阅变更后可刷新为最新状态
- [ ] 用户可打开 Customer Portal 自助管理订阅

## 参考

- Sprint 7 规范：`openspec/specs/sprint-7-cloud/spec.md`
- 核心规范：`openspec/specs/writenow-spec/spec.md` 第 552-586 行（套餐/权限矩阵/后端技术栈：Stripe）
