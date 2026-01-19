# WriteNow - Agent Instructions

本仓库目标：构建一个 AI 驱动的文字创作 IDE（创作者的 Cursor）。

## 宪法级约束

### 代码质量
- 代码必须同时"正确"和"好"
- 正确: 功能符合需求,边界处理完备
- 好: 可读性强,可维护,可测试,风格一致
- 禁止 any 类型,类型必须完备
- 注释解释 why 而非 what

### 一致性
- 全项目必须始终保持统一
- 命名、结构、错误处理、状态管理一致
- 遵循已定义的契约规范

### 测试
- 所有功能必须有 E2E 测试
- 用户路径优先,100% 覆盖
- 每个节点做极限/边界测试
- 禁止使用假数据测试
- 禁止"假装"测试
- 宁可多测,不要省事

## 产品定位

WriteNow 是创作者的 IDE —— 用 Cursor 对程序员的革命，去革命创作者的写作体验。
用户不是在"写文档"，是在"构建文学世界"。

## 技术栈

| 层次 | 技术 | 说明 |
|------|------|------|
| 前端框架 | React 18 + TypeScript | 严格模式 |
| 样式 | Tailwind CSS v4 | 暗色/亮色/自定义主题 |
| 编辑器 | TipTap (ProseMirror) | 双模式：Markdown / 富文本 |
| 组件库 | shadcn/ui | Cursor/Linear 风格 |
| 桌面框架 | Electron | 无边框窗口 |
| 本地数据 | SQLite (better-sqlite3) | 含 FTS5 全文索引 |
| 向量存储 | sqlite-vec | 语义搜索支持 |
| 状态管理 | Zustand | 轻量级 |
| AI 服务 | Claude API / OpenAI API | 流式响应，支持中转站 |
| Embedding | text2vec-base-chinese | 本地模型 ~100MB |
| 国际化 | i18next | 中/英双语 |

## 平台支持

- **Windows 10/11**：首要支持，主要开发测试平台
- **macOS 10.15+**：次要支持，需要 Cmd 键适配
- **Linux**：未来考虑

## 核心设计参考

- 完整规范文档：`openspec/specs/writenow-spec/spec.md`
- Manus 上下文工程参考：`docs/reference/manus-context-engineering/`
- src 目录包含权威 UI 设计，所有前端开发必须以此为准

## 目录结构

```
WriteNow/
├── electron/                    # Electron 主进程
│   ├── main.cjs
│   ├── preload.cjs
│   └── ipc/                     # IPC 处理器
├── src/                         # 前端源码
│   ├── components/              # UI 组件
│   │   ├── Editor/              # TipTap 编辑器
│   │   ├── AI/                  # AI 交互组件
│   │   └── Sidebar/             # 侧边栏
│   ├── stores/                  # Zustand 状态
│   ├── hooks/                   # 自定义 Hooks
│   ├── lib/                     # 工具函数
│   └── locales/                 # i18n 语言文件
├── models/                      # 本地 AI 模型
├── docs/                        # 文档和参考资料
└── openspec/                    # OpenSpec 规范
```

## 工作流程

本仓库沿用 openspec-rulebook-github-delivery 工作流：
- GitHub 是并发与交付唯一入口：Issue -> Branch -> PR -> Checks -> Auto-merge
- Issue 号 N 是任务唯一 ID
- 分支名：task/N-slug
- 每个 commit message 必须包含 (#N)
- PR body 必须包含 Closes #N

## 本地开发

```bash
npm install
npm run electron:dev
```

## 当前 Sprint

Sprint 1：可用的编辑器（1-2周）
- [ ] TipTap 编辑器集成
- [ ] 真实的文件保存/加载
- [ ] 自动保存 + 崩溃恢复
- [ ] 双模式编辑（Markdown / 富文本）
