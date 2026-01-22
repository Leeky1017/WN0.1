# WriteNow 产品规范

WriteNow 是创作者的 IDE —— 用 Cursor 对程序员的革命，去革命创作者的写作体验。

## Status

- 本规范：Active（持续更新的权威基线）
- 治理与交付规范：`AGENTS.md`
- 运行日志：`openspec/_ops/task_runs/ISSUE-<N>.md`

## Purpose

本规范用于描述 WriteNow 的愿景、核心概念、系统架构与实施路线图，作为后续 Sprint 分支规范与实现的上游来源与一致性基线。

## Requirements

### Requirement: 本产品规范 MUST 定义可验证的一致性基线

本产品规范 MUST 提供后续迭代的统一基线（术语、技术栈、关键策略与路线图），并被 Sprint 级规范以“提取 + 增量”的方式引用与细化。

#### Scenario: Sprint 规范派生一致
- **WHEN** 团队创建 Sprint 分支规范与任务卡片
- **THEN** 其内容 MUST 与本规范在技术栈、术语与范围定义上保持一致，并以本规范作为引用来源

### Requirement: 工程治理与交付流程 MUST 以 `AGENTS.md` 为准

`AGENTS.md` 定义了本仓库的治理硬约束（代码原则/异常与防御性编程/工作留痕/禁止事项）。任何变更都 MUST 遵循该规范，否则不得合并。

#### Scenario: PR 可交付且可追溯
- **WHEN** 团队提交 PR 交付任意变更
- **THEN** PR MUST 满足 `AGENTS.md` 中的交付流程（Issue/Branch/Run log/验证证据），并保证变更可追溯、可复现、可验证

---

## 一、产品愿景

### 核心理念

用户不是在"写文档"，是在"构建文学世界"。

### 核心差异化

| 维度 | 传统工具 / ChatGPT | WriteNow |
|------|-------------------|----------|
| 写作模式 | 线性写作 | 项目化管理 |
| AI 交互 | 复制粘贴式  | 选中 → SKILL → diff → 应用 |
| 上下文 | 对话历史 | 全项目语境感知 |
| 版本管理 | 无 | 文字的 Git |
| 发布 | 手动调格式 | 一键多平台 |

### 目标用户

**一级用户（高付费意愿）**
- 画像：自媒体大V、签约作家、内容团队
- 痛点：效率、一致性、多平台发布
- ARPU：￥800-2000/年

**二级用户（中等付费意愿）**
- 画像：中腰部自媒体、副业写作、电商文案
- 痛点：写作卡壳、不会润色
- ARPU：￥200-500/年

**三级用户（免费/转化）**
- 画像：新手、学生、兴趣写作者
- 策略：免费版 + 限额促转化

---

## 二、核心概念

### 1. SKILL 系统（创作者的 Tools）

SKILL = Prompt模板 + 上下文需求 + 输出格式

编程 Agent 有 tools（view_file、run_command），创作 Agent 有 SKILL。

**SKILL 分类：**

| 类型 | SKILL | 功能 |
|------|-------|------|
| 改写 | 润色文本 | 优化表达和用词 |
| 改写 | 精简段落 | 删减冗余内容 |
| 改写 | 扩写段落 | 丰富细节描写 |
| 改写 | 改变风格 | 调整语气/文风 |
| 生成 | 生成大纲 | 从主题生成结构 |
| 生成 | 扩写情节 | 从大纲点扩展成段落 |
| 生成 | 生成对话 | 基于场景和人物生成 |
| 生成 | 续写内容 | 基于前文继续 |
| 分析 | 一致性检查 | 发现前后矛盾 |
| 分析 | 情节节奏 | 叙事节奏建议 |
| 辅助 | 取名建议 | 人物/地点命名 |
| 辅助 | 资料查询 | 历史/地理考证 |

### 2. 版本对比（文字的 Git）

核心洞察：创作不是一次写对，而是反复打磨。

- 每次 AI 修改自动保存为版本
- 版本可命名（如"第一版"、"更激烈的冲突"）
- Diff 视图对比任意两个版本
- 一键切换/回退

### 3. 上下文工程（学习 Manus）

核心目标：让用户觉得"Agent 比我自己还懂我写的东西"。

参考 Manus 的上下文工程方法论，适配到创作场景：

**3.1 上下文层次**

