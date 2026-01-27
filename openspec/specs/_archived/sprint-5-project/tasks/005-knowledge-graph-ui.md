# 任务 005: 知识图谱可视化基础

## 目标

实现知识图谱的基础可视化与最小交互：在 UI 中展示项目图谱的节点与边，支持平移/缩放、选择查看详情，并打通最小编辑入口（新增节点/新增关系）与持久化。

## 依赖

- 任务 004：知识图谱数据库设计（必须能加载 nodes + edges 并写入变更）
- 任务 001：项目上下文

## 实现步骤

1. 可视化选型（Sprint 5 选其一落地即可）：
   - A. React Flow（`@xyflow/react`）快速搭建交互图编辑
   - B. D3 force / 自研 canvas/svg（更可控，但工程量更大）
2. UI 结构：
   - 主画布：节点/边渲染 + 平移/缩放
   - 右侧详情面板：展示选中节点/边的字段与关系摘要
3. 数据流：
   - 进入视图时按 `project_id` 加载 nodes + edges
   - 选择节点/边时加载详情（可复用全量数据或按需 query）
4. 最小编辑闭环：
   - 新增节点：填写 name/type/description → 调用 `kg:entity:create`
   - 新增关系：选择 from/to/type → 调用 `kg:relation:create`
   - 创建成功后刷新图谱并保持选中态
5. 状态管理：
   - Zustand 维护：graph load 状态、选中对象、编辑弹窗状态、错误提示

## 新增/修改文件

- `src/components/KnowledgeGraph/*` - 图谱视图组件（新增）
- `src/stores/knowledgeGraphStore.ts` - 图谱状态（新增）
- `src/lib/knowledgeGraph/layout.ts`（可选）- 初始布局策略（新增）
- `src/components/Sidebar/*` - 增加知识图谱入口（若任务 001 未覆盖）（修改）

## 验收标准

- [ ] 可加载并渲染当前项目的 nodes + edges（支持平移/缩放）
- [ ] 选择节点/边可查看摘要信息
- [ ] 支持新增节点与新增关系，并能持久化（重启后仍存在）
- [ ] 失败时展示明确错误信息（禁止 silent failure）

## 参考

- 核心规范：`openspec/specs/writenow-spec/spec.md` 第 282-312 行（知识图谱：关系可视化与应用场景）
- 核心规范：`openspec/specs/writenow-spec/spec.md` 第 884-889 行（Sprint 5 范围：知识图谱基础）

