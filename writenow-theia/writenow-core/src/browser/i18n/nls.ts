/**
 * WriteNow i18n (Internationalization) module.
 *
 * Why: Provides a unified interface for translatable strings using Theia's nls system.
 * All UI strings should use nls() to enable language switching.
 *
 * Usage:
 *   import { nls } from './i18n/nls';
 *   const label = nls('writenow/button/save', '保存');
 */

import { nls as theiaNls } from '@theia/core/lib/common/nls';

/**
 * Get a localized string.
 *
 * @param key - Unique key for the string (format: 'writenow/category/name')
 * @param defaultValue - Default value (Chinese) if no translation found
 * @param args - Optional arguments for string interpolation
 * @returns Localized string
 *
 * Why: Wraps Theia's nls.localize with WriteNow-specific defaults.
 */
export function nls(key: string, defaultValue: string, ...args: (string | number)[]): string {
    return theiaNls.localize(key, defaultValue, ...args);
}

/**
 * Common WriteNow UI strings.
 *
 * Why: Centralizes frequently used strings to ensure consistency.
 * Add new strings here as you use them across the application.
 */
export const WN_STRINGS = {
    // Common actions
    save: () => nls('writenow/action/save', '保存'),
    cancel: () => nls('writenow/action/cancel', '取消'),
    close: () => nls('writenow/action/close', '关闭'),
    delete: () => nls('writenow/action/delete', '删除'),
    confirm: () => nls('writenow/action/confirm', '确认'),
    apply: () => nls('writenow/action/apply', '应用'),
    discard: () => nls('writenow/action/discard', '放弃'),

    // AI Panel
    aiPanel: () => nls('writenow/ai/panel', 'AI 面板'),
    aiTaskComplete: () => nls('writenow/ai/taskComplete', 'AI 任务完成'),
    aiTaskCompleteDesc: () => nls('writenow/ai/taskCompleteDesc', 'AI 已完成文本处理，点击查看结果'),

    // Notifications
    notificationCenter: () => nls('writenow/notification/center', '通知中心'),
    noNotifications: () => nls('writenow/notification/empty', '暂无通知'),
    markAllRead: () => nls('writenow/notification/markAllRead', '全部已读'),
    clearAll: () => nls('writenow/notification/clearAll', '清空'),

    // Settings
    settings: () => nls('writenow/settings/title', '设置'),
    language: () => nls('writenow/settings/language', '语言'),
    languageSaved: () => nls('writenow/settings/languageSaved', '语言设置已保存，重启后生效'),

    // Editor
    focusMode: () => nls('writenow/editor/focusMode', '专注模式'),
    outline: () => nls('writenow/editor/outline', '大纲'),

    // File operations
    newFile: () => nls('writenow/file/new', '新建文件'),
    newFolder: () => nls('writenow/file/newFolder', '新建文件夹'),
    rename: () => nls('writenow/file/rename', '重命名'),
    copyPath: () => nls('writenow/file/copyPath', '复制路径'),

    // Help
    shortcuts: () => nls('writenow/help/shortcuts', '快捷键'),
    about: () => nls('writenow/help/about', '关于'),

    // Export
    exportMarkdown: () => nls('writenow/export/markdown', '导出 Markdown'),
    exportWord: () => nls('writenow/export/word', '导出 Word'),
    exportPdf: () => nls('writenow/export/pdf', '导出 PDF'),

    // Time
    justNow: () => nls('writenow/time/justNow', '刚刚'),
    minutesAgo: (n: number) => nls('writenow/time/minutesAgo', '{0} 分钟前', n),
    hoursAgo: (n: number) => nls('writenow/time/hoursAgo', '{0} 小时前', n),
    daysAgo: (n: number) => nls('writenow/time/daysAgo', '{0} 天前', n),

    // Common
    loading: () => nls('writenow/common/loading', '加载中...'),
    create: () => nls('writenow/common/create', '创建'),
    add: () => nls('writenow/common/add', '添加'),
    edit: () => nls('writenow/common/edit', '编辑'),
    noData: () => nls('writenow/common/noData', '暂无数据'),
    all: () => nls('writenow/common/all', '全部'),

    // Character Panel (P2-003)
    characterPanel: () => nls('writenow/character/panel', '角色管理'),
    characterPanelCaption: () => nls('writenow/character/caption', '管理作品中的角色'),
    characterNew: () => nls('writenow/character/new', '新建角色'),
    characterName: () => nls('writenow/character/name', '名称'),
    characterNamePlaceholder: () => nls('writenow/character/namePlaceholder', '角色名称'),
    characterNameRequired: () => nls('writenow/character/nameRequired', '请输入角色名称'),
    characterDescription: () => nls('writenow/character/description', '描述'),
    characterDescriptionPlaceholder: () => nls('writenow/character/descPlaceholder', '角色背景、性格等描述...'),
    characterTraits: () => nls('writenow/character/traits', '特征标签'),
    characterTraitAdd: () => nls('writenow/character/traitAdd', '添加特征'),
    characterTraitPlaceholder: () => nls('writenow/character/traitPlaceholder', '添加特征...'),
    characterEmpty: () => nls('writenow/character/empty', '暂无角色'),
    characterEmptyHint: () => nls('writenow/character/emptyHint', '创建角色来管理你作品中的人物设定'),
    characterNoProject: () => nls('writenow/character/noProject', '请先打开一个项目'),
    characterLoadFailed: (e: string) => nls('writenow/character/loadFailed', '加载角色失败: {0}', e),
    characterCreateSuccess: () => nls('writenow/character/createSuccess', '角色创建成功'),
    characterCreateFailed: (e: string) => nls('writenow/character/createFailed', '创建失败: {0}', e),
    characterUpdateSuccess: () => nls('writenow/character/updateSuccess', '角色更新成功'),
    characterUpdateFailed: (e: string) => nls('writenow/character/updateFailed', '更新失败: {0}', e),
    characterDeleteSuccess: () => nls('writenow/character/deleteSuccess', '角色删除成功'),
    characterDeleteFailed: (e: string) => nls('writenow/character/deleteFailed', '删除失败: {0}', e),
    characterRemoveTrait: (t: string) => nls('writenow/character/removeTrait', '移除 {0}', t),
    characterEditAria: (n: string) => nls('writenow/character/editAria', '编辑 {0}', n),
    characterDeleteAria: (n: string) => nls('writenow/character/deleteAria', '删除 {0}', n),

    // Terminology Panel (P2-004)
    terminologyPanel: () => nls('writenow/terminology/panel', '术语表'),
    terminologyPanelCaption: () => nls('writenow/terminology/caption', '管理作品术语'),
    terminologyAdd: () => nls('writenow/terminology/add', '添加术语'),
    terminologyTerm: () => nls('writenow/terminology/term', '术语'),
    terminologyTermPlaceholder: () => nls('writenow/terminology/termPlaceholder', '术语名称'),
    terminologyTermRequired: () => nls('writenow/terminology/termRequired', '请输入术语'),
    terminologyAliases: () => nls('writenow/terminology/aliases', '别名（逗号分隔）'),
    terminologyAliasesPlaceholder: () => nls('writenow/terminology/aliasesPlaceholder', '别名1, 别名2, ...'),
    terminologyDefinition: () => nls('writenow/terminology/definition', '定义'),
    terminologyDefinitionPlaceholder: () => nls('writenow/terminology/defPlaceholder', '术语的定义或解释...'),
    terminologySearch: () => nls('writenow/terminology/search', '搜索术语...'),
    terminologyEmpty: () => nls('writenow/terminology/empty', '暂无术语'),
    terminologyEmptyHint: () => nls('writenow/terminology/emptyHint', '添加术语来统一作品中的专有名词'),
    terminologyNoMatch: () => nls('writenow/terminology/noMatch', '未找到匹配的术语'),
    terminologyAliasPrefix: () => nls('writenow/terminology/aliasPrefix', '别名：'),
    terminologyLoadFailed: (e: string) => nls('writenow/terminology/loadFailed', '加载术语表失败: {0}', e),
    terminologyConfigFailed: (e: string) => nls('writenow/terminology/configFailed', '获取配置失败: {0}', e),
    terminologySaveFailed: (e: string) => nls('writenow/terminology/saveFailed', '保存失败: {0}', e),
    terminologyAddSuccess: () => nls('writenow/terminology/addSuccess', '术语添加成功'),
    terminologyUpdateSuccess: () => nls('writenow/terminology/updateSuccess', '术语更新成功'),
    terminologyDeleteSuccess: () => nls('writenow/terminology/deleteSuccess', '术语删除成功'),

    // Stats Panel (P2-005)
    statsPanel: () => nls('writenow/stats/panel', '写作统计'),
    statsPanelCaption: () => nls('writenow/stats/caption', '查看写作数据统计'),
    statsToday: () => nls('writenow/stats/today', '今日数据'),
    statsWordCount: () => nls('writenow/stats/wordCount', '字数'),
    statsWritingDuration: () => nls('writenow/stats/duration', '写作时长'),
    statsNewDocs: () => nls('writenow/stats/newDocs', '新建文档'),
    statsAiSkills: () => nls('writenow/stats/aiSkills', 'AI 技能'),
    statsLast7Days: () => nls('writenow/stats/last7Days', '近 7 天'),
    statsLast30Days: () => nls('writenow/stats/last30Days', '近 30 天'),
    statsSummary: (range: string) => nls('writenow/stats/summary', '{0}汇总', range),
    statsTotalWords: () => nls('writenow/stats/totalWords', '总字数'),
    statsTotalDuration: () => nls('writenow/stats/totalDuration', '总时长'),
    statsTrend: () => nls('writenow/stats/trend', '字数趋势'),
    statsTrendAria: () => nls('writenow/stats/trendAria', '字数趋势图表'),
    statsBarTitle: (date: string, count: number) => nls('writenow/stats/barTitle', '{0}: {1} 字', date, count),
    statsLoadFailed: (e: string) => nls('writenow/stats/loadFailed', '加载统计数据失败: {0}', e),
    statsMinutes: (n: number) => nls('writenow/stats/minutes', '{0} 分钟', n),
    statsHours: (h: number) => nls('writenow/stats/hours', '{0} 小时', h),
    statsHoursMinutes: (h: number, m: number) => nls('writenow/stats/hoursMinutes', '{0} 小时 {1} 分钟', h, m),

    // Log Viewer (P2-006)
    logViewer: () => nls('writenow/log/viewer', '日志查看器'),
    logViewerCaption: () => nls('writenow/log/caption', '查看应用日志'),
    logFilter: () => nls('writenow/log/filter', '日志级别过滤'),
    logAutoScrollOn: () => nls('writenow/log/autoScrollOn', '关闭自动滚动'),
    logAutoScrollOff: () => nls('writenow/log/autoScrollOff', '开启自动滚动'),
    logExport: () => nls('writenow/log/export', '导出日志'),
    logClear: () => nls('writenow/log/clear', '清空日志'),
    logEmpty: () => nls('writenow/log/empty', '暂无日志'),
    logExported: () => nls('writenow/log/exported', '日志已导出'),
    logCleared: () => nls('writenow/log/cleared', '日志已清空'),

    // User Guide (P2-007)
    userGuide: () => nls('writenow/guide/title', '用户指南'),
    userGuideCaption: () => nls('writenow/guide/caption', 'WriteNow 使用指南'),
    userGuideSearch: () => nls('writenow/guide/search', '搜索...'),
    userGuideNav: () => nls('writenow/guide/nav', '指南目录'),

    // Update Notification (P2-008)
    updateAvailable: () => nls('writenow/update/available', '有新版本可用'),
    updateClose: () => nls('writenow/update/close', '关闭'),
    updateSkip: () => nls('writenow/update/skip', '跳过此版本'),
    updateLater: () => nls('writenow/update/later', '稍后提醒'),
    updateDownload: () => nls('writenow/update/download', '下载更新'),
    updateDownloading: () => nls('writenow/update/downloading', '下载中...'),
    updateRetry: () => nls('writenow/update/retry', '重试下载'),
    updateInstall: () => nls('writenow/update/install', '安装并重启'),
    updateSkipped: (v: string) => nls('writenow/update/skipped', '已跳过版本 {0}', v),
    updateDownloadFailed: (e: string) => nls('writenow/update/downloadFailed', '下载失败: {0}', e),
    updateInstallFailed: (e: string) => nls('writenow/update/installFailed', '安装失败: {0}', e),
    updateInstalling: () => nls('writenow/update/installing', '正在安装更新，应用将重启...'),
    updateUnknownError: () => nls('writenow/update/unknownError', '未知错误'),

    // Semantic Search (P3-002)
    semanticSearchPanel: () => nls('writenow/semanticSearch/panel', '语义搜索'),
    semanticSearchCaption: () => nls('writenow/semanticSearch/caption', '使用自然语言搜索文档'),
    semanticSearchPlaceholder: () => nls('writenow/semanticSearch/placeholder', '输入搜索内容...'),
    semanticSearchButton: () => nls('writenow/semanticSearch/button', '搜索'),
    semanticSearchEmpty: () => nls('writenow/semanticSearch/empty', '暂无搜索结果'),
    semanticSearchEmptyHint: () => nls('writenow/semanticSearch/emptyHint', '尝试使用不同的关键词搜索'),
    semanticSearchResults: (n: number) => nls('writenow/semanticSearch/results', '找到 {0} 条结果', n),
    semanticSearchScore: (s: number) => nls('writenow/semanticSearch/score', '相似度: {0}%', s),
    semanticSearchLoadFailed: (e: string) => nls('writenow/semanticSearch/loadFailed', '搜索失败: {0}', e),
    semanticSearchOpenDoc: () => nls('writenow/semanticSearch/openDoc', '打开文档'),

    // Memory Viewer (P3-004)
    memoryViewerPanel: () => nls('writenow/memoryViewer/panel', '记忆查看器'),
    memoryViewerCaption: () => nls('writenow/memoryViewer/caption', '管理 AI 记忆'),
    memoryViewerEmpty: () => nls('writenow/memoryViewer/empty', '暂无记忆'),
    memoryViewerEmptyHint: () => nls('writenow/memoryViewer/emptyHint', 'AI 会在交互过程中学习用户偏好'),
    memoryTypePreference: () => nls('writenow/memoryViewer/typePreference', '偏好'),
    memoryTypeFeedback: () => nls('writenow/memoryViewer/typeFeedback', '反馈'),
    memoryTypeStyle: () => nls('writenow/memoryViewer/typeStyle', '风格'),
    memoryOriginManual: () => nls('writenow/memoryViewer/originManual', '手动'),
    memoryOriginLearned: () => nls('writenow/memoryViewer/originLearned', '学习'),
    memoryScopeGlobal: () => nls('writenow/memoryViewer/scopeGlobal', '全局'),
    memoryScopeProject: () => nls('writenow/memoryViewer/scopeProject', '项目'),
    memoryLoadFailed: (e: string) => nls('writenow/memoryViewer/loadFailed', '加载记忆失败: {0}', e),
    memoryUpdateSuccess: () => nls('writenow/memoryViewer/updateSuccess', '记忆更新成功'),
    memoryUpdateFailed: (e: string) => nls('writenow/memoryViewer/updateFailed', '更新失败: {0}', e),
    memoryDeleteSuccess: () => nls('writenow/memoryViewer/deleteSuccess', '记忆删除成功'),
    memoryDeleteFailed: (e: string) => nls('writenow/memoryViewer/deleteFailed', '删除失败: {0}', e),
    memoryContent: () => nls('writenow/memoryViewer/content', '内容'),
    memoryContentPlaceholder: () => nls('writenow/memoryViewer/contentPlaceholder', '记忆内容...'),
    memoryCreatedAt: () => nls('writenow/memoryViewer/createdAt', '创建时间'),

    // Constraint Editor (P3-003)
    constraintEditorPanel: () => nls('writenow/constraintEditor/panel', '约束编辑器'),
    constraintEditorCaption: () => nls('writenow/constraintEditor/caption', '管理 AI 写作约束'),
    constraintEditorEmpty: () => nls('writenow/constraintEditor/empty', '暂无约束规则'),
    constraintEditorEmptyHint: () => nls('writenow/constraintEditor/emptyHint', '添加约束规则来控制 AI 写作行为'),
    constraintEditorAdd: () => nls('writenow/constraintEditor/add', '添加约束'),
    constraintTypeForbiddenWords: () => nls('writenow/constraintEditor/typeForbiddenWords', '禁用词'),
    constraintTypeWordCount: () => nls('writenow/constraintEditor/typeWordCount', '字数限制'),
    constraintTypeFormat: () => nls('writenow/constraintEditor/typeFormat', '格式要求'),
    constraintTypeTerminology: () => nls('writenow/constraintEditor/typeTerminology', '术语规范'),
    constraintTypeTone: () => nls('writenow/constraintEditor/typeTone', '语气风格'),
    constraintTypeCoverage: () => nls('writenow/constraintEditor/typeCoverage', '内容覆盖'),
    constraintLevelError: () => nls('writenow/constraintEditor/levelError', '错误'),
    constraintLevelWarning: () => nls('writenow/constraintEditor/levelWarning', '警告'),
    constraintLevelInfo: () => nls('writenow/constraintEditor/levelInfo', '信息'),
    constraintEnabled: () => nls('writenow/constraintEditor/enabled', '启用'),
    constraintDisabled: () => nls('writenow/constraintEditor/disabled', '禁用'),
    constraintLoadFailed: (e: string) => nls('writenow/constraintEditor/loadFailed', '加载约束失败: {0}', e),
    constraintSaveSuccess: () => nls('writenow/constraintEditor/saveSuccess', '约束保存成功'),
    constraintSaveFailed: (e: string) => nls('writenow/constraintEditor/saveFailed', '保存失败: {0}', e),
    constraintDeleteSuccess: () => nls('writenow/constraintEditor/deleteSuccess', '约束删除成功'),

    // Context Debugger (P3-001)
    contextDebuggerPanel: () => nls('writenow/contextDebugger/panel', '上下文调试器'),
    contextDebuggerCaption: () => nls('writenow/contextDebugger/caption', '查看 AI 上下文组装情况'),
    contextDebuggerRefresh: () => nls('writenow/contextDebugger/refresh', '刷新'),
    contextDebuggerLayerSystem: () => nls('writenow/contextDebugger/layerSystem', '系统层'),
    contextDebuggerLayerProject: () => nls('writenow/contextDebugger/layerProject', '项目层'),
    contextDebuggerLayerDocument: () => nls('writenow/contextDebugger/layerDocument', '文档层'),
    contextDebuggerLayerSelection: () => nls('writenow/contextDebugger/layerSelection', '选区层'),
    contextDebuggerTokenBudget: () => nls('writenow/contextDebugger/tokenBudget', 'Token 预算'),
    contextDebuggerTokenUsed: () => nls('writenow/contextDebugger/tokenUsed', '已用'),
    contextDebuggerTokenTotal: () => nls('writenow/contextDebugger/tokenTotal', '总量'),
    contextDebuggerSource: () => nls('writenow/contextDebugger/source', '来源'),
    contextDebuggerContent: () => nls('writenow/contextDebugger/content', '内容摘要'),
    contextDebuggerEmpty: () => nls('writenow/contextDebugger/empty', '暂无上下文信息'),
    contextDebuggerLoadFailed: (e: string) => nls('writenow/contextDebugger/loadFailed', '加载失败: {0}', e),
} as const;
