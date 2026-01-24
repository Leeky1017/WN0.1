import * as React from '@theia/core/shared/react';

import { codicon, ReactWidget } from '@theia/core/lib/browser/widgets';
import { inject, injectable } from '@theia/core/shared/inversify';
import { MessageService } from '@theia/core/lib/common/message-service';

import { WRITENOW_SETTINGS_WIDGET_ID } from '../writenow-layout-ids';

/**
 * Settings category definition.
 */
type SettingsCategory = {
    id: string;
    label: string;
    icon: string;
};

const SETTINGS_CATEGORIES: SettingsCategory[] = [
    { id: 'ai', label: 'AI', icon: 'sparkle' },
    { id: 'editor', label: '编辑器', icon: 'edit' },
    { id: 'appearance', label: '外观', icon: 'paintcan' },
    { id: 'shortcuts', label: '快捷键', icon: 'keyboard' },
    { id: 'language', label: '语言', icon: 'globe' },
];

/**
 * AI Provider options.
 */
const AI_PROVIDERS = [
    { id: 'openai', label: 'OpenAI' },
    { id: 'claude', label: 'Claude (Anthropic)' },
];

/**
 * Models by provider.
 */
const MODELS_BY_PROVIDER: Record<string, { id: string; label: string }[]> = {
    openai: [
        { id: 'gpt-4o', label: 'GPT-4o' },
        { id: 'gpt-4o-mini', label: 'GPT-4o Mini' },
        { id: 'gpt-4-turbo', label: 'GPT-4 Turbo' },
        { id: 'gpt-3.5-turbo', label: 'GPT-3.5 Turbo' },
    ],
    claude: [
        { id: 'claude-sonnet-4-20250514', label: 'Claude Sonnet 4' },
        { id: 'claude-3-5-sonnet-20241022', label: 'Claude 3.5 Sonnet' },
        { id: 'claude-3-opus-20240229', label: 'Claude 3 Opus' },
        { id: 'claude-3-haiku-20240307', label: 'Claude 3 Haiku' },
    ],
};

type SettingsViewProps = Readonly<{
    messageService: MessageService;
    onClose: () => void;
}>;

/**
 * AI Settings panel component.
 */