| 层次 | 内容 | Token 占比 | 更新频率 |
|------|------|-----------|---------|
| 项目级 | 项目设定、人物卡片、世界观 | 20% | 用户手动更新 |
| 文章级 | 当前文章全文、大纲 | 40% | 实时 |
| 段落级 | 当前选区、前后文 | 30% | 每次 SKILL 调用 |
| 指令级 | SKILL prompt、用户补充指令 | 10% | 每次请求 |

**3.2 上下文压缩策略（借鉴 Manus）**

Manus 的输入:输出比例约为 100:1，说明上下文管理至关重要。

WriteNow 的策略：
- **可逆压缩**：将完整文章缩减为关键信息摘要，保留恢复能力
- **不可逆摘要**：对于超长项目，生成结构化摘要作为"项目记忆"
- **KV 缓存优化**：相同前缀的上下文复用缓存，降低成本

**3.3 上下文注入规则**

不同 SKILL 需要不同的上下文：

| SKILL 类型 | 需要的上下文 |
|-----------|------------|
| 润色/精简 | 当前段落 + 写作风格指南 |
| 扩写 | 当前段落 + 前后各 500 字 + 大纲位置 |
| 生成对话 | 场景描述 + 相关人物设定 |
| 一致性检查 | 全文摘要 + 人物时间线 |
| 续写 | 前文 2000 字 + 大纲后续要点 |

**3.4 创作者 Agent 的 Tools**

WriteNow 的 Agent 不需要复杂的代码调试/部署能力，但需要专用 Tools：

| Tool | 功能 | 触发场景 |
|------|------|---------|
| `context:get_character` | 获取人物设定 | 涉及人物对话/行为 |
| `context:get_outline` | 获取大纲结构 | 需要了解文章走向 |
| `context:get_style` | 获取风格指南 | 改写/润色任务 |
| `document:search` | 全项目搜索 | 检查一致性 |
| `document:read_range` | 读取指定范围 | 需要参考前后文 |
| `version:list` | 列出版本历史 | 用户想对比版本 |
| `version:diff` | 对比两个版本 | 展示修改差异 |

**3.5 注意力操控（Manus 的 todo.md 策略）**

Manus 通过反复复述 todo.md 来保持 Agent 专注。

WriteNow 的类似策略：
- 每次 SKILL 调用时，在 prompt 中强调"当前任务"
- 避免 Agent 被无关信息分散注意力
- 示例：
  ```
  ## 当前任务
  润色以下段落，使表达更加优美流畅。
  
  ## 写作风格指南
  {style_guide}
  
  ## 待润色内容
  {selected_text}
  ```

**3.6 错误恢复**

创作场景的"错误"：
- AI 改写后用户不满意 → 提供一键回退
- AI 理解偏差 → 允许用户补充指令重试
- 生成内容与设定冲突 → 一致性检查 SKILL

### 4. 全局搜索与索引

**4.1 全文索引**

技术方案：SQLite FTS5（全文搜索）

能力：
- 搜索人物名：显示所有出现位置
- 搜索情节关键词：定位相关场景
- 模糊匹配：支持拼写容错

实现示例：
```sql
CREATE VIRTUAL TABLE articles_fts USING fts5(
  title, content, characters, tags
);

-- 搜索
SELECT * FROM articles_fts WHERE articles_fts MATCH '张三';
```

**4.2 语义搜索**

**核心能力**：
- "找到描写悲伤情绪的段落"（语义理解）
- "和这段类似的描写"（相似度检索）
- "主角朋友的出场"（概念理解）
- 搜"高兴"能找到"快乐"、"开心"、"喜悦"

**本地 Embedding 模型选择**：

| 模型 | 大小 | 中文支持 | 推荐度 |
|------|------|---------|-------|
| `shibing624/text2vec-base-chinese` | ~100MB | ⭐⭐⭐⭐⭐ 专门为中文优化 | **首选** |
| `paraphrase-multilingual-MiniLM-L12-v2` | ~120MB | ⭐⭐⭐⭐ 支持50+语言 | 备选（多语言） |
| `jinaai/jina-embeddings-v2-base-zh` | ~330MB | ⭐⭐⭐⭐⭐ 中英双语专精 | 效果最好 |

> ⚠️ 注意：`all-MiniLM-L6-v2` 不支持中文，WriteNow 不应使用

**技术实现方案**：

方案 A：transformers.js（推荐）
- 纯 JavaScript，无需 Python
- 直接在 Electron 中运行
- 支持 WebGPU 加速
- NPM 包：`@xenova/transformers`

方案 B：ONNX Runtime
- 模型转成 ONNX 格式
- 用 `onnxruntime-node` 运行
- 性能更好，体积可控

