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
} as const;
