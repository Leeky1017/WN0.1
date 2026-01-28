# 05 - 打包与分发策略（体积换体验）

> 前提：WN 不以安装包体积为约束，允许用“更大体积”换取“更少摩擦、更强性能、更好体验”。

---

## 1. 打包目标

1) **开箱即用**：安装后首次启动即可写作（无需额外下载/配置）。
2) **离线可用尽可能多**：编辑/保存/搜索/版本/本地 LLM（若启用）在离线下可用。
3) **减少运行时编译/下载**：native deps、模型、字体尽量随包。

---

## 2. 当前基础（Repo 事实）

- electron-builder 配置：`writenow-frontend/electron-builder.json`
- backend 资源随包：`extraResources` 已把 `writenow-theia/browser-app` 打包到 `theia-backend`
- Electron 主进程：`writenow-frontend/electron/main.ts`（支持 `WN_USER_DATA_DIR`、log 落盘）
- 资源准备脚本：`writenow-frontend/scripts/prepare-packaging.mjs`（强制构建 Theia backend + 补齐关键资源；可选下载随包模型）
- Theia backend 运行时依赖：`extraResources` 同步随包 `writenow-theia/node_modules` 到 `theia-backend/node_modules`（保证 `better-sqlite3` 等 external native deps 在 packaged 环境可被 require）
- 字体：已移除 Google Fonts 依赖，改为随包本地字体（`@fontsource-variable/*`）
- 合规清单：`writenow-frontend/resources/licenses/THIRD_PARTY_ASSETS.md`

### 2.0.1 打包一致性风险（Repo 事实）

`writenow-frontend/electron/main.ts` 在 packaged 模式下会从 `process.resourcesPath/theia-backend` 启动后端；
该目录来自 `writenow-frontend/electron-builder.json` 的 `extraResources`。

此前 `writenow-frontend/package.json` 的打包脚本只执行 `electron-vite build` + `electron-builder`，
**未强制先构建 Theia backend**（`writenow-theia/browser-app`）。

风险：发布安装包时可能携带“旧后端/缺后端”，导致用户启动失败或功能缺失（高成本事故）。

落地：`npm run package*` 统一前置执行 `node scripts/prepare-packaging.mjs`，把
“build theia backend → 校验/补齐关键资源 → package” 变成不可绕过的链路（CI/release MUST 使用该路径）。

---

## 2.1 打包“真正影响 Write Mode 体验”的东西

Write Mode 的体验主要受以下资源影响（按优先级）：

1) **Theia backend / standalone-rpc**
- 这是文件读写、项目管理、部分 AI service 的依赖
- 目标：随包提供，启动即用，不依赖外部安装

2) **数据库/索引引擎**
- 若使用 sqlite/fts/sqlite-vec 等：必须确保 native 模块随包可用（避免运行时编译）

3) **本地 LLM（若启用）**
- 模型文件 + 推理 runtime（node-llama-cpp 等）
- 目标：默认模型随包（体验优先），用户可替换

4) **字体与 UI 资产**
- 写作质感的关键，但必须控制首次渲染成本（见 `design/02-editor-performance.md`）

---

## 3. 本地 LLM 的“随包策略”（核心建议）

### 3.1 两种模式（按体验优先）

A) **随包携带默认模型（推荐）**
- Pros：零摩擦；Tab 续写可立即使用；离线体验更强
- Cons：安装包变大（可接受）

B) 首次启用再下载（备选）
- Pros：包更小
- Cons：需要下载/等待；失败概率更高

WN 的策略：既然“体积不是问题”，优先 A。

### 3.2 资源布局（建议）

- `extraResources/models/<model>.gguf`（随包只读资源）
- 在用户启用本地 LLM / 点击“校验/加载”时按需复制到 `app.getPath('userData')/models/`（用户可管理/替换；避免拖慢冷启动）

原因：
- extraResources 目录通常只读，不能在其中写入缓存
- userData 是稳定的可写位置，适合版本升级与用户控制

### 3.2.1 最小实现（代码示例：按需复制）

```ts
import fs from 'node:fs'
import path from 'node:path'
import { app } from 'electron'

function ensureBundledModel(modelFilename: string) {
  const bundled = path.join(process.resourcesPath, 'models', modelFilename)
  const targetDir = path.join(app.getPath('userData'), 'models')
  const target = path.join(targetDir, modelFilename)

  if (fs.existsSync(target)) return target

  fs.mkdirSync(targetDir, { recursive: true })
  fs.copyFileSync(bundled, target)
  return target
}
```