**向量存储**：
- 首选：sqlite-vec（SQLite 扩展，纯本地）
- 备选：LanceDB、Chroma（本地）
- 云端：Supabase pgvector（Pro 用户）

**学术参考**：
- RAG: Lewis et al. "Retrieval-Augmented Generation" (arXiv:2005.11401)
- MemGPT: Packer et al. "MemGPT: Towards LLMs as Operating Systems" (arXiv:2310.08560)
- SPLADE: Formal et al. "SPLADE: Sparse Lexical and Expansion Model" (arXiv:2109.10086)

### 5. RAG（检索增强生成）

**核心理念**：AI 生成前智能检索相关内容

**5.1 工作流程**

```
用户选中文本
    ↓
检测提及的人物/地点/事件
    ↓
RAG 检索相关上下文
    ├── 人物设定卡片
    ├── 最近出场场景
    ├── 相关世界观设定
    └── 时间线位置
    ↓
组合成完整上下文
    ↓
发送给 AI 执行 SKILL
```

**5.2 检索策略**

| SKILL 类型 | 检索内容 |
|-----------|---------|
| 润色/改写 | 写作风格指南 + 当前章节 |
| 生成对话 | 对话人物设定 + 人物关系 + 前文对话 |
| 续写 | 前文 2000 字 + 大纲后续 + 相关人物 |
| 一致性检查 | 时间线 + 人物出场记录 + 事件列表 |
| 扩写场景 | 场景设定 + 相关人物 + 环境描写样本 |

**5.3 检索粒度**

- **段落级**：每个段落独立 Embedding，检索最相关段落
- **实体级**：人物、地点、事件分别索引
- **章节级**：保留章节结构信息

### 6. 外挂记忆系统

**核心理念**：AI 持久化记住项目知识和用户偏好

**6.1 记忆类型**

| 记忆类型 | 存储内容 | 更新方式 |
|---------|---------|---------|
| 用户偏好 | 写作风格偏好、常用词汇、讨厌的表达 | AI 自动提取 |
| 项目知识 | 世界观、人物关系、重要事件 | 用户手动 + AI 辅助 |
| 历史反馈 | 用户采纳/拒绝的改写样本 | 自动记录 |
| 风格样本 | 用户满意的段落作为参考 | 用户标记 |

**6.2 记忆注入**

```
每次 AI 调用时：
  1. 加载用户偏好记忆
  2. 加载项目知识记忆
  3. 加载相关历史反馈
  4. 组合成 system prompt 的一部分
```

**6.3 记忆更新**

- **显式更新**：用户手动添加/修改设定
- **隐式更新**：AI 从用户行为中提取偏好
  - 用户多次拒绝华丽描写 → 记忆"偏好简洁风格"
  - 用户多次接受某类改写 → 记忆"喜欢这种表达"

### 7. 知识图谱（进阶）

**核心理念**：构建实体关系网络

**7.1 实体类型**

- 人物（Character）
- 地点（Location）
- 事件（Event）
- 时间点（TimePoint）
- 物品（Item）

**7.2 关系类型**

- 人物-人物：朋友、敌人、家人、同事...
- 人物-地点：居住、工作、出生...
- 人物-事件：参与、目击、策划...
- 事件-时间：发生于、持续至...

**7.3 应用场景**

- 一致性检查："张三不可能出现在事件 B，因为他在事件 A 中已经..."
- 关系可视化：显示人物关系图
- 时间线生成：自动生成事件时间线
- 情节建议："基于当前人物关系，可能的冲突点..."

**7.4 技术方案**

- 简单版：JSON 存储实体和关系
- 进阶版：图数据库（如 Neo4j）或 SQLite 关系表

### 8. AI 能力实施路线

| Phase | 能力 | 优先级 | 技术复杂度 |
|-------|------|-------|-----------|
| MVP | 基础上下文工程 | P0 | 低 |
| MVP | 全文索引（FTS5） | P1 | 低 |
| V1.0 | 基础 RAG | P1 | 中 |
| V1.0 | 外挂记忆（用户偏好） | P2 | 中 |
| V1.0 | 语义搜索 | P2 | 中 |
| V2.0 | 知识图谱 | P3 | 高 |
| V2.0 | 自动偏好学习 | P3 | 高 |

### 9. AI 交互 UX

**触发方式**
- 选中文字 → 浮动工具栏出现 SKILL 快捷按钮
- `Cmd+K` → 打开命令面板，输入 SKILL 名称
- 右键菜单 → 展开 SKILL 列表
- 右侧 AI 面板 → 点击 SKILL 卡片

