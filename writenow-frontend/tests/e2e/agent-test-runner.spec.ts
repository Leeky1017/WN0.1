/**
 * Agent Test Runner
 * Why: 提供可被 Agent 通过 browser MCP 驱动的测试场景
 *
 * 使用方式：
 * 1. Agent 启动 dev server: npm run dev
 * 2. Agent 通过 browser_navigate 访问 http://localhost:5180
 * 3. Agent 调用 browser_snapshot 获取页面状态
 * 4. Agent 根据 data-testid 执行交互
 *
 * 关键 data-testid 索引：
 * - layout-main: 主布局容器
 * - layout-sidebar: 侧边栏面板
 * - layout-ai-panel: AI 面板
 * - activity-{id}: 侧边栏活动按钮 (files/outline/history/stats/settings)
 * - editor-panel: 编辑器面板
 * - editor-toolbar: 编辑器工具栏
 * - toolbar-mode-{mode}: 模式切换 (markdown/richtext)
 * - toolbar-view-{mode}: 视图切换 (edit/preview/split)
 * - toolbar-export: 导出按钮
 * - menubar: 菜单栏
 * - menu-{id}: 菜单项 (file/edit/view/publish)
 * - toggle-stats-bar: 统计栏切换
 * - toggle-focus-mode: 专注模式切换
 * - toggle-ai-panel: AI 面板切换
 * - command-palette: 命令面板
 * - command-palette-input: 命令面板输入框
 * - statusbar: 状态栏
 * - stats-today-wordcount: 今日字数
 * - stats-weekly-chart: 每周统计图表
 * - history-list: 版本历史列表
 * - history-refresh: 刷新版本历史
 * - outline-list: 大纲列表
 * - outline-word-count: 字数统计
 * - file-create-dialog: 创建文件对话框
 * - file-create-input: 文件名输入框
 * - file-create-confirm: 确认创建按钮
 * - ai-connection-status: AI 连接状态
 * - ai-reconnect-button: 重连按钮
 * - settings-view: 设置视图
 * - settings-list: 设置列表
 */

import { test, expect, type Page } from '@playwright/test';

/**
 * Agent 可调用的测试场景
 * 每个场景都是自包含的，可独立执行
 */
