# Design: 设置与偏好缺口

## 现状分析

前端无任何用户可配置的设置界面，所有配置需手动修改文件或无法配置。

### 缺失功能

| 功能 | 后端支持 | 优先级 | 备注 |
|------|---------|-------|------|
| API Key 配置 | 有 IPC | P0 | 无 UI，需手动配置 |
| AI 模型选择 | 有 IPC | P0 | 后端支持多模型，前端无选择器 |
| 用户偏好 UI | 无 | P0 | 无设置面板 |
| 语言切换 | 有 i18n | P1 | 有 i18n 支持，无切换 UI |
| 自动保存延迟配置 | 有 | P1 | 后端支持，无 UI |
| 快捷键查看器 | 无 | P1 | 无快捷键列表 |
| 快捷键自定义 | 无 | P2 | 无自定义能力 |
| 通知设置 | 无 | P2 | 无通知控制 |

## 设计方案

### 1. 设置入口

| 入口 | 方式 |
|------|------|
| Welcome 页面 | Settings 按钮 |
| 菜单 | File > Preferences > Settings |
| 快捷键 | Cmd+, |

### 2. 设置面板布局

左侧导航，右侧配置区。

分类：
- AI：Provider、API Key、Model、Temperature、Max Tokens
- 编辑器：字体大小、行高、自动保存延迟、Tab 宽度
- 外观：主题、密度
- 快捷键：查看/搜索快捷键列表
- 语言：界面语言切换

### 3. 技术实现

- 使用 Theia PreferenceService 存储设置
- 设置变更实时生效
- 敏感数据（API Key）使用 secure storage

## 文件变更预期

| 操作 | 文件路径 |
|------|---------|
| Add | `writenow-core/src/browser/settings-widget.tsx` |
| Add | `writenow-core/src/browser/style/settings.css` |
| Update | `writenow-core/src/browser/writenow-welcome-widget.tsx` |
| Update | `writenow-core/src/browser/writenow-core-contribution.ts` |