**结果展示**
- **Diff 模式**（默认）：显示修改前后对比，绿色新增红色删除
- **内联预览**：直接在原位置显示结果，淡化原文
- **侧边对比**：左右分屏对比

**流式反馈**
- AI 响应逐字流式显示
- 显示"正在思考..."加载状态
- 支持随时取消（`Esc` 键）

**确认机制**
- 生成完成后必须用户确认才应用
- 一键接受 / 一键拒绝
- 支持部分接受（选中特定段落应用）

### 10. 隐私与数据

**默认模式（Share Data）**
- AI 调用时发送选中内容到云端 AI 服务
- 创作数据可用于改进产品体验
- 支持云同步（Pro 用户）

**隐私模式（Privacy Mode）**
- 用户可在设置中切换
- 启用后：
  - AI 调用只发送最小必要内容
  - 内容不用于产品改进
  - 本地加密存储
  - 关闭使用数据上报

**数据存储**
- 本地数据：SQLite 数据库存储在用户目录
- 云端数据：Supabase PostgreSQL（Pro 用户）
- 版本历史：本地保存，可选同步

**透明性**
- 每次 AI 调用时可查看发送的完整上下文
- 设置页面显示数据使用说明
- 提供数据导出功能

### 11. 快捷键

> 优先支持 Windows，macOS 使用 Cmd 替代 Ctrl

| 功能 | Windows | macOS |
|------|---------|-------|
| 打开命令面板 | `Ctrl+K` | `Cmd+K` |
| 手动保存 | `Ctrl+S` | `Cmd+S` |
| 快速润色当前段落 | `Ctrl+/` | `Cmd+/` |
| 显示所有 SKILL | `Ctrl+Shift+P` | `Cmd+Shift+P` |
| 撤销 | `Ctrl+Z` | `Cmd+Z` |
| 重做 | `Ctrl+Shift+Z` / `Ctrl+Y` | `Cmd+Shift+Z` |
| 加粗 | `Ctrl+B` | `Cmd+B` |
| 斜体 | `Ctrl+I` | `Cmd+I` |
| 切换编辑/预览模式 | `Ctrl+E` | `Cmd+E` |
| 切换专注模式 | `Ctrl+\` | `Cmd+\` |
| 取消当前 AI 生成 | `Esc` | `Esc` |

### 12. 离线能力

| 功能 | 离线可用 | 需要联网 |
|------|---------|---------|
| 编辑文章 | ✓ | |
| 保存文章 | ✓ | |
| 本地搜索 | ✓ | |
| 版本回退 | ✓ | |
| 创作统计 | ✓ | |
| AI SKILL | | ✓ |
| 云同步 | | ✓ |
| 多平台发布 | | ✓ |

离线时 AI 功能显示"需要网络连接"提示，其他功能正常使用。

### 13. 编辑器技术选型

**选型：TipTap**

| 选项 | 优点 | 缺点 | 结论 |
|------|------|------|------|
| **TipTap** | 现代化、可扩展、Markdown 友好 | 学习曲线中等 | ✅ 选用 |
| Monaco | 代码感强、功能强大 | 太"程序员风格" | ❌ |
| Quill | 简单易用 | 扩展性差 | ❌ |

选择 TipTap 的理由：
- 基于 ProseMirror，稳定成熟
- 内置 Markdown 支持
- 扩展系统优秀（添加 SKILL 按钮方便）
- Notion、Linear 等产品验证
- 社区活跃，文档完善

**双模式编辑**：

| 模式 | 体验 | 适合用户 |
|------|------|---------|
| Markdown 模式 | 打 `#` 自动变标题，`**` 变粗体 | 熟悉 Markdown 的用户 |
| 富文本模式 | 像 Word 一样，用工具栏点按钮 | 普通用户 |

特点：
- 用户可随时切换模式
- 两种模式编辑同一文档，底层数据一致
- 无论哪种模式，都能导出为 Markdown 或 Word
- 默认模式可在设置中配置

### 14. 多平台发布

**支持的平台**：
- 微信公众号
- 知乎
- 小红书
- 今日头条
- Medium（国际）

**实现方案**：

| 方式 | 复杂度 | 适用场景 |
|------|-------|---------|
| 格式模板导出 | 低 | 用户手动复制 |
| 剪贴板适配 | 中 | 一键复制，保持格式 |
| API 直发 | 高 | 需要平台授权 |

MVP 阶段采用"格式模板导出 + 剪贴板适配"方案。