Why：复制到 userData 能让用户后续替换模型、并避免在只读 resources 里写缓存。

### 3.3 许可证与合规

- 模型文件随包前必须在 `design/05-packaging.md` 中记录：来源、许可证、hash、版本
- UI 中必须明确提示：
  - 模型文件大小
  - 本地运行（不上传）
  - 存储路径

#### 3.3.1 当前随包资源清单（实现态）

> 说明：
> - 字体通过 `@fontsource-variable/*` 进入 renderer 资源（不依赖 Google Fonts）。
> - 模型文件默认不入 git；打包时可选下载后随包（见 `writenow-frontend/resources/models/README.md`）。

| 资源 | 来源 | 许可证 | 版本 | 校验信息 |
|------|------|--------|------|----------|
| Inter Variable | `@fontsource-variable/inter` | OFL-1.1 | 5.2.8 | publishHash `b8ad7daf87329f52` |
| Noto Serif SC Variable | `@fontsource-variable/noto-serif-sc` | OFL-1.1 | 5.2.10 | publishHash `510fa6b6bbdfb305` |
| Qwen2.5 0.5B Instruct (Q4_K_M, GGUF) | HuggingFace（见 `LOCAL_LLM_MODELS`） | 待确认（发布前必须核对） | - | SHA256 `750f8f144f0504208add7897f01c7d2350a7363d8855eab59e137a1041e90394` |
| Qwen2.5 0.5B Instruct (Q2_K, GGUF) | HuggingFace（见 `LOCAL_LLM_MODELS`） | 待确认（发布前必须核对） | - | SHA256 `0183050b0aa6a58c451fb558d3fdfa550c3dd6ba835561805778d30bdd79e44a` |

---

## 4. 预编译 native deps

对性能敏感的能力（例如本地 LLM、索引）优先使用预编译：

- `node-llama-cpp`（如引入）
- `better-sqlite3` 等 native 模块

策略：
- CI 构建时进行 `electron:rebuild` 或等价步骤
- release pipeline 生成 per-platform 安装包

落地（实现态）：
- `writenow-frontend/scripts/prepare-packaging.mjs` 在打包前对 `writenow-theia` 执行 `electron-rebuild`（匹配当前 Electron 版本的 ABI），避免 packaged 环境出现 `NODE_MODULE_VERSION` 不匹配导致的崩溃。

---

## 4.1 性能优先的“依赖选择”策略（避免踩坑）

为了降低安装/运行时问题（也是低成本的一部分），依赖策略建议：

- 尽量选择“已有 prebuild 的 native 模块”或能在 CI 产出 prebuild 的模块
- 避免引入需要用户本地编译链的依赖（会把成本转嫁到用户/支持团队）
- 每个 native 依赖必须有：
  - 支持的平台矩阵（win/mac/linux；x64/arm64）
  - CI 验证（最小 smoke：require + 简单调用）

---

## 5. 性能优先的运行时策略

- GPU：默认启用；在不稳定环境（CI/WSL）使用 `WN_DISABLE_GPU=1` 降级（现有实现已支持）
- 日志：默认落盘 `main.log`，E2E/用户报错可直接取证

---

## 6. 自动更新

即使包大，更新也必须“低打扰”：

- 后台下载（不阻塞写作）
- 下次启动生效
- 可跳过版本

> 具体更新机制以 `writenow-spec` 的更新章节为准。

---

## 7. 打包验收（必须可自动化）

- 安装包可启动
- 启动后 3s 内可进入可输入状态（Write Mode）
- 随包模型存在时：Tab 续写无需下载即可触发（若功能开启）
- 日志落盘可用（`<userData>/logs/main.log`）

### 7.1 “体积不设上限”的副作用与对策

体积允许变大，但必须避免两个风险：

1) **安装/更新耗时变长**
- 对策：启用差分更新（delta），后台下载，下次启动生效

2) **启动时资源加载过重**
- 对策：资源随包 ≠ 启动时全加载
  - 字体：只加载默认字体
  - 模型：只在启用本地 LLM 时加载
  - 索引：后台构建/增量构建（不阻塞输入）
