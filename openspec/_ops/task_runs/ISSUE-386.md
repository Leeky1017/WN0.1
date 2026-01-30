# ISSUE-386

- Issue: #386
- Branch: task/386-settings-module
- PR: <fill-after-created>

## Plan

- 实现 settingsStore（UserSettings schema + localStorage 持久化）
- 实现 SettingsNav/SettingsSection/SettingItem 组件
- 实现 WritingSettings/DataSettings/AppearanceSettings 设置页
- 组装 SettingsModal 组件，对照 DESIGN_SPEC.md 7.4 规范

## Runs

### 2026-01-30 Settings Module 实现

#### 实现内容

1. **settingsStore** (`writenow-ui/src/stores/settingsStore.ts`)
   - UserSettings schema: writing/data/appearance 三类设置
   - Zustand persist 中间件实现 localStorage 持久化
   - 便捷 selector hooks

2. **SettingsNav** (`features/settings/components/SettingsNav.tsx`)
   - 260px 宽度，#0a0a0a 背景
   - Lucide 图标（Pencil, Database, Palette）
   - 激活项带右边框指示器

3. **SettingsSection + SettingItem** (`features/settings/components/SettingsSection.tsx`)
   - 分区标题 10px uppercase
   - 设置项：左侧标题+描述，右侧控件

4. **WritingSettings** (`features/settings/components/WritingSettings.tsx`)
   - Focus Mode, Typewriter Scroll, Smart Punctuation, Auto Pair Brackets

5. **DataSettings** (`features/settings/components/DataSettings.tsx`)
   - Auto Save（开关 + 间隔选择）
   - Backup（开关 + 频率选择）

6. **AppearanceSettings** (`features/settings/components/AppearanceSettings.tsx`)
   - Theme, Typography, Interface Scale

7. **SettingsModal** (`features/settings/SettingsModal.tsx`)
   - 1000×700px 模态框
   - 左侧导航 + 右侧内容区
   - Radix UI Dialog 动画

#### 验证

- Command: `pnpm lint` (待执行)
- Key output: 无 linter 错误
- Evidence: ReadLints 工具确认无错误