**格式适配要点**：
- 公众号：无外链、图片需上传、特殊样式
- 知乎：支持 Markdown、有字数限制
- 小红书：强调图片、短文本
- 头条：标准 HTML

### 15. 导出格式

| 格式 | 用途 | 优先级 |
|------|------|-------|
| Markdown (.md) | 通用导出 | P0 |
| Word (.docx) | 投稿、打印 | P1 |
| PDF | 打印、分享 | P1 |
| HTML | 网页发布 | P2 |
| 纯文本 (.txt) | 简单分享 | P2 |

### 16. 自动更新机制

**技术方案**：electron-updater

**更新选项**：
- 自动更新（默认）：后台下载，下次启动生效
- 手动更新：用户主动检查和安装
- 跳过版本：允许用户忽略某个版本

**更新流程**：
```
应用启动
    ↓
后台检查更新（不阻塞用户）
    ↓
有更新 → 后台静默下载
    ↓
下载完成 → 提示"新版本已就绪，下次启动生效"
    ↓
用户可选择"立即重启"或"稍后"
```

**更新服务器**：
- GitHub Releases（免费，推荐）
- 自建 CDN（可选）

### 17. 自动保存

**策略：Cursor/Antigravity 风格**

- 每次修改后防抖保存（2 秒无操作后触发）
- 不需要手动保存快捷键（但保留 Ctrl/Cmd+S 支持）
- 状态栏实时显示保存状态
- 崩溃恢复机制

**状态显示**：
- "已保存" → 绿色小圆点
- "保存中..." → 转圈动画
- "未保存更改" → 黄色小圆点

**崩溃恢复**：
- 定时快照（每 5 分钟）
- 应用启动时检测未正常关闭
- 提示恢复最近的编辑内容

### 18. 多语言支持（i18n）

**支持语言**：
- 简体中文（默认）
- English

**技术方案**：
- 使用 i18next（React 生态标准）
- 语言文件存放在 `src/locales/`
- 支持用户切换语言

**需要国际化的内容**：
- UI 界面文本
- 提示信息
- 错误消息
- 快捷键提示

**不需要国际化的内容**：
- 用户创作内容
- AI 生成内容（由模型决定）

---

## 三、商业模型

### 套餐设计

**Free（免费版）**
- AI：免费模型，5万字/月
- 功能：本地编辑器、基础 SKILL（3个）、创作统计
- 限制：无云同步、无高端模型

**Pro（￥99/月 或 ￥799/年）**
- AI：Claude Sonnet/GPT-4，50万字/月
- 功能：全部 SKILL、自定义 SKILL、云同步、多平台发布

**Team（￥199/人/月，3人起）**
- 功能：Pro 全部 + 团队协作、统一账单、团队统计

### 功能权限矩阵

| 功能 | Free | Pro | Team |
|------|------|-----|------|
| 本地编辑器 | ✓ | ✓ | ✓ |
| 基础 SKILL | 3个 | 全部 | 全部 |
| 自定义 SKILL | ✗ | ✓ | ✓ |
| 高端 AI 模型 | ✗ | 50万字/月 | 不限 |
| 云同步 | ✗ | ✓ | ✓ |
| 多平台发布 | ✗ | ✓ | ✓ |

### 后端技术栈

采用 Supabase 一站式全托管服务：
- 用户认证：Supabase Auth
- 数据库：PostgreSQL
- API：Edge Functions
- 支付：Stripe（海外）/ 微信支付（国内）

---

## 四、系统架构

### 技术栈

| 层次 | 技术 | 说明 |
|------|------|------|
| 前端框架 | React 18 + TypeScript | 严格模式 |
| 样式 | Tailwind CSS v4 | 暗色/亮色/自定义主题 |
| 编辑器 | TipTap (ProseMirror) | 双模式：Markdown / 富文本 |
| 组件库 | shadcn/ui 自定义组件 | Cursor/Linear 风格 |
| 桌面框架 | Electron | 无边框窗口 |
| 构建工具 | Vite | Renderer 构建与开发服务器 |
| 测试 | Vitest + Playwright | 单测 + E2E（用户路径） |
| 质量门禁 | ESLint + TypeScript | lint + 严格类型 |
| 本地数据 | SQLite (better-sqlite3) | 含 FTS5 全文索引 |
| 向量存储 | sqlite-vec | 语义搜索支持 |
| 状态管理 | Zustand | 轻量级 |
| AI 服务 | Claude API / OpenAI API | 流式响应，支持中转站 |
| Embedding | text2vec-base-chinese | 本地模型 ~100MB |
| 国际化 | i18next | 中/英双语 |

