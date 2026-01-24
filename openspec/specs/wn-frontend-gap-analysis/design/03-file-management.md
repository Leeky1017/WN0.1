# Design: 文件管理缺口

## 现状分析

使用 Theia 默认 Navigator，缺乏创作者友好的文件管理功能。

### 缺失功能

| 功能 | 后端支持 | 优先级 | 备注 |
|------|---------|-------|------|
| 文件重命名 | 有 Theia | P1 | 有能力，无明显入口 |
| 新建文件夹 | 有 Theia | P1 | 有能力，入口不明显 |
| 文件移动 | 有 Theia | P1 | 无拖拽支持 |
| 最近文件列表 | 无 | P1 | 无最近打开记录 |
| 文件树悬浮预览 | 无 | P2 | 无预览功能 |

## 设计方案

### 1. 增强文件树右键菜单

菜单项：
- 新建文件
- 新建文件夹
- 分隔线
- 重命名（F2）
- 复制
- 剪切
- 粘贴
- 分隔线
- 删除

### 2. 最近文件

- Welcome 页面显示最近打开的 10 个文件
- File 菜单添加 "Open Recent" 子菜单
- 存储最近文件路径到 preferences

### 3. 拖拽支持

- 文件树支持拖拽移动文件
- 编辑器标签支持拖拽重排
- 从外部拖入文件自动打开

## 文件变更预期

| 操作 | 文件路径 |
|------|---------|
| Update | `writenow-core/src/browser/writenow-core-contribution.ts` |
| Update | `writenow-core/src/browser/writenow-welcome-widget.tsx` |
| Add | `writenow-core/src/node/recent-files-service.ts` |
