# WriteNow

AI 驱动的文字创作 IDE。本地优先，专为内容创作者设计。

## 特性

- 双模式编辑器：Markdown 和富文本（TipTap Editor Widget）
- AI 工作流：内置 SKILL 系统
- 创作统计：字数目标、番茄钟、进度追踪
- 项目管理：人物卡/大纲/知识图谱（Theia Widgets）

## 技术栈

- Eclipse Theia（Browser + Electron targets）
- React + TypeScript（Theia Widgets / Editor Widget）
- SQLite（better-sqlite3，本地持久化）
- sqlite-vec（向量存储）

代码基线：`writenow-theia/`。

## 开发

要求：Node.js 20+（含 Corepack，用于 Yarn Classic 1.22.22）。

```bash
npm run theia:install
npm run dev
```

如需启动 Electron target：

```bash
npm run theia:start:electron
```

## 构建

```bash
npm run build
npm run build:electron
```

## 许可

MIT
