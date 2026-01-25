/**
 * SettingsPanel
 * Why: Central place to configure theme/editor/AI settings with persistence.
 */

import { useMemo, useState } from 'react';
import { Palette, Sliders, Sparkles, Wrench } from 'lucide-react';

import { Dialog, DialogContent, DialogHeader, DialogTitle, Input, Select, SelectContent, SelectItem, SelectTrigger, SelectValue, Switch } from '@/components/ui';
import { cn } from '@/lib/utils';
import { useSettingsPanelStore } from '@/stores';

import { SettingItem } from './components/SettingItem';
import { useSettings } from './useSettings';

type SettingsCategory = 'general' | 'editor' | 'ai' | 'appearance';

const CATEGORIES: { id: SettingsCategory; name: string; icon: React.ComponentType<{ className?: string }> }[] = [
  { id: 'general', name: '通用', icon: Wrench },
  { id: 'editor', name: '编辑器', icon: Sliders },
  { id: 'ai', name: 'AI', icon: Sparkles },
  { id: 'appearance', name: '外观', icon: Palette },
];

export function SettingsPanel() {
  const open = useSettingsPanelStore((s) => s.open);
  const setOpen = useSettingsPanelStore((s) => s.setOpen);

  const [category, setCategory] = useState<SettingsCategory>('general');
  const [search, setSearch] = useState('');

  const {
    theme,
    setTheme,
    defaultEditorMode,
    setDefaultEditorMode,
    aiApiKey,
    setAiApiKey,
    memorySettings,
    memoryLoading,
    memoryError,
    updateMemorySettings,
  } = useSettings();

  const filter = useMemo(() => search.trim().toLowerCase(), [search]);

  const rows = useMemo(() => {
    const items: Array<{ category: SettingsCategory; key: string; label: string; description?: string; control: React.ReactNode; match: string }> = [
      {
        category: 'appearance',
        key: 'theme',
        label: '主题',
        description: '切换 Midnight/Dark/Light/High Contrast 或跟随系统',
        control: (
          <Select value={theme} onValueChange={(v) => setTheme(v as typeof theme)}>
            <SelectTrigger className="w-48 h-8">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="midnight">Midnight</SelectItem>
              <SelectItem value="dark">Dark</SelectItem>
              <SelectItem value="light">Light</SelectItem>
              <SelectItem value="high-contrast">High Contrast</SelectItem>
              <SelectItem value="system">System</SelectItem>
            </SelectContent>
          </Select>
        ),
        match: 'theme midnight dark light high contrast system 主题 外观',
      },
      {
        category: 'editor',
        key: 'editor.mode',
        label: '默认编辑模式',
        description: '新打开文件时的默认模式',
        control: (
          <Select value={defaultEditorMode} onValueChange={(v) => setDefaultEditorMode(v as typeof defaultEditorMode)}>
            <SelectTrigger className="w-48 h-8">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="richtext">富文本</SelectItem>
              <SelectItem value="markdown">Markdown</SelectItem>
            </SelectContent>
          </Select>
        ),
        match: 'editor mode richtext markdown 默认 编辑器',
      },
      {
        category: 'ai',
        key: 'ai.apiKey',
        label: 'AI API Key',
        description: '用于访问 AI 服务（Electron 中会加密存储；Web 模式 fallback 到本地存储）',
        control: (
          <Input
            value={aiApiKey}
            type="password"
            className="w-72 h-8"
            placeholder="sk-..."
            onChange={(e) => void setAiApiKey(e.target.value)}
          />
        ),
        match: 'ai api key token 密钥',
      },
      {
        category: 'ai',
        key: 'memory.injectionEnabled',
        label: '记忆注入',
        description: memoryError ? `加载失败：${memoryError}` : '将记忆注入到 AI 上下文',
        control: (
          <Switch
            checked={Boolean(memorySettings?.injectionEnabled)}
            disabled={!memorySettings || memoryLoading}
            onCheckedChange={(checked) => void updateMemorySettings({ injectionEnabled: checked })}
          />
        ),
        match: 'memory injection 记忆 注入 ai',
      },
    ];

    return items.filter((item) => {
      if (item.category !== category) return false;
      if (!filter) return true;
      return `${item.label} ${item.description ?? ''} ${item.match}`.toLowerCase().includes(filter);
    });
  }, [
    aiApiKey,
    category,
    defaultEditorMode,
    filter,
    memoryError,
    memoryLoading,
    memorySettings,
    setAiApiKey,
    setDefaultEditorMode,
    setTheme,
    theme,
    updateMemorySettings,
  ]);

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogContent className="max-w-[960px] h-[620px] p-0">
        <div className="flex h-full">
          {/* Sidebar */}
          <div className="w-56 border-r border-[var(--border-subtle)] bg-[var(--bg-sidebar)] p-3">
            <div className="px-2 pt-2 pb-3">
              <DialogHeader>
                <DialogTitle className="text-sm">设置</DialogTitle>
              </DialogHeader>
            </div>

            <div className="px-2 pb-3">
              <Input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="h-8"
                placeholder="搜索设置…"
              />
            </div>

            <div className="space-y-1 px-1">
              {CATEGORIES.map((cat) => {
                const Icon = cat.icon;
                const active = cat.id === category;
                return (
                  <button
                    key={cat.id}
                    type="button"
                    className={cn(
                      'w-full flex items-center gap-2 px-3 py-2 rounded-[var(--radius-sm)] text-sm',
                      active ? 'bg-[var(--bg-active)] text-[var(--text-primary)]' : 'text-[var(--text-secondary)] hover:bg-[var(--bg-hover)]',
                    )}
                    onClick={() => setCategory(cat.id)}
                  >
                    <Icon className="w-4 h-4 text-[var(--text-muted)]" />
                    {cat.name}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Content */}
          <div className="flex-1 p-6 overflow-auto bg-[var(--bg-panel)]">
            <h2 className="text-lg font-semibold text-[var(--text-primary)] mb-4">
              {CATEGORIES.find((c) => c.id === category)?.name ?? '设置'}
            </h2>

            <div className="rounded-[var(--radius-md)] border border-[var(--border-subtle)] bg-[var(--bg-panel)]">
              {rows.length === 0 ? (
                <div className="p-4 text-sm text-[var(--text-muted)]">没有匹配的设置项</div>
              ) : (
                rows.map((row) => (
                  <SettingItem key={row.key} label={row.label} description={row.description} control={row.control} />
                ))
              )}
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

export default SettingsPanel;