### 平台支持

| 平台 | 支持 | 优先级 | 说明 |
|------|------|-------|------|
| Windows 10/11 | ✅ | **首要支持** | 主要开发测试平台 |
| macOS 10.15+ | ✅ | 次要支持 | 需要 Cmd 键适配 |
| Linux | 🔄 | 未来考虑 | AppImage 格式 |

### AI 服务配置

**支持的 API 格式**：

| 格式 | 示例 | 说明 |
|------|------|------|
| OpenAI 官方 | `https://api.openai.com/v1` | 标准格式 |
| Claude 官方 | `https://api.anthropic.com` | Anthropic 官方 |
| OpenAI 中转站 | `https://api.your-proxy.com/v1` | 兼容 OpenAI 格式 |
| Claude 中转站 | 自定义 | 兼容 Anthropic 格式 |
| Azure OpenAI | Azure 端点 | 企业部署 |

**配置项**：
```typescript
interface AIConfig {
  provider: 'openai' | 'anthropic' | 'custom';
  baseUrl: string;           // API 端点，支持中转站
  apiKey: string;            // API 密钥
  model: string;             // 模型名称
  maxTokens?: number;        // 最大 Token 数
  temperature?: number;      // 温度参数
}
```

**用户设置界面**：
- 支持多个 API 配置
- 可设置默认 provider
- 密钥本地加密存储

### 目录结构

```
WriteNow/
├── electron/                    # Electron 主进程
│   ├── main.cjs                 # 主进程入口
│   ├── preload.cjs              # 预加载脚本
│   └── ipc/                     # IPC 处理器
│       ├── files.cjs            # 文件操作
│       ├── database.cjs         # 数据库操作
│       ├── ai.cjs               # AI 服务代理
│       └── embedding.cjs        # 本地 Embedding
│
├── src/                         # 前端源码
│   ├── main.tsx                 # React 入口
│   ├── App.tsx                  # 根组件
│   ├── index.css                # 全局样式
│   │
│   ├── components/              # UI 组件
│   │   ├── Editor/              # TipTap 编辑器
│   │   │   ├── index.tsx
│   │   │   ├── extensions/      # 编辑器扩展
│   │   │   └── Toolbar.tsx      # 工具栏
│   │   ├── AI/                  # AI 交互组件
│   │   │   ├── SkillPanel.tsx
│   │   │   ├── DiffView.tsx
│   │   │   └── CommandPalette.tsx
│   │   ├── Sidebar/             # 侧边栏
│   │   │   ├── FilesView.tsx
│   │   │   ├── OutlineView.tsx
│   │   │   └── SettingsView.tsx
│   │   └── ui/                  # 基础 UI 组件 (shadcn)
│   │
│   ├── stores/                  # Zustand 状态
│   │   ├── editorStore.ts       # 编辑器状态
│   │   ├── filesStore.ts        # 文件列表
│   │   ├── aiStore.ts           # AI 面板状态
│   │   ├── memoryStore.ts       # 外挂记忆
│   │   └── settingsStore.ts     # 用户设置
│   │
│   ├── hooks/                   # 自定义 Hooks
│   │   ├── useIpc.ts            # IPC 调用封装
│   │   ├── useSkill.ts          # SKILL 执行
│   │   └── useSearch.ts         # 搜索功能
│   │
│   ├── lib/                     # 工具函数
│   │   ├── ipc.ts               # IPC 客户端
│   │   ├── rag.ts               # RAG 逻辑
│   │   └── utils.ts             # 通用工具
│   │
│   ├── locales/                 # 国际化
│   │   ├── zh-CN.json
│   │   └── en.json
│   │
│   └── types/                   # TypeScript 类型
│       ├── ipc.ts
│       ├── editor.ts
│       └── ai.ts
│
├── models/                      # 本地 AI 模型
│   └── text2vec-base-chinese/   # Embedding 模型
│
├── docs/                        # 文档
│   └── reference/               # 参考资料
│       └── manus-context-engineering/
│
└── openspec/                    # OpenSpec 规范
    └── specs/
        └── writenow-spec/
```

### IPC 通信规范

通道命名：`domain:action` 格式

