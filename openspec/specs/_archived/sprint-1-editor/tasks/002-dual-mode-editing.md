# 任务 002: 双模式编辑（Markdown / 富文本切换）

## 目标

实现同一文档在 **Markdown 模式** 与 **富文本模式** 间的即时切换：两种模式编辑同一份底层内容，切换不产生漂移，并为后续“导出 Markdown/Word”提供一致的数据通路。

## 依赖

- 任务 001：TipTap 编辑器基础集成
- 任务 005：Zustand 状态管理（需要增加 `editorMode` 与内容转换的状态/动作）

## 实现步骤

1. 明确 Sprint 1 的“底层数据一致”策略（二选一，优先选可实现且可验证的方案）：
   - 方案 A（推荐 Sprint 1）：**以 Markdown 文本作为存储/状态的单一真实来源**；富文本模式通过 TipTap 渲染 Markdown；切换与保存时以 Markdown 串行化。
   - 方案 B：以 ProseMirror JSON 作为单一真实来源；Markdown 模式以“可编辑的 Markdown 视图/转换器”展示与编辑（复杂度更高）。
2. 在 Zustand 中增加/统一编辑模式状态：
   - `editorMode: 'markdown' | 'richtext'`
   - `setEditorMode(mode)`
   - `convertContentIfNeeded(from, to)`（或在切换动作中完成）
3. 实现转换工具（放在 `src/lib/editor/*` 或 `src/components/Editor/*`）：
   - Markdown → TipTap（加载/切换到富文本时）
   - TipTap → Markdown（切换到 Markdown 或保存时）
   - 明确 Sprint 1 支持的节点集合（标题、加粗、斜体、列表、段落、引用/代码块等按需）
4. UI 切换入口：
   - 在编辑器顶部/状态栏提供模式切换按钮（与核心快捷键规范保持一致）
   - 切换时必须先处理脏状态：若未保存可先触发一次保存或先完成转换再保存（保持一致即可，但需可解释）
5. 联动文件打开行为：
   - 打开 `.md` 文档时默认进入 Markdown 模式（或读取用户默认设置）
   - 关闭文件/切换文件时，保证当前编辑状态能正确落到 store
6. 增加最小“稳定性校验”用例（可为手工步骤或自动测试）：
   - Markdown 输入 `# 标题`/`**加粗**`/列表 → 切到富文本 → 再切回 Markdown，内容不应丢失（在支持范围内）

## 新增/修改文件

- `src/stores/editorStore.ts` - 增加 `editorMode`/切换动作/转换时机
- `src/components/Editor/index.tsx` - 根据模式渲染不同视图，并在切换时调用转换
- `src/components/Editor/Toolbar.tsx` - 模式切换入口（若放在 Toolbar）
- `src/lib/editor/markdown.ts` - Markdown ↔ TipTap 转换工具（建议新增）
- `src/App.tsx` - 若需要提升 `editorMode` 的全局可控性/快捷键处理

## 验收标准

- [ ] 用户可随时在 Markdown / 富文本模式间切换
- [ ] 两种模式编辑同一文档，切换前后内容一致（在 Sprint 1 支持的节点集合内）
- [ ] `.md` 文件打开时默认进入 Markdown 模式（或按默认设置）
- [ ] 切换模式不会造成编辑内容“清空/重复/错乱”

## 参考

- 核心规范：`openspec/specs/writenow-spec/spec.md` 第 422-434 行（双模式编辑定义）
- 核心规范：`openspec/specs/writenow-spec/spec.md` 第 583-584 行（编辑器：TipTap + 双模式）
- 核心规范：`openspec/specs/writenow-spec/spec.md` 第 379-387 行（快捷键：保存/切换编辑预览等）
