# Spec: Sprint 2B Judge Layer

## Purpose
在 SKILL 输出建议稿后执行约束检查（Judge），把违规项附加到 Diff 元信息与 UI 高亮中，帮助用户做知情决策；并提供可持久化的规则配置，为后续 Writing Contract 产品化打基础。

## Requirements

### Requirement: Judge MUST be pluggable

Judge Layer MUST 定义统一 `IJudge` 接口，并允许通过工厂/配置切换不同实现（如 L1-only / L1+L2），上层调用与 Diff 展示不得依赖具体实现细节。
#### Scenario: Add new judge implementation
- **GIVEN** 系统已存在 `IJudge` 抽象与统一入口
- **WHEN** 开发者新增一种检查器实现（例如更换 L2 模型）
- **THEN** 只需实现 `IJudge`，无需修改上层调用逻辑与 Diff 展示代码

### Requirement: L1 code judge MUST cover base constraints

L1 检查器 MUST 使用纯 JavaScript/TypeScript 实现，不依赖任何 AI 模型，并覆盖禁用词/字数/格式/术语一致性四类硬约束，输出 MUST 可定位到字符 offset（start/end）。
#### Scenario: Forbidden words
- **GIVEN** 用户已配置禁用词列表
- **WHEN** 文本包含禁用词
- **THEN** 返回违规项（含命中词与字符 offset start/end）
#### Scenario: Word count
- **GIVEN** 用户已配置字数最小/最大范围
- **WHEN** 文本字数超出最小/最大范围
- **THEN** 返回违规项并提示目标范围
#### Scenario: Format
- **GIVEN** 用户已配置格式规则（如仅列表/仅段落）
- **WHEN** 文本不满足格式约束（如仅列表/仅段落等）
- **THEN** 返回违规项并定位到第一个不满足的位置
#### Scenario: Terminology
- **GIVEN** 用户已配置术语表（标准术语 + 别名）
- **WHEN** 文本使用了术语别名而非标准术语
- **THEN** 返回违规项并给出规范化建议（suggestion）

### Requirement: L2 local model judge MUST support semantic checks

L2 检查器 MUST 基于本地 GGUF 小模型（默认 SmolLM2-360M）执行语义级判定（语气/覆盖率），并 MUST 支持 < 3 秒超时与失败降级（仅返回 L1 结果且可见提示）。
#### Scenario: Model download + fallback
- **GIVEN** 模型文件缺失或下载/校验失败
- **WHEN** 本地模型不存在或下载失败/校验失败
- **THEN** 明确提示并降级为仅 L1
#### Scenario: Inference timeout
- **GIVEN** L2 推理存在时间上限（3 秒）
- **WHEN** L2 推理超过 3 秒
- **THEN** 中止并降级为仅 L1 结果

### Requirement: Violations MUST be visible in diff

违规项 MUST 在 Diff 视图中可见（下划线标注 + 悬停详情 + 汇总），且在全部通过时 MUST 遵循低打扰原则（不额外提示）。
#### Scenario: Visible highlight + details
- **GIVEN** Judge 返回一个或多个违规项
- **WHEN** 存在违规项
- **THEN** Diff 对应位置高亮并支持悬停/点击查看详情
#### Scenario: Pass has low-noise UI
- **GIVEN** Judge 无任何违规项
- **WHEN** 所有约束检查通过
- **THEN** Diff 不显示额外“全部通过”提示

### Requirement: Constraints MUST be configurable and persisted

约束规则 MUST 支持全局/项目两种作用域并持久化到本地数据库 settings；当同一约束在两个作用域同时存在时，项目级 MUST 覆盖全局级。
#### Scenario: Global vs project scope
- **GIVEN** 全局与项目级规则同时存在
- **WHEN** 全局与项目级规则同时存在
- **THEN** 生效规则以项目级覆盖全局级
