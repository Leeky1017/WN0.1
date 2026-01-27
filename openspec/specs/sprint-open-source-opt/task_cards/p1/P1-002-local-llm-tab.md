# P1-002: 本地 LLM Tab 续写（node-llama-cpp）

Status: done  
Issue: #293  
PR: https://github.com/Leeky1017/WN0.1/pull/298  
RUN_LOG: openspec/_ops/task_runs/ISSUE-293.md

## 元信息

| 字段 | 值 |
|------|-----|
| ID | P1-002 |
| Phase | 1 - 本地 LLM 体验 |
| 优先级 | P1 |
| 状态 | Done |
| 依赖 | P1-001（可选：复用 editor extension 组织方式） |

## 必读前置（执行前必须阅读）

- [x] `openspec/specs/sprint-open-source-opt/spec.md`
- [x] `openspec/specs/sprint-open-source-opt/design/03-local-llm-tab.md`
- [x] `writenow-frontend/electron/main.ts` / `preload.ts`（IPC/bridge 模式）
- [x] `src/types/ipc-generated.ts`（错误码与 Envelope；新增通道需先更新契约）

## 目标

- 提供 Cursor 风格 Tab 续写：停顿触发、灰色 ghost 预览、Tab 接受、Esc 取消。
- 续写默认不开启；启用需用户确认并按需下载模型。

## 任务清单

- [x] 选型并验证 `node-llama-cpp` 在 Electron 打包与 CI 环境可用（含无 GPU fallback）。
- [x] 设计本地模型管理：
  - [x] 模型列表（默认推荐 + 低配备选）
  - [x] 下载/校验（hash/size）
  - [x] 存储位置：`app.getPath('userData')/models`
- [x] 主进程/后端服务实现本地 completion 服务：
  - [x] 初始化（无模型 → 明确返回“未就绪”）
  - [x] 生成（短输出、超时、取消）
  - [x] 资源释放（context/session 生命周期）
- [x] Renderer：TipTap Extension 显示 ghost suggestion，并正确处理键盘语义（Tab/Esc/继续输入）。
- [x] 设置页：启用开关 + 下载进度 + 错误提示 + 一键禁用/清理。
- [x] E2E：
  - [x] 未启用/未安装模型时 UI 状态正确
  - [x] 启用后可出现 ghost、Tab 接受、Esc 取消、继续输入自动取消（需提供真实 GGUF 路径）

## 验收标准

- [x] 未启用/未下载模型时无噪声异常，UI 状态可理解。
- [x] 触发/取消语义正确：继续输入/切换文档会取消正在生成的 suggestion。
- [x] 性能可接受：常见场景下 1s 内给出 ghost suggestion（允许在低配机器降级）。
- [x] Playwright E2E 覆盖核心交互路径。

## 产出

- 代码：本地 LLM 服务 + TipTap Autocomplete Extension + 设置页/模型下载逻辑。
- 测试：E2E 覆盖与必要的单元测试。
- 文档：记录模型体积、存储、隐私与排障方法。