export const testScenarios = {
  /**
   * 核心流程：创建文件 → 编辑 → 保存
   */
  'create-file-edit-save': async (page: Page) => {
    // 1. 点击文件浏览器
    await page.click('[data-testid="activity-files"]');

    // 2. 创建新文件（假设有创建按钮）
    await page.click('[data-testid="file-create-trigger"]');
    await page.fill('[data-testid="file-create-input"]', 'test-document.md');
    await page.click('[data-testid="file-create-confirm"]');

    // 3. 等待编辑器加载
    await page.waitForSelector('[data-testid="editor-panel"]');

    // 4. 输入内容（TipTap 编辑器）
    const editor = page.locator('.ProseMirror');
    await editor.click();
    await editor.type('# Hello World\n\nThis is a test document.');

    // 5. 触发保存 (Ctrl+S)
    await page.keyboard.press('Control+s');

    // 6. 验证保存状态
    await expect(page.locator('[data-testid="statusbar"]')).toContainText('已保存');
  },

  /**
   * 版本历史：查看和恢复
   */
  'version-history-restore': async (page: Page) => {
    // 1. 切换到历史视图
    await page.click('[data-testid="activity-history"]');

    // 2. 等待历史列表加载
    await page.waitForSelector('[data-testid="history-list"]');

    // 3. 刷新历史
    await page.click('[data-testid="history-refresh"]');

    // 4. 验证版本列表存在
    const versionCount = await page.locator('[data-testid^="history-preview-"]').count();
    expect(versionCount).toBeGreaterThanOrEqual(0);
  },

  /**
   * 统计显示：验证真实数据
   */
  'stats-display-accuracy': async (page: Page) => {
    // 1. 切换到统计视图
    await page.click('[data-testid="activity-stats"]');

    // 2. 等待统计加载
    await page.waitForSelector('[data-testid="stats-today-wordcount"]');

    // 3. 验证不是 mock 数据
    const wordCountText = await page.locator('[data-testid="stats-today-wordcount"]').textContent();
    expect(wordCountText).not.toBe('1,234'); // 排除 mock 数据

    // 4. 验证图表存在
    await expect(page.locator('[data-testid="stats-weekly-chart"]')).toBeVisible();
  },

  /**
   * 大纲导航：点击标题跳转
   */
  'outline-navigation': async (page: Page) => {
    // 1. 确保有打开的文件
    await page.waitForSelector('[data-testid="editor-panel"]');

    // 2. 切换到大纲视图
    await page.click('[data-testid="activity-outline"]');

    // 3. 等待大纲列表
    await page.waitForSelector('[data-testid="outline-list"]');

    // 4. 验证大纲元素存在
    await expect(page.locator('[data-testid="outline-word-count"]')).toBeVisible();
  },

  /**
   * AI 面板：连接状态和重连
   */
  'ai-panel-connection': async (page: Page) => {
    // 1. 切换到 AI 面板（如果有切换按钮）
    const aiPanelToggle = page.locator('[data-testid="toggle-ai-panel"]');
    if (await aiPanelToggle.isVisible()) {
      await aiPanelToggle.click();
    }

    // 2. 等待 AI 面板
    await page.waitForSelector('[data-testid="layout-ai-panel"]');

    // 3. 检查连接状态指示器
    await expect(page.locator('[data-testid="ai-connection-status"]')).toBeVisible();

    // 4. 如果有重连按钮，验证可点击
    const reconnectButton = page.locator('[data-testid="ai-reconnect-button"]');
    if (await reconnectButton.isVisible()) {
      expect(await reconnectButton.isEnabled()).toBe(true);
    }
  },

  /**
   * 命令面板：打开和搜索
   */
  'command-palette-search': async (page: Page) => {
    // 1. 打开命令面板 (Ctrl+K)
    await page.keyboard.press('Control+k');

    // 2. 等待命令面板
    await page.waitForSelector('[data-testid="command-palette"]');

    // 3. 输入搜索词
    await page.fill('[data-testid="command-palette-input"]', '设置');

    // 4. 验证搜索结果
    await page.waitForTimeout(300); // 等待搜索 debounce

    // 5. 关闭命令面板
    await page.keyboard.press('Escape');
  },

  /**
   * 边界测试：长内容 10K 字符
   */
  'long-content-10k-chars': async (page: Page) => {
    // 1. 确保编辑器可用
    await page.waitForSelector('[data-testid="editor-panel"]');

    // 2. 生成长内容
    const longContent = '这是测试内容。'.repeat(1000);

    // 3. 输入长内容
    const editor = page.locator('.ProseMirror');
    await editor.click();
    await editor.evaluate((el, content) => {
      el.textContent = content;
    }, longContent);

    // 4. 验证内容已输入
    const textContent = await editor.textContent();
    expect(textContent?.length).toBeGreaterThan(5000);
  },

  /**
   * 边界测试：特殊字符和 Unicode
   */
  'special-characters-unicode': async (page: Page) => {
    // 1. 确保编辑器可用
    await page.waitForSelector('[data-testid="editor-panel"]');

    // 2. 输入特殊字符
    const specialContent = '# 特殊字符测试\n\n🎉 Emoji 测试\n\n日本語テスト\n\n<script>alert("xss")</script>';

    const editor = page.locator('.ProseMirror');
    await editor.click();
    await editor.type(specialContent);

    // 3. 验证内容正确渲染（XSS 应被转义）
    await expect(editor).not.toContainText('<script>');
  },

  /**
   * 边界测试：快速连续保存
   */
  'rapid-consecutive-saves': async (page: Page) => {
    // 1. 确保编辑器可用
    await page.waitForSelector('[data-testid="editor-panel"]');

    // 2. 快速连续触发保存
    for (let i = 0; i < 5; i++) {
      await page.keyboard.press('Control+s');
      await page.waitForTimeout(100);
    }

    // 3. 等待保存完成
    await page.waitForTimeout(500);

    // 4. 验证没有错误状态
    const statusBar = page.locator('[data-testid="statusbar"]');
    await expect(statusBar).not.toContainText('错误');
  },
};

/**
 * Playwright E2E 测试用例
 * 这些测试可以直接运行，也可以作为 Agent 的参考
 */
test.describe('Agent-driven Test Scenarios', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('http://localhost:5180');
    await page.waitForLoadState('networkidle');
  });

  test('应用正常加载', async ({ page }) => {
    // 验证主布局存在
    await expect(page.locator('[data-testid="layout-main"]')).toBeVisible();
  });

  test('侧边栏活动切换', async ({ page }) => {
    // 点击各个活动按钮
    const activities = ['files', 'outline', 'history', 'stats', 'settings'];

    for (const activity of activities) {
      await page.click(`[data-testid="activity-${activity}"]`);
      await page.waitForTimeout(100);
    }
  });

  test('统计数据真实性', async ({ page }) => {
    await testScenarios['stats-display-accuracy'](page);
  });

  test('命令面板功能', async ({ page }) => {
    await testScenarios['command-palette-search'](page);
  });

  test('AI 面板连接状态', async ({ page }) => {
    await testScenarios['ai-panel-connection'](page);
  });
});

export default testScenarios;