```typescript
// 文件操作
'file:list'           // 获取文件列表
'file:read'           // 读取文件
'file:write'          // 保存文件
'file:create'         // 创建文件
'file:delete'         // 删除文件

// AI 服务
'ai:skill:run'        // 执行 SKILL（流式）
'ai:skill:cancel'     // 取消执行

// 搜索与 RAG
'search:fulltext'     // 全文搜索
'search:semantic'     // 语义搜索
'rag:retrieve'        // RAG 检索

// Embedding
'embedding:encode'    // 文本转向量
'embedding:index'     // 建立索引

// 版本历史
'version:list'        // 版本列表
'version:create'      // 创建版本
'version:restore'     // 恢复版本
'version:diff'        // 版本对比

// 更新
'update:check'        // 检查更新
'update:download'     // 下载更新
'update:install'      // 安装更新
'update:getState'     // 获取更新状态
'update:skipVersion'  // 跳过指定版本
'update:clearSkipped' // 清除跳过版本

// 导出
'export:markdown'     // 导出 Markdown
'export:docx'         // 导出 Word（.docx）
'export:pdf'          // 导出 PDF

// 剪贴板
'clipboard:writeText' // 写入剪贴板纯文本
'clipboard:writeHtml' // 写入剪贴板 HTML
```

### 数据库 Schema

```sql
-- 文章表
CREATE TABLE articles (
  id TEXT PRIMARY KEY,
  title TEXT NOT NULL,
  content TEXT NOT NULL,
  format TEXT DEFAULT 'markdown',    -- 'markdown' | 'richtext'
  workflow_stage TEXT DEFAULT 'draft',
  word_count INTEGER DEFAULT 0,
  project_id TEXT,                   -- 所属项目
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);

-- 文章全文索引
CREATE VIRTUAL TABLE articles_fts USING fts5(
  title, content, tokenize='unicode61'
);

-- 文章向量索引（语义搜索）
CREATE VIRTUAL TABLE articles_vec USING vec0(
  id TEXT PRIMARY KEY,
  embedding FLOAT[384]               -- text2vec 输出维度
);

-- 版本快照
CREATE TABLE article_snapshots (
  id TEXT PRIMARY KEY,
  article_id TEXT NOT NULL,
  content TEXT NOT NULL,
  name TEXT,                         -- 用户自定义版本名
  reason TEXT,                       -- 保存原因
  actor TEXT DEFAULT 'user',         -- 'user' | 'ai' | 'auto'
  created_at TEXT NOT NULL,
  FOREIGN KEY (article_id) REFERENCES articles(id)
);

-- 项目表
CREATE TABLE projects (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  description TEXT,
  style_guide TEXT,                  -- 写作风格指南
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);

-- 人物设定
CREATE TABLE characters (
  id TEXT PRIMARY KEY,
  project_id TEXT NOT NULL,
  name TEXT NOT NULL,
  description TEXT,
  traits TEXT,                       -- JSON: 性格特点
  relationships TEXT,                -- JSON: 人物关系
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  FOREIGN KEY (project_id) REFERENCES projects(id)
);

-- SKILL 定义
CREATE TABLE skills (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  description TEXT,
  tag TEXT,                          -- 分类标签
  system_prompt TEXT,
  user_prompt_template TEXT NOT NULL,
  context_rules TEXT,                -- JSON: 上下文注入规则
  model TEXT DEFAULT 'claude-sonnet',
  is_builtin INTEGER DEFAULT 0,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);

-- 用户记忆（外挂记忆）
CREATE TABLE user_memory (
  id TEXT PRIMARY KEY,
  type TEXT NOT NULL,                -- 'preference' | 'feedback' | 'style'
  content TEXT NOT NULL,
  project_id TEXT,                   -- NULL = 全局
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);

-- 创作统计
CREATE TABLE writing_stats (
  date TEXT PRIMARY KEY,             -- YYYY-MM-DD
  word_count INTEGER DEFAULT 0,
  writing_minutes INTEGER DEFAULT 0,
  articles_created INTEGER DEFAULT 0,
  skills_used INTEGER DEFAULT 0
);

-- 写作约束配置表
CREATE TABLE writing_constraints (
  id TEXT PRIMARY KEY,
  project_id TEXT,
  type TEXT NOT NULL,
  config TEXT NOT NULL,
  level TEXT DEFAULT 'warning',
  enabled INTEGER DEFAULT 1,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  FOREIGN KEY (project_id) REFERENCES projects(id)
);

-- 术语表
CREATE TABLE terminology (
  id TEXT PRIMARY KEY,
  project_id TEXT,
  term TEXT NOT NULL,
  aliases TEXT,
  definition TEXT,
  created_at TEXT NOT NULL,
  FOREIGN KEY (project_id) REFERENCES projects(id)
);

-- 禁用词表（便于批量管理）
CREATE TABLE forbidden_words (
  id TEXT PRIMARY KEY,
  project_id TEXT,
  word TEXT NOT NULL,
  category TEXT,
  created_at TEXT NOT NULL,
  FOREIGN KEY (project_id) REFERENCES projects(id)
);

-- 用户设置
CREATE TABLE settings (
  key TEXT PRIMARY KEY,
  value TEXT NOT NULL
);
```

