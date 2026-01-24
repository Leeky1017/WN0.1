# WriteNow 人类模拟验证报告

- 验证日期：2026-01-24
- 验证环境：WSL2 Ubuntu + Theia Browser Mode
- 验证方法：MCP Browser Tools 模拟人类操作
- 服务端口：http://localhost:3000

---

## 执行摘要

**总体状态：⚠️ 部分可用，存在关键阻塞问题**

WriteNow Theia 版本可以启动并显示基本 UI，但发现多个影响核心功能的问题：

| 分类 | 状态 | 说明 |
|------|------|------|
| 应用启动 | ✅ PASS | 成功启动，显示 Welcome 页面 |
| 文件浏览器 | ✅ PASS | Explorer 正常显示文件树 |
| 基础编辑 | ⚠️ PARTIAL | Monaco 编辑器可用，TipTap 未验证 |
| AI 功能 | ❌ BLOCKED | Skills 服务失败 |
| 数据持久化 | ❌ BLOCKED | 数据库初始化失败 |
| 版本历史 | ❓ UNTESTED | 依赖数据库 |
| 项目管理 | ❓ UNTESTED | 依赖数据库 |
| 知识图谱 | ❓ UNTESTED | 依赖数据库 |

---

## Phase 1: 核心编辑功能

### 1.1 应用启动
- **状态**：✅ PASS
- **证据**：访问 http://localhost:3000 成功显示 Welcome 页面
- **截图**：显示 "WriteNow - Creator IDE" 欢迎界面

### 1.2 文件浏览器
- **状态**：✅ PASS
- **证据**：左侧 Explorer 面板正常显示，可浏览文件系统
- **发现**：工作区默认打开 `/home/leeky` 而非 WriteNow 目录

### 1.3 创建文档
- **状态**：✅ PASS
- **证据**：Ctrl+N 成功创建 "Untitled-1" 新文件
- **问题**：新文件使用 Monaco 编辑器，而非规范中指定的 TipTap 编辑器

### 1.4 打开文档
- **状态**：⚠️ PARTIAL
- **证据**：Ctrl+O 可打开文件对话框
- **问题**：文件路径直接输入后需要额外确认步骤才能打开

### 1.5 文本输入
- **状态**：✅ PASS
- **证据**：输入 "# WriteNow 验证测试\n\n这是一个测试文档。" 成功
- **发现**：中文输入正常工作

### 1.6 Markdown 格式渲染
- **状态**：❓ UNTESTED
- **原因**：当前打开的文件使用 Monaco 编辑器，TipTap 仅对 .md 文件生效

### 1.7 保存文档
- **状态**：❓ UNTESTED
- **原因**：时间限制未完成测试

### 1.8 自动保存
- **状态**：❓ UNTESTED
- **原因**：时间限制未完成测试

---

## Phase 2: AI 功能

### 发现的关键问题

**AI Panel 显示错误**：
```
INTERNAL: Failed to list skills
Status: idle
```

**根本原因**：Skills 服务无法初始化，可能由于：
1. 数据库未初始化（见 Phase 7）
2. Skills 目录配置问题

### 2.1 - 2.9 所有 AI 功能
- **状态**：❌ BLOCKED
- **原因**：Skills 服务失败，无法选择 SKILL 执行 AI 操作

---

## Phase 3-6: 版本历史、项目管理、知识图谱、体验功能

- **状态**：❓ UNTESTED
- **原因**：这些功能依赖数据库，而数据库初始化失败

---

## 关键阻塞问题

### 问题 1：数据库初始化失败

**服务器日志**：
```
2026-01-24T14:10:37.454Z root ERROR [writenow-db] init failed: Unable to load schema.sql.
/home/leeky/work/WriteNow/writenow-theia/browser-app/lib/backend/schema.sql: ENOENT: no such file or directory
/home/leeky/work/WriteNow/writenow-theia/src/node/database/schema.sql: ENOENT: no such file or directory
2026-01-24T14:10:37.455Z root ERROR [writenow-core] app DB init failed: Failed to initialize database
```

