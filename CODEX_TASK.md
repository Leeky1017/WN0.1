# Codex 任务：GitHub 同步 + Sprint 2 规范创建

---

## 任务一：将 WriteNow 仓库同步到 GitHub

### 任务身份
你是 WriteNow 项目的 DevOps 助手。

### 目标仓库
- URL: https://github.com/Leeky1017/WN0.1.git

### 执行步骤

1. **检查当前 Git 状态**
```bash
cd /home/leeky/work/WriteNow
git status
```

如果尚未初始化 Git：
```bash
git init
```

2. **配置远程仓库**
```bash
git remote add origin https://github.com/Leeky1017/WN0.1.git
```

如果已存在 origin：
```bash
git remote set-url origin https://github.com/Leeky1017/WN0.1.git
```

3. **确保 .gitignore 存在并包含**：
```
node_modules/
dist/
dist-electron/
.env
*.log
.DS_Store
Thumbs.db
```

4. **添加并提交所有文件**
```bash
git add .
git commit -m "feat: WriteNow v0.1 - 完整规范和 Sprint 1 任务卡"
```

5. **推送到 GitHub**
```bash
git branch -M main
git push -u origin main
```

### 验收标准
- [ ] 远程仓库包含最新代码
- [ ] 包含 `openspec/specs/writenow-spec/spec.md`
- [ ] 包含 `openspec/specs/sprint-1-editor/` 及 5 个任务卡

---

## 任务二：创建 Sprint 2 分支规范和任务卡

### 任务身份
你是 WriteNow 项目的架构师助手。

### 背景
核心规范位于 `openspec/specs/writenow-spec/spec.md`。
Sprint 2 的目标是：**AI 能力（2-3周）**

### Sprint 2 范围
- Claude API 集成
- 3 个基础 SKILL（润色、扩写、精简）
- Diff 展示与确认机制
- 版本历史记录

### 创建分支规范
**文件路径**：`openspec/specs/sprint-2-ai/spec.md`

### 创建任务卡片
**目录**：`openspec/specs/sprint-2-ai/tasks/`

| 编号 | 文件名 | 任务 |
|------|--------|------|
| 001 | `001-claude-api-integration.md` | Claude API 集成（支持中转站） |
| 002 | `002-skill-system-core.md` | SKILL 系统核心架构 |
| 003 | `003-basic-skills.md` | 3 个基础 SKILL 实现 |
| 004 | `004-diff-display.md` | Diff 展示与确认机制 |
| 005 | `005-version-history.md` | 版本历史记录与回退 |

### 重要参考
- AI 服务配置：核心规范第 597-628 行（API 格式、中转站支持）
- SKILL 系统：核心规范第 48-67 行
- 上下文工程：核心规范第 68-150 行
- AI 交互 UX：核心规范第 323-345 行
- 版本管理：核心规范第 68-76 行
- 数据库 Schema（skills 表）：核心规范第 798-812 行

### 格式要求
- 规范使用 Purpose/Requirements/Scenario 结构（参考 Sprint 1 规范）
- 任务卡使用：目标、依赖、实现步骤、新增/修改文件、验收标准
- 所有内容必须与核心规范保持一致
- 流式响应是必须的

### 输出清单
```
openspec/specs/sprint-2-ai/
├── spec.md
└── tasks/
    ├── 001-claude-api-integration.md
    ├── 002-skill-system-core.md
    ├── 003-basic-skills.md
    ├── 004-diff-display.md
    └── 005-version-history.md
```

### 验收标准
- [ ] Sprint 2 规范创建完成
- [ ] 5 个任务卡片创建完成
- [ ] 所有内容与核心规范一致
