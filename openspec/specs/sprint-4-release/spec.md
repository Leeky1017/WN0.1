# Sprint 4：发布准备（1 周）

## Purpose

在 Sprint 4 内交付 WriteNow 的「发布准备」能力：集成 `electron-updater` 自动更新；支持多格式导出（Markdown/Word/PDF）；建立基础 i18n（中文/英文）；并提供多平台发布格式适配（模板导出 + 剪贴板一键复制）。

本规范是 `openspec/specs/writenow-spec/spec.md` 在 Sprint 4 范围内的可执行增量（更新 + 导出 + i18n + 发布适配）。

## Requirements

### Requirement: 应用 MUST 集成 electron-updater，并提供可控的自动更新体验

应用 MUST 基于 `electron-updater` 实现后台检查与下载；并支持手动检查、跳过版本、以及下载完成后的“立即重启/稍后”选择。更新检查不得阻塞编辑器可用性。

#### Scenario: 启动时后台检查更新（不阻塞用户）
- **WHEN** 应用启动并进入主界面
- **THEN** 主进程应在后台检查更新（不阻塞编辑器与文件列表的正常使用），并将“检查中/有更新/无更新/失败”等状态可被 UI 观测与展示

#### Scenario: 有更新时后台静默下载，并在就绪后提示
- **WHEN** 检测到新版本且用户未选择跳过该版本
- **THEN** 应在后台静默下载；下载完成后提示“新版本已就绪”，并提供“立即重启/稍后”选项

#### Scenario: 手动检查更新 + 跳过版本
- **WHEN** 用户在“设置/关于”中点击“检查更新”
- **THEN** 应触发一次更新检查，并返回明确结果（有更新/无更新/失败 + 可理解错误信息）
- **WHEN** 用户选择“跳过此版本”
- **THEN** 在该版本范围内不再提示该版本，并允许用户在设置中清除跳过状态

---

### Requirement: 文档 MUST 支持导出 Markdown（.md，P0）

应用 MUST 支持将当前文档导出为 `.md` 文件，用于通用备份与跨工具流转。

#### Scenario: 导出当前文档为 .md
- **WHEN** 用户对当前文档选择“导出 → Markdown”
- **THEN** 应通过保存对话框选择目标路径并生成 `.md` 文件；导出内容应与当前编辑器内容一致（以可复现的 Markdown 文本为准）

#### Scenario: 导出失败必须可理解（禁止 silent failure）
- **WHEN** 目标路径不可写/磁盘错误导致导出失败
- **THEN** 必须展示明确错误信息与重试入口，并将关键信息落盘（便于定位）

---

### Requirement: 文档 MUST 支持导出 Word（.docx）与 PDF（P1）

应用 MUST 支持导出 `.docx` 与 `.pdf`，用于投稿、打印与分享；并尽量保留基础结构与排版。

#### Scenario: 导出为 Word（.docx）
- **WHEN** 用户选择“导出 → Word”
- **THEN** 应生成可被 Word/ WPS 打开的 `.docx` 文件，并保留至少以下结构：标题、段落、列表、加粗/斜体

#### Scenario: 导出为 PDF
- **WHEN** 用户选择“导出 → PDF”
- **THEN** 应生成可打开的 `.pdf` 文件，并尽量保持排版；导出过程应具备可见的加载/进度反馈

---

### Requirement: 应用 MUST 建立基础 i18n（中文/英文）并覆盖核心 UI 文案

应用 MUST 使用 `i18next` 在渲染进程提供中文/英文两套语言包；支持用户切换并持久化偏好；并覆盖核心 UI 文案（界面文本、提示信息、错误消息、快捷键提示）。

#### Scenario: 默认中文 + 可切换并持久化
- **WHEN** 用户首次启动应用
- **THEN** 默认语言为简体中文
- **WHEN** 用户将语言切换为 English（或反向）
- **THEN** UI 文案应立即切换，并在下次启动保持该选择

#### Scenario: 不需要国际化的内容不被处理
- **WHEN** 用户查看/编辑“用户创作内容”或“AI 生成内容”
- **THEN** 该内容不得被 i18n 处理或二次翻译（仅 UI 文案参与国际化）

---

### Requirement: 应用 MUST 提供多平台发布格式适配（模板导出 + 剪贴板）

应用 MUST 支持面向以下平台的发布格式适配：微信公众号、知乎、小红书、今日头条、Medium。MVP 阶段 MUST 采用“格式模板导出 + 剪贴板适配”，不包含 API 直发。

#### Scenario: 选择目标平台并生成可发布内容
- **WHEN** 用户选择目标平台（公众号/知乎/小红书/头条/Medium）
- **THEN** 应生成与该平台规则相匹配的发布内容（Markdown/HTML/纯文本等），并提供预览或可复制输出

#### Scenario: 一键复制到剪贴板
- **WHEN** 用户点击“复制用于 <平台>”
- **THEN** 应将生成的内容写入系统剪贴板，并给出明确成功反馈

#### Scenario: 平台规则提示与最小化处理
- **WHEN** 平台存在关键规则差异（例如公众号：无外链/特殊样式；知乎：Markdown 支持但可能有字数限制；小红书：短文本强调图片；头条：标准 HTML）
- **THEN** 应提供必要的提示/警告，并对内容做最小化安全处理（避免生成明显不可用的输出）

## Out of Scope（Sprint 4 不包含）

- 平台 API 直发与授权体系（属于后续迭代）
- 完整的模板市场/自定义模板编辑器（属于后续迭代）
- 复杂排版与出版级样式（优先保证导出可用与内容可复制）

## Notes（实现约束与建议）

- Windows 10/11 优先：路径、快捷键、安装包格式与更新策略优先保证 Windows 稳定；macOS 次之。
- 更新体验：更新检查/下载必须后台进行；下载完成后以“就绪提示 + 用户选择”收口，避免突兀重启。
- 导出管线：建议复用同一份“文档可复现表示”（例如 Markdown）作为导出源头，再派生 Word/PDF，避免双模式数据漂移。
- 发布适配：优先保证模板输出稳定与可复制；对平台规则差异以“提示 + 最小处理”达成 MVP。

## References

- 核心规范：`openspec/specs/writenow-spec/spec.md` 第 436-473 行（多平台发布 + 适配要点）
- 核心规范：`openspec/specs/writenow-spec/spec.md` 第 474-483 行（导出格式优先级）
- 核心规范：`openspec/specs/writenow-spec/spec.md` 第 484-509 行（electron-updater 自动更新机制）
- 核心规范：`openspec/specs/writenow-spec/spec.md` 第 529-549 行（i18n：i18next + 需要/不需要国际化的内容）
- 核心规范：`openspec/specs/writenow-spec/spec.md` 第 878-883 行（Sprint 4 范围）
