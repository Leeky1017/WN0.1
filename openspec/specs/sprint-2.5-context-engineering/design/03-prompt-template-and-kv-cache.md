# Design: Prompt Template System & KV-Cache Strategy

## Core idea

KV-Cache 的收益来自“相同前缀不重复计算”。因此 Prompt 结构必须把**稳定段落**前置，并避免在稳定段落中出现动态噪声（时间戳/随机数/不稳定排序）。

## Stable prefix composition

稳定前缀建议由以下部分顺序组成（顺序固定）：
1. 产品/角色约束（WriteNow system identity）
2. 当前 SKILL 定义（固定模板，可版本化）
3. 输出格式约束（固定 schema/markdown 约束）
4. Rules 层（style/terminology/constraints，文件名顺序固定）

约束：
- 稳定前缀 MUST NOT 依赖“本次选区内容”或“本次检索结果”。
- `.writenow/rules/*` 发生变更会改变稳定前缀：这是可接受的，但必须可追溯（变更时间、来源文件）。

## Dynamic suffix composition

动态后缀建议放入 user content，并按层级固定顺序：
1. Settings（按需加载：人物/设定/时间线）
2. Retrieved（RAG/历史摘要/相关段落）
3. Immediate（选区/光标段落/前后文/用户指令）

所有动态内容必须带上可恢复指针（路径/id），避免把长内容永久塞进会话历史。

## Append-only conversation

会话级约束（适用于连续对话场景）：
- 存储层：对话记录必须 append-only（只追加，不覆写旧消息）。
- 发送层：若需要“摘要压缩”，优先以**新会话**方式启动（system + summary + 新消息），避免在同一会话内重写历史内容导致缓存失效与调试困难。

## Tool list stability (design note)

参考 Manus “Mask, Don’t Remove”：工具/skills 列表应尽量稳定，通过状态/可用性标记实现“禁用”而不是动态增减列表。Sprint 2.5 只要求 PromptTemplateSystem 预留：
- stable tools section（可选）
- per-request availability mask（可选，后续 Sprint 工程化）

