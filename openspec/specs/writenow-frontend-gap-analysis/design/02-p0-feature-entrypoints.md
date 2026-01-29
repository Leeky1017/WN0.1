# Design：P0 入口补齐（知识图谱 / 人物 / 约束 / 语义搜索 / 上下文 / 大纲）

## 目标

P0 的目标是把“后端已实现但前端无入口/只读”的能力补齐到可用状态：**能打开、能看、能改（该改的）、失败可诊断、可 E2E**。

## 能力 → 通道映射（以 `writenow-frontend/src/types/ipc-generated.ts` 为准）

| 能力 | 关键通道 | UI 入口 |
|------|----------|---------|
| 知识图谱 | `kg:graph:get`, `kg:entity:*`, `kg:relation:*` | Sidebar：Knowledge Graph |
| 人物管理 | `character:list/create/update/delete` | Sidebar：Characters |
| 约束配置 | `constraints:get/set` | Sidebar：Constraints |
| Judge 状态 | `judge:model:getState`, `judge:model:ensure`, `judge:l2:prompt` | Constraints 面板 + Settings |
| 语义搜索 | `search:semantic`（配合 `embedding:index`） | Search 面板语义 Tab |
| 上下文资源 | `context:writenow:status`, `rules:get`, `settings:list/read`, `watch:*` | Sidebar：Context |
| 大纲 | `outline:get/save` | Sidebar：Outline（增强为可编辑） |

## 设计要点（共性）

- **分阶段可视化**：先保证可用（列表/表格/简易视图）再升级高级可视化（关系图、拖拽体验、联动高亮）。
- **失败路径可恢复**：所有失败必须在 UI 可见、可重试；区分 `TIMEOUT` 与 `CANCELED`。
- **连接状态清晰**：后端未连接时，面板必须进入“只读/不可用”态并给出提示（不能假装成功）。

## 2.1 Knowledge Graph 面板（最小可用）

### 最小信息架构

- 顶部：搜索框（按实体名过滤）+ “新建实体”按钮
- 主体：双栏
  - 左：实体列表（name/type/tags… 最小字段）
  - 右：关系列表或简易图（可先用列表 + 选中高亮）
- 详情抽屉：实体/关系编辑表单（JSON 字段可先 textarea）

### 关键交互

- `kg:graph:get`：用于初始加载（允许分页/增量策略后续再做）
- CRUD：创建/编辑/删除必须有确认与错误提示

### 验收重点

- 入口可发现（ActivityBar）
- CRUD 可用（至少实体）
- 错误可诊断（`DB_ERROR/INVALID_ARGUMENT` 等）

## 2.2 Characters 面板（最小可用）

### 最小信息架构

- 列表：人物名称 + 标签（可选）+ 最近更新
- 详情：人物基础字段（简介/特征/关系字段可先 JSON）
- 操作：新建/编辑/删除

### 可选增强（非 P0）

- 人物关系图（可与知识图谱复用可视化层）
- “一键插入人物名/特征到正文”

## 2.3 Constraints + Judge（最小可用）

### Constraints 配置

- 使用 `constraints:get` 拉取结构并渲染为表单
- 使用 `constraints:set` 保存（保存成功/失败必须反馈）

### Judge 模型管理（可先放 Settings，但 P0 要求至少可见）

- `judge:model:getState`：展示状态
- `judge:model:ensure`：触发下载/确保就绪
- `judge:l2:prompt`：用于查看/配置（若后端只读则 UI 明确提示）

## 2.4 语义搜索（可发现 + 可恢复）

### 必做

- Search 面板：语义 Tab 文案/提示必须清晰（解释“语义 vs 全文”差异）
- `MODEL_NOT_READY`：必须提供可操作引导（去下载模型/去重建索引）
- 点击结果：至少“打开文件”；尽可能实现“定位到片段/高亮”

## 2.5 Context 调试（上下文资源观测）

### 最小信息架构

- 状态卡：`context:writenow:status`（exists/watching）
- 规则片段：`context:writenow:rules:get`（fragments + errors）
- 设定文件：`context:writenow:settings:list/read`（文件清单 + 读取内容 + errors）
- 监听控制：`watch:start/stop`

### 安全约束

- UI 展示的文件路径必须去敏且可移植（优先 project-relative；不得泄露用户绝对路径）
- 错误详情 `details` 仅用于诊断；不得把敏感信息直接渲染到 UI

## 2.6 Outline 编辑（从只读到可编辑）

### P0 交付边界（强制）

- 允许用户编辑节点（增/删/改/排序）并保存到 `outline:save`
- 必须支持拖拽重排（最小：同层级 reorder；跨层级为后续增强）
- 与编辑器的“跳转到标题”保持兼容

### 兼容策略

- 后端返回 outline 为空时，仍可使用前端从 Markdown 解析的 fallback 进行展示
- 一旦用户进入“编辑模式”并保存，后端 outline 将成为权威来源（避免双栈漂移）

