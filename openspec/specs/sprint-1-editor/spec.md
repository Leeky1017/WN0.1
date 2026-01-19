# Sprint 1：可用的编辑器（1-2 周）

## Purpose

在 Sprint 1 内交付一个**可日常使用的本地编辑器**：可打开/创建/保存/删除文档；具备 TipTap 编辑能力；支持 Markdown / 富文本双模式切换；具备 2 秒防抖自动保存与崩溃恢复；并以 Zustand 作为前端状态管理的单一事实来源。

本规范是 `openspec/specs/writenow-spec/spec.md` 在 Sprint 1 范围内的可执行增量（编辑器 + 文件操作）。

## Requirements

### Requirement: 编辑器 MUST 使用 TipTap 作为内核（替换占位编辑器）

编辑器 MUST 使用 TipTap（ProseMirror）作为编辑器内核，提供可扩展的扩展体系，并为后续 AI SKILL/浮动工具栏奠定基础。

#### Scenario: 基础编辑能力可用
- **WHEN** 用户打开任意文档进入编辑区
- **THEN** 编辑器应支持基础输入、换行、撤销/重做，以及至少以下富文本能力：标题、加粗、斜体、无序/有序列表

#### Scenario: 编辑器与 React 状态联动
- **WHEN** 用户在编辑器中输入内容
- **THEN** Zustand 中的当前文档内容与“未保存”状态应同步更新（用于自动保存与状态栏展示）

---

### Requirement: 文档 MUST 支持 Markdown / 富文本双模式编辑

同一文档 MUST 可在 Markdown 与富文本两种交互模式间随时切换，并保证底层内容一致（不引入两份互相漂移的数据源）。

#### Scenario: 运行时可切换模式
- **WHEN** 用户从 Markdown 模式切换到富文本模式（或反向）
- **THEN** 文档内容应保持一致；切换不应造成明显数据丢失（在 Sprint 1 支持的节点集合内）

#### Scenario: 默认模式可配置（Sprint 1 仅打通数据通路）
- **WHEN** 应用加载并打开文档
- **THEN** 应使用可配置的默认编辑模式（若 Sprint 1 不实现设置页，则至少在代码层支持默认值与未来扩展点）

---

### Requirement: 文档 MUST 支持通过 IPC 进行真实文件保存/加载

文档持久化 MUST 真实落盘（本地优先、离线可用），并通过 Electron IPC 暴露统一的文件能力给渲染进程。

#### Scenario: 文件列表可用
- **WHEN** 用户进入应用或刷新文件列表
- **THEN** 渲染进程通过 `file:list` 获取本地文档列表，并能在侧边栏展示（按更新时间/创建时间排序）

#### Scenario: 创建/读取/保存/删除可用
- **WHEN** 用户创建新文档
- **THEN** 通过 `file:create` 创建一个新的 Markdown 文件，并返回可用于后续读写的 `path`
- **WHEN** 用户打开文档
- **THEN** 通过 `file:read` 读取内容并展示到编辑器
- **WHEN** 用户保存（自动或手动）
- **THEN** 通过 `file:write` 将内容写入磁盘，并返回明确成功结果
- **WHEN** 用户删除文档
- **THEN** 通过 `file:delete` 删除磁盘文件，并刷新文件列表

#### Scenario: 路径安全与跨平台一致
- **WHEN** 渲染进程请求读写文件
- **THEN** 主进程必须限制路径范围（仅允许文档目录内的 `.md` 文件），并对文件名进行清洗，避免路径穿越与 Windows 不合法字符

---

### Requirement: 编辑器 MUST 支持自动保存 + 崩溃恢复

编辑器 MUST 采用 Cursor/Antigravity 风格自动保存：2 秒无操作触发防抖保存；保留 `Ctrl/Cmd+S` 手动保存；状态栏实时展示保存状态；并具备崩溃恢复能力。

#### Scenario: 防抖自动保存（2 秒）
- **WHEN** 用户在已打开文档中持续输入并停止操作 ≥ 2 秒
- **THEN** 应触发一次自动保存；保存成功后状态变为“已保存”，保存失败应展示“保存失败/可重试”的明确反馈

#### Scenario: 手动保存快捷键
- **WHEN** 用户按下 `Ctrl/Cmd+S`
- **THEN** 应立即触发一次保存（忽略防抖等待），并更新保存状态

#### Scenario: 崩溃恢复（定时快照 + 启动检测）
- **WHEN** 应用非正常退出（崩溃/强制结束）
- **THEN** 下次启动时应检测到“未正常关闭”，并提示用户恢复最近一次快照
- **WHEN** 用户选择恢复
- **THEN** 应恢复到最近一次快照内容，并允许用户继续编辑与保存

---

### Requirement: 渲染进程 MUST 使用 Zustand 统一管理编辑器与文件列表状态

渲染进程 MUST 以 Zustand 作为状态管理基础，统一管理：文件列表加载状态、当前打开文档、编辑内容、脏状态、保存状态、最后保存时间、以及编辑模式切换状态。

#### Scenario: 文件列表与编辑器协同
- **WHEN** 用户创建/删除/保存文档
- **THEN** 文件列表应可刷新并反映最新状态；当前打开文档与选中状态保持一致

#### Scenario: 保存状态可观测
- **WHEN** 保存开始/成功/失败
- **THEN** Zustand 中应有可观测状态（例如 `saved/saving/error`），用于状态栏与错误提示

---

## Out of Scope（Sprint 1 不包含）

- AI 能力（Claude/OpenAI、SKILL、Diff 确认等）——属于 Sprint 2
- 全文搜索/语义搜索、SQLite FTS5 / sqlite-vec ——属于 Sprint 3
- 多格式导出（Word/PDF）与多平台发布适配 ——属于 Sprint 4

## Notes（实现约束与建议）

- 平台优先级：Windows 10/11 优先，macOS 使用 `Cmd` 替代 `Ctrl`（快捷键与路径规则注意兼容）。
- IPC 通道命名：采用 `domain:action` 形式（如 `file:list`）。
- 数据一致性：双模式编辑必须共享同一份“文档真实内容”，切换时应使用可逆/可控的转换策略（Sprint 1 可限制支持的节点集合以保证稳定）。

## References

- 核心规范：`openspec/specs/writenow-spec/spec.md` 第 405-434 行（TipTap + 双模式）
- 核心规范：`openspec/specs/writenow-spec/spec.md` 第 496-513 行（自动保存 + 崩溃恢复）
- 核心规范：`openspec/specs/writenow-spec/spec.md` 第 577-591 行（技术栈：TipTap/Electron/Zustand）
- 核心规范：`openspec/specs/writenow-spec/spec.md` 第 630-713 行（目录结构 + IPC 文件通道）
- 核心规范：`openspec/specs/writenow-spec/spec.md` 第 845-850 行（Sprint 1 范围）
