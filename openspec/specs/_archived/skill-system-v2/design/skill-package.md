# Skill Package 设计（可分发技能包）

## Goals

- 把“写作 SKILL”从数据库行升级为可版本化、可审计、可分发的目录单元。
- 支持 package 内多 SKILL、多变体、多 workflow，且可整体启用/禁用与升级回滚。
- 与业界结构对齐（Codex/Claude skills）：`PACKAGE.md`/`SKILL.md` + `references/` + `assets/`。

## Package 结构（推荐）

```
<package-root>/
  PACKAGE.md
  LICENSE.txt                # 强烈建议（builtin 可内置）
  README.md                  # 可选
  skills/
    <skill-slug>/
      SKILL.md
      references/
      assets/
    <skill-slug-2>/
      SKILL.md
  routing/                   # 可选：路由配置（规则优先）
    rules.yml
```

## 示例：平台适配改写（refs 按需引用）

一个可直接落地的 package 示例：把同一篇文章改写为适配不同平台的版本（微信公众号/知乎/小红书/微博长文），并通过 `references/` 做 progressive disclosure：

```
rewrite-for-platform/
  PACKAGE.md
  skills/
    rewrite-for-platform/
      SKILL.md
      references/
        wechat-official.md
        zhihu-column.md
        xiaohongshu.md
        weibo-long.md
```

关键点：

- `SKILL.md` 声明一个 `platform` ref slot（见 `design/skill-format.md`），UI 通过扫描 `references/` 展示“平台列表”。
- refs 正文不随 SKILL 默认加载；仅在用户选择平台后才读取并注入 Prompt（节省 token，避免无关上下文）。
- 用户可以自行新增 `references/my-blog.md`，系统增量发现后自动出现在平台列表中（无需重启）。

### `PACKAGE.md` frontmatter（建议）

```yaml
---
id: pkg.writenow.builtin
name: WriteNow Built-in Skills
version: 1.0.0
description: Built-in writing skills shipped with the app.
author: WriteNow Team
license: Proprietary
minWriteNowVersion: 0.1.0
tags: [rewrite]
---
```

## 安装/更新/卸载（本地优先）

### 安装来源（V2 要求）

- 本地目录导入（解压后校验结构）
- 压缩包导入（zip 等）

> 市场下载/云端同步不在本规范强制范围，但安装器接口需可扩展。

### 安装位置与作用域

根据用户选择：

- Global：安装到 `<userData>/skills/packages/<packageId>/<version>/`
- Project：安装到 `<projectRoot>/.writenow/skills/packages/<packageId>/<version>/`

Builtin：随应用资源存在，不走安装流程（但走同一索引链路）。

### 更新策略（可回滚）

- 新版本安装时与旧版本并存（不同 `<version>/` 目录）
- DB 索引以 “active version” 指针决定生效版本
- 用户可回滚到旧版本（切换 active version，不丢文件）

### 卸载策略（安全）

- 卸载仅移除文件与索引；不删除与正文相关的历史（例如对话/版本快照）
- 若某 SKILL 正在执行/有进行中的 workflow：卸载 MUST 被拒绝或延迟（返回 `CONFLICT`）

## Package 与 Skill 的路由关系

Package 可以提供两类路由信息：

1. **规则路由（推荐）**：`routing/rules.yml`，适配 low/mid tier。
2. **语义路由提示（可选）**：在 `PACKAGE.md` 或 `SKILL.md` 中提供 `routingHints`，用于 high tier 消歧。

> Why：低端模型必须可用，规则路由应作为第一公民；语义路由只能是增强。

## 许可、来源与信任

V2 至少要求记录：

- package `id/version`
- 安装来源：builtin/local-import/zip-import/market（预留）
- 许可证字段（license）与作者（author）

UI 必须能展示来源与许可证，避免“未知来源技能”静默生效。

## 与现有系统的兼容策略（关键）

- 现有 3 个内置 SKILL 迁移为 builtin package（`pkg.writenow.builtin`）内的 3 个 `SKILL.md`。
- 索引器启动时确保 builtin package 被索引到 `skills` 表，`skillId` 保持不变（例如继续使用 `builtin:polish`），从而不影响现有 UI 流程与历史记录。
- 渲染进程 UI 从 IPC 获取技能列表，逐步移除 `src/lib/skills.ts` 的硬编码列表。
