# Design: 帮助与文档缺口

## 现状分析

Help 菜单仅有测试命令，无任何帮助文档或引导功能。

### 缺失功能

| 功能 | 优先级 | 备注 |
|------|-------|------|
| 关于对话框 | P1 | 无版本信息显示 |
| 快捷键速查表 | P1 | 无快捷键参考 |
| 用户指南 | P2 | 无使用说明 |
| 更新日志 | P2 | 无版本更新记录 |
| 反馈入口 | P2 | 无问题反馈渠道 |
| 社区链接 | P3 | 无社区/讨论入口 |

## 设计方案

### 1. 关于对话框

显示内容：
- 应用名称
- 版本号
- 构建日期
- 许可证信息
- 依赖致谢

入口：Help > About WriteNow

### 2. 快捷键速查表

| 分类 | 快捷键列表 |
|------|---------|
| 编辑 | Cmd+C/X/V/Z/Y |
| 格式 | Cmd+B/I/U |
| 文件 | Cmd+S/O/N |
| 搜索 | Cmd+F/H |
| AI | Cmd+K |
| 视图 | Cmd+1/2/3 |

入口：Help > Keyboard Shortcuts（Cmd+?）

### 3. 用户指南

- 嵌入式 Markdown 文档
- 可搜索
- 按功能模块组织

## 文件变更预期

| 操作 | 文件路径 |
|------|---------|
| Add | `writenow-core/src/browser/about-dialog.tsx` |
| Add | `writenow-core/src/browser/shortcuts-widget.tsx` |
| Add | `writenow-core/src/browser/help-widget.tsx` |
| Update | `writenow-core/src/browser/writenow-core-contribution.ts` |
