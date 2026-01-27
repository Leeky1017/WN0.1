# P3-001: 随包资源策略 —— 字体/本地模型/预编译依赖 + 自动化验收

## 元信息

| 字段 | 值 |
|------|-----|
| ID | P3-001 |
| Phase | P3 - 打包与离线体验 |
| 优先级 | P1 |
| 状态 | Planned |
| 依赖 | P2-001 |

## 必读前置（执行前必须阅读）

- [ ] `openspec/specs/sprint-write-mode-ide/spec.md`（“体积不设上限，体验优先”约束）
- [ ] `design/05-packaging.md`（资源布局/合规/验收）
- [ ] `design/02-editor-performance.md`（资源加载不应拖慢输入）
- [ ] `openspec/specs/sprint-open-source-opt/spec.md`（本地 LLM/多模型策略若涉及）

## 目标

以“体积换体验”的方式提升 Write Mode 的开箱体验：

1) 安装后无需额外下载即可进入可写状态
2)（可选）本地 LLM 模型随包，离线也能 Tab 续写
3) native deps 预编译，避免运行时编译/报错

## 任务清单

- [ ] 1) 明确随包资源清单（写入 design）
  - [ ] 字体：默认 1–2 套（避免首次渲染卡顿）
  - [ ] 模型：默认 1 个推荐 gguf（如启用本地 LLM）
  - [ ] 其他：模板/图标/素材（按需）
- [ ] 2) electron-builder / release pipeline 配置
  - [ ] `extraResources` 放置 models/fonts
  - [ ] 首次启动复制到 userData（只读 resources → 可写目录）
- [ ] 3) native deps 预编译策略落地
  - [ ] 在 CI/release 中执行必要的 rebuild
  - [ ] 对每个平台做最小 smoke（require + 轻量调用）
- [ ] 4) 自动化验收（可被 CI 或 release script 执行）
  - [ ] 启动到可输入 < 3s（冷启动预算）
  - [ ] 日志落盘可取证（main.log）
  - [ ] 若随包模型存在：启用本地 LLM 后无需下载即可触发（或至少模型可被检测到）

## 验收标准

- [ ] 安装包启动后可进入 Write Mode（无需额外配置）
- [ ] 随包资源可被正确复制/识别（路径稳定、升级不破坏）
- [ ] 模型/资源合规信息齐全（来源/许可证/hash/版本）

## 产出

- `design/05-packaging.md` 更新：资源清单与合规记录
- 打包配置更新（`electron-builder` / release scripts）
- 验收脚本或 E2E smoke（用于 release 前验证）

