# Storage Model Decision: userData-first vs workspace-first

> Why: `CODEBASE_REUSABILITY_VIEWPOINT.md` 指出，存储语义是迁移“真正的根问题”。在 Theia 中，workspace 与 file explorer 是一等公民；而 WriteNow 现状更接近 userData-first（应用托管项目目录 + DB 按 projectId 隔离）。本设计用于做出可落地的选择，并把影响面一次性说清。

## Goals

- 保持 WriteNow local-first，同时尽可能对齐 Theia workspace 语义，降低后续扩展与测试成本。
- 明确不同数据类别的落盘位置与生命周期（可备份、可恢复、可重建）。
- 形成可执行的决策标准与 PoC 验证清单。

## Data Taxonomy（数据分类）

- **User-scoped**：用户设置、身份/许可证、缓存、模型资产、全局索引（跨项目共享）。
- **Workspace/Project-scoped**：文稿、项目元数据、项目内技能、附件/资源等。
- **Derived（可重建）**：语义索引、预览产物、临时 embedding cache 等（允许删除后重建，但必须可观测）。

## Options

### Option 1: userData-first（应用托管项目目录）

**定义**：项目目录由应用托管在 userData/config 下（例如 `userData/projects/<projectId>/`），`.writenow/` 与 DB 也位于该目录；Theia 作为 UI/框架，但“workspace 的物理位置”由应用决定。

**优点**
- 对写作者更符合“应用管理项目”的心智模型（无需理解文件夹/工作区）。
- 更接近现有 WriteNow 结构，迁移现有项目更顺滑。

**风险/代价**
- 与 Theia workspace/file explorer 默认语义存在张力：需要决定 File Explorer 展示的是“应用托管目录”还是用户自选目录。
- workspace 可移植性较弱（仅复制 workspace 目录不一定完整）。

### Option 2: workspace-first（用户选择文件夹作为项目）

**定义**：一个项目 = 一个 workspace folder；`.writenow/`（含 DB/索引/技能/缓存）落在 workspace 内；Theia file explorer 直接展示 workspace。

**优点**
- 与 Theia 默认模型一致：File Explorer/Workspace/Watcher/FS API 全链路更自然。
- 便于导出/备份/同步/版本控制（项目目录自包含）。

**风险/代价**
- 对写作者心智负担更高（需要理解“打开文件夹/工作区”）。
- 大型缓存/模型资产放入 workspace 会引发体积与性能问题（尤其网络盘/云盘）。

### Option 3: hybrid（推荐候选）：userData 托管，但以 workspace 方式打开

**定义**：项目物理仍由应用托管在 userData 下，但 Theia 启动后自动将该目录作为 workspace 打开；File Explorer 展示该目录，用户无需手动选择文件夹。

**Why**：兼顾“写作者心智模型”与 “Theia 工程模型”，也是迁移期成本最低的折中方案之一。

## Comparison

| 维度 | userData-first | workspace-first | hybrid |
| --- | --- | --- | --- |
| 与 Theia 语义一致性 | 中（需适配） | 高 | 高（对用户隐藏） |
| 可移植/可导出 | 低（需导出工具） | 高 | 中（可提供导出工具） |
| 性能风险 | 低（集中本地） | 取决于 workspace 位置 | 低（集中本地） |
| 写作者心智负担 | 低 | 中–高 | 低 |
| E2E 隔离 | 需要 userData 隔离 | 需要 workspace 隔离 | 两者都要，但更可控 |

## Recommendation Framework（推荐决策框架）

### Default policy (recommended)

- **userData-first**：用于 heavy/shared 或 user-private 数据（模型资产、缓存、全局设置、可共享索引）。
- **workspace/project overlay**：用于必须随项目走的轻量元数据与文稿（可在 `.writenow/` 下）。
- 迁移期优先推进 **hybrid**：对用户呈现为 workspace-first，但物理位置由应用托管，避免早期 UX 成本与路径漂移。

### Decision rules

- 数据 **大且可重建** → 优先放 userData（删除后可重建，但必须可观测）。
- 数据 **跨项目共享** → 放 userData（避免重复占用）。
- 数据 **必须随项目迁移/备份** → 放 workspace（`.writenow/`）或提供导出工具。
- 迁移期禁止“双读/双写”：必须一次性迁移并替换旧路径。

## Impact Analysis

### File Explorer

- userData-first：需要决定是否允许用户浏览 userData 托管目录；可能需要自定义视图/命令（例如“打开项目”）。
- workspace-first：File Explorer 自然工作，但需要更友好的“新建项目/打开项目”引导。
- hybrid：File Explorer 看起来像 workspace-first，但项目物理位置由应用管理。

### E2E tests

- workspace-first/hybrid：E2E 可用临时目录作为 workspace root；同时通过 env/config 指定 userData 位置以隔离。
- userData-first：E2E 需要额外钩子/配置，确保每次运行使用独立的 userData/projects 根目录，避免污染。

## Recommended Next Step (PoC)

本 Sprint 的 PoC 应：

1) 在 Theia 中跑通 **hybrid** 的最小闭环：选择/创建 projectId → 定位项目根目录 → 打开为 workspace → `.md` 可编辑保存。
2) 明确禁止/延后 multi-root workspace（迁移期降复杂度）。
3) 形成决策记录：最终选择（1/2/3）、理由、风险、以及对 task cards 的影响清单。