function AiSettingsPanel(props: { messageService: MessageService }): React.ReactElement {
    const { messageService } = props;

    const [provider, setProvider] = React.useState<string>('openai');
    const [apiKey, setApiKey] = React.useState<string>('');
    const [showApiKey, setShowApiKey] = React.useState<boolean>(false);
    const [model, setModel] = React.useState<string>('gpt-4o');
    const [saving, setSaving] = React.useState<boolean>(false);

    // Load settings on mount from localStorage
    React.useEffect(() => {
        try {
            const stored = localStorage.getItem('writenow.aiSettings');
            if (stored) {
                const parsed = JSON.parse(stored);
                if (parsed.provider) setProvider(parsed.provider);
                if (parsed.model) setModel(parsed.model);
                // API key is not returned for security; user must re-enter
            }
        } catch {
            // Ignore load errors; use defaults
        }
    }, []);

    // Update model when provider changes
    React.useEffect(() => {
        const models = MODELS_BY_PROVIDER[provider] ?? [];
        if (models.length > 0 && !models.find((m) => m.id === model)) {
            setModel(models[0].id);
        }
    }, [provider, model]);

    const handleSave = (): void => {
        setSaving(true);
        try {
            // Store AI settings in localStorage
            const settings = {
                provider,
                model,
                // Note: In production, API keys should be stored securely via backend
                // For now, we store in localStorage (not recommended for production)
                hasApiKey: Boolean(apiKey),
            };
            localStorage.setItem('writenow.aiSettings', JSON.stringify(settings));
            
            // Store API key separately (in production, use secure storage)
            if (apiKey) {
                localStorage.setItem('writenow.apiKey', apiKey);
            }
            
            messageService.info('设置已保存');
        } catch (error) {
            const message = error instanceof Error ? error.message : String(error);
            messageService.error(`保存失败: ${message}`);
        } finally {
            setSaving(false);
        }
    };

    const models = MODELS_BY_PROVIDER[provider] ?? [];

    return (
        <div className="wn-settings-section">
            <h3 className="wn-settings-section-title">AI 配置</h3>
            
            <div className="wn-settings-field">
                <label className="wn-settings-label" htmlFor="settings-provider">
                    Provider
                </label>
                <select
                    id="settings-provider"
                    className="wn-settings-select"
                    value={provider}
                    onChange={(e) => setProvider(e.target.value)}
                >
                    {AI_PROVIDERS.map((p) => (
                        <option key={p.id} value={p.id}>{p.label}</option>
                    ))}
                </select>
            </div>

            <div className="wn-settings-field">
                <label className="wn-settings-label" htmlFor="settings-api-key">
                    API Key
                </label>
                <div className="wn-settings-input-group">
                    <input
                        id="settings-api-key"
                        type={showApiKey ? 'text' : 'password'}
                        className="wn-settings-input"
                        value={apiKey}
                        onChange={(e) => setApiKey(e.target.value)}
                        placeholder="sk-..."
                    />
                    <button
                        type="button"
                        className="wn-settings-icon-button"
                        onClick={() => setShowApiKey(!showApiKey)}
                        title={showApiKey ? '隐藏' : '显示'}
                    >
                        <span className={codicon(showApiKey ? 'eye-closed' : 'eye')} />
                    </button>
                </div>
            </div>

            <div className="wn-settings-field">
                <label className="wn-settings-label" htmlFor="settings-model">
                    Model
                </label>
                <select
                    id="settings-model"
                    className="wn-settings-select"
                    value={model}
                    onChange={(e) => setModel(e.target.value)}
                >
                    {models.map((m) => (
                        <option key={m.id} value={m.id}>{m.label}</option>
                    ))}
                </select>
            </div>

            <div className="wn-settings-actions">
                <button
                    type="button"
                    className="wn-settings-button wn-settings-button--primary"
                    onClick={handleSave}
                    disabled={saving}
                >
                    {saving ? '保存中...' : '保存'}
                </button>
            </div>
        </div>
    );
}

/**
 * Editor Settings panel component.
 */
function EditorSettingsPanel(): React.ReactElement {
    return (
        <div className="wn-settings-section">
            <h3 className="wn-settings-section-title">编辑器配置</h3>
            <p className="wn-settings-placeholder">编辑器配置选项将在后续版本中添加。</p>
        </div>
    );
}

/**
 * Appearance Settings panel component.
 */
function AppearanceSettingsPanel(): React.ReactElement {
    return (
        <div className="wn-settings-section">
            <h3 className="wn-settings-section-title">外观配置</h3>
            <p className="wn-settings-placeholder">
                主题切换和外观配置选项将在后续版本中添加。
            </p>
        </div>
    );
}

/**
 * Shortcuts Settings panel component.
 */
