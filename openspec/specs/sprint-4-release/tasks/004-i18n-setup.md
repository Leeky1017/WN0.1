# 任务 004: i18next 国际化配置

## 目标

在渲染进程接入 `i18next`，建立中文/英文两套语言包，覆盖核心 UI 文案，并支持用户切换语言与持久化偏好。

## 依赖

- React 18 + TypeScript 基础工程已可运行
- UI 已具备设置入口（或可新增最小入口）

## 实现步骤

1. 安装依赖：
   - `i18next`
   - `react-i18next`
   - （可选）语言检测/持久化插件（或自行使用 localStorage）
2. 初始化 i18n：
   - 创建 `src/locales/` 目录结构（zh-CN/en）
   - 设置默认语言为 `zh-CN`，fallback 为 `zh-CN`
3. 接入 React：
   - 在应用入口初始化并提供 `I18nextProvider`
   - 将核心 UI 文案替换为 `t('...')` key
4. 语言切换与持久化：
   - 在设置中提供语言切换（中文/English）
   - 将选择写入本地存储，并在启动时恢复
5. 边界约束：
   - 仅 UI 文案参与国际化
   - 用户创作内容与 AI 内容不得被翻译或处理

## 新增/修改文件

- `src/locales/zh-CN/*.json`（新增）
- `src/locales/en/*.json`（新增）
- `src/lib/i18n.ts`（新增）- i18next 初始化
- `src/main.tsx` / `src/App.tsx` - Provider 接入与 UI 文案替换
- `src/components/Settings/*` - 语言切换 UI（新增/修改）

## 验收标准

- [ ] 默认语言为简体中文
- [ ] 可切换为 English，切换后 UI 文案即时更新
- [ ] 语言偏好可持久化（重启仍保持）
- [ ] 用户创作内容与 AI 内容不被国际化处理

## 参考

- 核心规范：`openspec/specs/writenow-spec/spec.md` 第 529-549 行（i18n 技术方案与范围）

