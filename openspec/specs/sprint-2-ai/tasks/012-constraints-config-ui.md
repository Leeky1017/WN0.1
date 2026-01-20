# 任务 012: 约束配置 UI

## 目标

提供约束规则配置界面，支持全局和项目级两种作用域，配置持久化到本地数据库 settings 表，并遵循“项目级覆盖全局级”的优先级规则。

## 依赖

- 任务 006：Judge 层架构与接口定义（约束规则类型）

## 实现步骤

1. 状态管理：
   - 创建 `src/stores/constraintsStore.ts`，维护约束配置（全局/项目级）与持久化/加载流程。
2. 设置面板：
   - 创建 `src/components/Settings/ConstraintsPanel.tsx`，提供可编辑的配置项：
     - 禁用词列表
     - 术语表
     - 语气偏好
     - 字数范围（最小/最大）
     - L2 开关
3. 持久化与优先级：
   - 配置持久化到 settings 表
   - 项目级配置覆盖全局配置（优先级更高）

## 新增/修改文件

- `src/stores/constraintsStore.ts` - 约束配置 Zustand store（新增）
- `src/components/Settings/ConstraintsPanel.tsx` - 约束配置面板（新增）

## 验收标准

- [ ] 配置 UI 可用
- [ ] 配置持久化
- [ ] 项目级覆盖全局级

## 参考

- Sprint 2 规格：`openspec/specs/sprint-2-ai/spec.md`（约束规则 MUST 可配置并持久化）
