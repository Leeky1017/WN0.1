# Codex 阶段 0 任务: 基础设施与规范建立

---

## 宪法级约束 (Constitutional Constraints)

以下约束具有最高优先级,任何任务执行都必须遵守:

### 1. 代码质量约束

代码必须同时满足"正确"和"好"两个标准:

正确的代码: 功能符合需求,边界处理完备,无运行时错误
好的代码: 可读性强,可维护,可测试,风格一致

具体要求:
- 变量命名清晰,函数职责单一
- 注释解释 why 而非 what
- 模块边界清晰,依赖方向一致
- 纯函数优先,副作用隔离
- TypeScript 类型覆盖关键路径,禁止 any
- 错误处理规范统一

### 2. 一致性约束

全项目必须始终保持统一:
- 命名风格统一 (文件、变量、函数、组件)
- 目录结构统一
- 错误处理方式统一
- 状态管理模式统一
- IPC 通道格式统一

### 3. 测试约束 (绝对要求)

所有功能必须配套完备的 E2E 测试:

要求:
- 用户路径优先: 测试必须模拟真实用户行为
- 100% 覆盖: 所有功能路径必须有测试覆盖
- 极限/边界测试: 每个测试节点必须做足够的边界条件测试
- 宁可多测,不要省事

禁止:
- 禁止使用假数据测试 (fake/mock data 仅用于隔离依赖,不用于替代真实逻辑)
- 禁止"假装"测试 (随便写点东西让测试通过)
- 禁止跳过边界条件

测试必须包括:
- 正常路径
- 错误路径
- 边界条件 (空值、超大值、特殊字符等)
- 并发/竞态场景 (如适用)

---

## 任务 1: 更新 AGENTS.md

将以上宪法级约束写入 AGENTS.md,作为所有 Codex 任务的最高准则。

修改文件: /home/leeky/work/WriteNow/AGENTS.md

新增内容:

```markdown
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
```

---

## 任务 2: 创建 IPC 契约规范

创建文件: openspec/specs/api-contract/spec.md

内容要求:

1. 定义所有 IPC 通道的请求/响应格式
2. 每个通道必须包含:
   - 通道名称 (domain:action 格式)
   - 请求参数类型 (TypeScript 接口)
   - 响应数据类型 (TypeScript 接口)
   - 错误码定义
   - 错误响应格式

3. 必须覆盖以下通道:
   - file:list, file:read, file:write, file:create, file:delete
   - ai:skill:run, ai:skill:cancel
   - search:fulltext, search:semantic
   - embedding:encode, embedding:index
   - version:list, version:create, version:restore, version:diff
   - update:check, update:download, update:install

4. 定义通用响应格式:
   - 成功响应结构
   - 错误响应结构
   - 分页响应结构 (如适用)

参考: 核心规范 openspec/specs/writenow-spec/spec.md 第 700-736 行

---

## 任务 3: 创建代码规范文档

创建文件: docs/code-standards.md

内容要求:

### 3.1 目录结构规范
- 明确每个目录的职责
- 文件放置规则
- 新增文件的命名规范

### 3.2 命名规范
- 文件命名: kebab-case (组件用 PascalCase)
- 变量命名: camelCase
- 常量命名: UPPER_SNAKE_CASE
- 类型命名: PascalCase
- 接口命名: I 前缀或无前缀 (保持一致即可)

### 3.3 组件设计规范
- 组件文件结构
- Props 接口定义
- 状态管理接入方式
- 样式编写规范

### 3.4 错误处理规范
- 错误类型定义
- 错误抛出规范
- 错误日志规范
- 用户反馈规范

### 3.5 状态管理规范
- Zustand store 结构
- Selector 设计
- Action 设计
- 异步操作处理

### 3.6 IPC 调用规范
- 调用方式
- 错误处理
- Loading 状态管理
- 类型安全保证

---

## 任务 4: 创建核心类型定义

创建/更新以下类型定义文件:

src/types/ipc.ts
- IPC 请求/响应通用类型
- 各通道的具体类型
- 错误类型

src/types/editor.ts
- 编辑器状态类型
- 文档类型
- 编辑模式类型

src/types/ai.ts
- SKILL 类型
- AI 配置类型
- 流式响应类型

src/types/models.ts
- Article 类型
- Project 类型
- Character 类型
- 其他数据模型

要求:
- 类型必须与 IPC 契约规范一致
- 类型必须与数据库 Schema 一致
- 禁止使用 any

---

## 任务 5: 创建测试规范文档

创建文件: docs/testing-standards.md

内容要求:

### 5.1 测试原则
- 用户路径优先
- 100% 功能覆盖
- 边界条件必测

### 5.2 测试分类
- 单元测试: 纯函数,工具函数
- 集成测试: IPC 通道,状态管理
- E2E 测试: 完整用户流程

### 5.3 测试命名规范
- describe: 被测试的模块/功能
- it/test: should + 预期行为

### 5.4 边界测试清单
- 空值/undefined/null
- 空字符串/空数组/空对象
- 超长字符串
- 特殊字符
- 并发操作
- 网络异常

### 5.5 禁止事项
- 禁止 skip 测试
- 禁止假数据替代真实逻辑
- 禁止只测试 happy path

---

## 输出清单

完成后应存在以下文件:

```
AGENTS.md                              (更新)
openspec/specs/api-contract/spec.md    (新建)
docs/code-standards.md                 (新建)
docs/testing-standards.md              (新建)
src/types/ipc.ts                       (新建/更新)
src/types/editor.ts                    (新建/更新)
src/types/ai.ts                        (新建/更新)
src/types/models.ts                    (新建/更新)
```

---

## 验收标准

- [ ] AGENTS.md 包含宪法级约束
- [ ] IPC 契约规范覆盖所有通道
- [ ] 代码规范文档完整可执行
- [ ] 测试规范文档明确边界要求
- [ ] 类型定义与契约规范一致
- [ ] 所有文档无矛盾,风格统一