function ShortcutsSettingsPanel(): React.ReactElement {
    return (
        <div className="wn-settings-section">
            <h3 className="wn-settings-section-title">快捷键</h3>
            <div className="wn-settings-shortcuts-list">
                <div className="wn-settings-shortcut">
                    <span className="wn-settings-shortcut-key">⌘K</span>
                    <span className="wn-settings-shortcut-desc">打开 AI 面板</span>
                </div>
                <div className="wn-settings-shortcut">
                    <span className="wn-settings-shortcut-key">⌘S</span>
                    <span className="wn-settings-shortcut-desc">保存文件</span>
                </div>
                <div className="wn-settings-shortcut">
                    <span className="wn-settings-shortcut-key">⌘,</span>
                    <span className="wn-settings-shortcut-desc">打开设置</span>
                </div>
                <div className="wn-settings-shortcut">
                    <span className="wn-settings-shortcut-key">⌘F</span>
                    <span className="wn-settings-shortcut-desc">查找</span>
                </div>
                <div className="wn-settings-shortcut">
                    <span className="wn-settings-shortcut-key">⌘H</span>
                    <span className="wn-settings-shortcut-desc">替换</span>
                </div>
                <div className="wn-settings-shortcut">
                    <span className="wn-settings-shortcut-key">⌘B</span>
                    <span className="wn-settings-shortcut-desc">加粗</span>
                </div>
                <div className="wn-settings-shortcut">
                    <span className="wn-settings-shortcut-key">⌘I</span>
                    <span className="wn-settings-shortcut-desc">斜体</span>
                </div>
                <div className="wn-settings-shortcut">
                    <span className="wn-settings-shortcut-key">⌘Z</span>
                    <span className="wn-settings-shortcut-desc">撤销</span>
                </div>
                <div className="wn-settings-shortcut">
                    <span className="wn-settings-shortcut-key">⌘⇧Z</span>
                    <span className="wn-settings-shortcut-desc">重做</span>
                </div>
            </div>
        </div>
    );
}

/**
 * Language Settings panel component.
 */
function LanguageSettingsPanel(): React.ReactElement {
    return (
        <div className="wn-settings-section">
            <h3 className="wn-settings-section-title">语言设置</h3>
            <p className="wn-settings-placeholder">
                语言切换选项将在后续版本中添加。
            </p>
        </div>
    );
}

/**
 * Main Settings View component.
 */
function SettingsView(props: SettingsViewProps): React.ReactElement {
    const { messageService, onClose } = props;
    const [activeCategory, setActiveCategory] = React.useState<string>('ai');

    const renderCategoryContent = (): React.ReactNode => {
        switch (activeCategory) {
            case 'ai':
                return <AiSettingsPanel messageService={messageService} />;
            case 'editor':
                return <EditorSettingsPanel />;
            case 'appearance':
                return <AppearanceSettingsPanel />;
            case 'shortcuts':
                return <ShortcutsSettingsPanel />;
            case 'language':
                return <LanguageSettingsPanel />;
            default:
                return null;
        }
    };

    return (
        <div className="wn-settings-container" data-testid="writenow-settings">
            {/* Header */}
            <header className="wn-settings-header">
                <h2 className="wn-settings-title">设置</h2>
                <button
                    type="button"
                    className="wn-settings-close"
                    onClick={onClose}
                    title="关闭"
                >
                    <span className={codicon('close')} />
                </button>
            </header>

            {/* Content */}
            <div className="wn-settings-content">
                {/* Sidebar navigation */}
                <nav className="wn-settings-nav">
                    {SETTINGS_CATEGORIES.map((category) => (
                        <button
                            key={category.id}
                            type="button"
                            className={`wn-settings-nav-item ${activeCategory === category.id ? 'wn-settings-nav-item--active' : ''}`}
                            onClick={() => setActiveCategory(category.id)}
                        >
                            <span className={codicon(category.icon) + ' wn-settings-nav-icon'} />
                            <span className="wn-settings-nav-label">{category.label}</span>
                        </button>
                    ))}
                </nav>

                {/* Main content area */}
                <main className="wn-settings-main">
                    {renderCategoryContent()}
                </main>
            </div>
        </div>
    );
}

@injectable()
export class SettingsWidget extends ReactWidget {
    static readonly ID = WRITENOW_SETTINGS_WIDGET_ID;

    constructor(
        @inject(MessageService) private readonly messageService: MessageService,
    ) {
        super();
        this.id = SettingsWidget.ID;
        this.title.label = '设置';
        this.title.caption = 'WriteNow 设置';
        this.title.iconClass = codicon('gear');
        this.title.closable = true;
        this.addClass('writenow-settings');

        this.update();
    }

    protected override render(): React.ReactNode {
        return (
            <SettingsView
                messageService={this.messageService}
                onClose={() => this.close()}
            />
        );
    }
}
