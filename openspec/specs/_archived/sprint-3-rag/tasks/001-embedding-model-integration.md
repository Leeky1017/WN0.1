# 任务 001: 本地 Embedding 模型打包与调用

## 目标

集成本地 Embedding 模型 `shibing624/text2vec-base-chinese`，实现**离线可用**的向量生成能力，并提供主进程侧的统一调用接口（可被 sqlite-vec 写入、语义检索与 RAG 管线复用）。

## 依赖

- Sprint 1：文件保存/加载闭环（至少可获得文档内容与路径）
- 任务 003：sqlite-vec 向量存储配置（用于写入与相似度查询）

## 实现步骤

1. 明确运行时方案（与核心规范一致）：
   - 方案 A：`@xenova/transformers`（transformers.js，推荐，纯 JS）
   - （备选）ONNX Runtime：`onnxruntime-node`
2. 明确模型资产策略（“打包”要求）：
   - 构建时随 Electron 发布包携带（`extraResources` / `asarUnpack`），或
   - 首次启动下载到用户数据目录并校验（之后离线可用）
3. 在主进程实现 Embedding Service：
   - 统一 `load()`（懒加载 + 缓存 + 失败重试）
   - 统一 `embed(text | string[]) -> number[] | number[][]`
   - 返回维度与模型信息（便于向量表维度校验）
4. 暴露 IPC（最小闭环）：
   - `embedding:embed`：输入文本/数组，输出向量
   - （可选）`embedding:status` / `embedding:cancel`：用于后台队列与取消
5. 加入可观测错误与恢复路径：
   - 模型缺失/损坏/加载失败必须返回明确错误码与可读信息
   - 提供“重新初始化/重新下载”的可执行入口（CLI 或 IPC）

## 新增/修改文件

- `electron/lib/embedding.cjs` - Embedding Service（新增）
- `electron/ipc/embedding.cjs` - Embedding IPC（新增）
- `electron/main.cjs` - 注册 IPC（修改）
- `electron-builder.json` - 打包模型资源策略（修改，若选择随包发布）

## 验收标准

- [ ] 在无网络环境下可生成文本 embedding（离线可用）
- [ ] embedding 维度稳定可读，并可用于后续 sqlite-vec 写入/检索
- [ ] 模型缺失/损坏时返回明确错误信息与恢复路径（禁止 silent failure）
- [ ] IPC 调用可并发且可控（至少不阻塞 UI 主线程）

## 参考

- 核心规范：`openspec/specs/writenow-spec/spec.md` 第 194-215 行（本地 Embedding 模型选择 + 技术方案）
- 核心规范：`openspec/specs/writenow-spec/spec.md` 第 189-193 行（语义搜索核心能力）