---

## 五、实施路线图

### Sprint 1：可用的编辑器（1-2周）✅ 已完成
- [x] TipTap 编辑器集成
- [x] 真实的文件保存/加载
- [x] 自动保存 + 崩溃恢复
- [x] 双模式编辑
- [x] Zustand 状态管理接入

### Sprint 2A：AI 基础链路（2 周）✅ 已完成
- [x] Claude API 集成（流式 + 可取消）
- [x] SKILL 系统核心（选中 → 执行 → diff → 应用）
- [x] 基础 SKILL（内置示例）
- [x] Diff 展示与确认机制
- [x] 版本历史记录（创建/列表/回退/对比）

### Sprint 2B：Judge Layer + 写作约束（1–2 周）✅ 已完成
- [x] Judge Layer 架构（L1/L2 约束）
- [x] L1 禁用词与扩展约束
- [x] L2 模型集成（本地 judge）
- [x] 模型下载与就绪状态机
- [x] 违规 diff 展示与交互闭环
- [x] 写作约束配置 UI（读取/保存/启用）

### Sprint 2.5：上下文工程（新增）✅ 已完成
- [x] Manus 上下文方法论落地（分层/压缩/注入规则）
- [x] Context Assembler（可解释、可调试、可复现）
- [x] Token Budget 管理（超长降级策略）

### Sprint 3：智能上下文（2周）✅ 已完成
- [x] 本地 Embedding 模型打包
- [x] SQLite FTS5 全文索引
- [x] 基础 RAG
- [x] sqlite-vec 向量存储

### Sprint 4：发布准备（1周）✅ 已完成
- [x] electron-updater 自动更新
- [x] 多格式导出
- [x] 基础 i18n
- [x] 多平台发布格式适配

### Sprint 5：项目管理（2周）✅ 已完成
- [x] 项目/文件夹结构
- [x] 人物设定卡片
- [x] 大纲视图
- [x] 知识图谱基础

### IPC 契约自动化（跨 Sprint 基建）✅ 已完成
- [x] IPC SSOT：`electron/ipc/*` → 自动生成 `src/types/ipc-generated.ts`
- [x] 漂移护栏：`npm run contract:check`（CI 门禁，禁止手改生成文件）

### Sprint 6：增强体验（2周）
- [x] 创作统计
- [x] 番茄钟
- [x] 编辑器多标签（多文档 TabBar + Toolbar 单行合并）
- [x] 心流保护（Typewriter / Paragraph Focus / Zen）
- [ ] 外挂记忆（用户偏好学习）（Paused: 2026-01-22; blocked by Theia migration）
- [ ] 命令面板 (Cmd+K)（Paused: 2026-01-22; blocked by Theia migration）

### Sprint：Theia Migration（优先，阻塞后续框架相关工作）
- [ ] PoC：Theia + TipTap（输入/焦点/快捷键）
- [ ] PoC：Theia backend + better-sqlite3 + sqlite-vec
- [ ] PoC：存储语义决策（userData-first vs workspace-first）
- [ ] Theia 应用壳体（脚手架 + 模块裁剪 + 基础布局/品牌）
- [ ] 迁移核心链路：RPC/IPC、SQLite、RAG、Embedding
- [ ] 迁移面板：AI/版本历史/知识图谱（复用实现）
- [ ] 规范：`openspec/specs/sprint-theia-migration/spec.md`

### Sprint 7：云服务（3周）
- [ ] Supabase 用户认证
- [ ] Stripe 订阅管理
- [ ] 云同步
- [ ] Pro 功能上线

---

## 六、衡量指标

### 产品指标
- 日活用户 (DAU)
- 用户留存率（7日/30日）
- AI 功能使用率（SKILL 调用次数/用户）
- 付费转化率
- ARPU（每用户平均收入）

### 体验指标
- 从打开到开始写作的时间
- SKILL 执行后的采纳率
- 版本回退频率
- 语义搜索使用率
- 崩溃恢复触发率（越低越好）

### 技术指标
- 自动保存成功率
- KV 缓存命中率（成本优化）
- 本地 Embedding 性能（ms/次）
- 应用启动时间