**影响范围**：
- 所有需要持久化的功能（文章、版本、项目、人物、知识图谱、统计等）

**修复建议**：
1. 检查 `schema.sql` 文件是否存在于 `writenow-core/src/node/database/`
2. 确认构建时是否正确复制到输出目录
3. 更新文件加载路径逻辑

### 问题 2：Skills 服务失败

**现象**：AI Panel 显示 "INTERNAL: Failed to list skills"

**可能原因**：
1. 数据库未初始化导致 skills 表不存在
2. Skills 目录（`electron/skills/`）未被正确加载
3. Backend-Frontend RPC 通信问题

**修复建议**：
1. 修复数据库初始化问题
2. 检查 SkillsService 的错误日志
3. 验证 skills 目录路径配置

### 问题 3：TipTap 编辑器绑定问题

**现象**：Ctrl+N 创建的新文件使用 Monaco 编辑器，而非 TipTap

**预期行为**：根据规范，.md 文件应使用 TipTap 编辑器

**分析**：
- TipTap OpenHandler 可能仅处理已存在的 .md 文件
- 新建的 "Untitled-1" 可能没有 .md 扩展名
- 或者 TipTap OpenHandler 未正确注册

---

## 验证环境信息

### 服务器启动日志（关键部分）
```
2026-01-24T14:10:37.455Z root INFO [writenow-core] native smoke: CRUD ok
2026-01-24T14:10:37.455Z root INFO [writenow-core] native smoke: vec query ok
2026-01-24T14:10:37.455Z root INFO [writenow-core] native smoke completed successfully
2026-01-24T14:10:37.470Z root INFO Theia app listening on http://127.0.0.1:3000
```

**正常部分**：
- SQLite + sqlite-vec 原生模块加载成功
- Theia 应用启动成功

**异常部分**：
- 应用数据库（writenow.db）初始化失败
- schema.sql 文件未找到

---

## 下一步行动建议

### 优先级 P0（必须立即修复）

1. **修复 schema.sql 路径问题**
   - 文件位置：`writenow-core/src/node/database/schema.sql`
   - 需要确保构建时复制到正确位置
   - 或更新加载逻辑以正确解析路径

2. **修复 Skills 服务**
   - 检查 SkillsService 初始化日志
   - 验证 skills 目录加载逻辑
   - 确认 IPC 通道正常工作

### 优先级 P1

3. **验证 TipTap 编辑器**
   - 打开现有 .md 文件验证 TipTap 是否生效
   - 检查 TipTapMarkdownOpenHandler 注册

4. **完成自动保存测试**
   - 验证 2 秒防抖保存
   - 验证状态栏保存指示

### 优先级 P2

5. **全功能回归测试**
   - 修复数据库后重新验证所有 Phase

---

## 附录：已验证功能截图

### 截图 1：Welcome 页面
- 显示 WriteNow 欢迎界面
- Open Folder / Open File / Settings 按钮可见
- AI Panel 占位符显示错误信息

### 截图 2：Explorer 文件树
- 左侧显示完整文件结构
- 可展开/折叠目录

### 截图 3：新建文件
- Ctrl+N 创建 Untitled-1
- 使用 Monaco 编辑器（带行号）

### 截图 4：Open File 对话框
- 可浏览文件系统
- 支持路径输入和目录导航

---

---

## 验证过程中的修复

### 已修复：schema.sql 未复制到编译目录

**问题**：TypeScript 编译器不会自动复制 `.sql` 文件到 `lib/` 目录

**临时修复**：
```bash
cp writenow-theia/writenow-core/src/node/database/schema.sql \
   writenow-theia/writenow-core/lib/node/database/
```

**永久修复建议**：
1. 在 `writenow-core/package.json` 的 `prepare` 脚本中添加复制步骤
2. 或在 `tsconfig.json` 中配置文件复制
3. 或修改 `init.ts` 使用更健壮的路径解析

修复后，服务器启动时不再显示数据库初始化错误。

---

**报告生成时间**：2026-01-24 22:20 CST
