import * as React from '@theia/core/shared/react';

import { codicon, ReactWidget } from '@theia/core/lib/browser/widgets';
import { inject, injectable } from '@theia/core/shared/inversify';

import type {
    AiSkillRunRequest,
    IpcError,
    KnowledgeGraphEntity,
    KnowledgeGraphRelation,
    RagRetrieveRequest,
    RagRetrieveResponse,
    SkillListItem,
} from '../../common/ipc-generated';
import { ActiveEditorService } from '../active-editor-service';
import { NotificationService } from '../notification/notification-widget';
import { WritenowFrontendService } from '../writenow-frontend-service';
import { WRITENOW_AI_PANEL_WIDGET_ID } from '../writenow-layout-ids';
import { AiPanelService } from './ai-panel-service';
import { diffChars } from './text-diff';

/**
 * Send a desktop notification if permitted.
 *
 * Why: Like Cursor, users should be notified when AI tasks complete,
 * especially if they've switched to another window.
 */
function sendDesktopNotification(title: string, body: string): void {
    // Only send if document is not visible (user switched away)
    if (document.visibilityState === 'visible') return;

    // Check permission
    if (!('Notification' in window)) return;
    if (Notification.permission === 'denied') return;

    if (Notification.permission === 'granted') {
        new Notification(title, { body, icon: '/icon.png' });
        return;
    }

    // Request permission (won't block, just won't send this time)
    void Notification.requestPermission();
}

type RunStatus = 'idle' | 'streaming' | 'done' | 'error' | 'canceled';

type ChatMessage = {
    id: string;
    role: 'user' | 'assistant';
    content: string;
    status?: RunStatus;
};

type SelectionSnapshot = { from: number; to: number; text: string };

/**
 * Slash command definition for quick access to skills.
 *
 * Why: Like Cursor, users should be able to type "/" to quickly access common AI actions
 * without navigating through dropdown menus.
 */
type SlashCommand = {
    id: string;
    name: string;
    description: string;
    icon: string;
    skillId: string | null;
};

const SLASH_COMMANDS: readonly SlashCommand[] = [
    { id: 'polish', name: '/polish', description: '润色文本，优化表达', icon: '✨', skillId: 'pkg.writenow.builtin/1.0.0/polish' },
    { id: 'expand', name: '/expand', description: '扩写内容，丰富细节', icon: '📝', skillId: 'pkg.writenow.builtin/1.0.0/expand' },
    { id: 'condense', name: '/condense', description: '精简内容，保留核心', icon: '📋', skillId: 'pkg.writenow.builtin/1.0.0/condense' },
    { id: 'outline', name: '/outline', description: '生成大纲结构', icon: '📑', skillId: null },
    { id: 'style', name: '/style', description: '改写风格', icon: '🎨', skillId: null },
];

function coerceString(value: unknown): string {
    return typeof value === 'string' ? value.trim() : '';
}

function isRecord(value: unknown): value is Record<string, unknown> {
    return Boolean(value) && typeof value === 'object' && !Array.isArray(value);
}

function generateLocalId(prefix: string): string {
    const rand = Math.random().toString(16).slice(2, 10);
    return `${prefix}_${Date.now()}_${rand}`;
}

function formatIpcError(error: IpcError): string {
    const msg = coerceString(error.message) || 'Unknown error';
    return `${error.code}: ${msg}`;
}

function formatRagContext(response: RagRetrieveResponse): string {
    const parts: string[] = [];

    const passages = Array.isArray(response.passages) ? response.passages : [];
    const characters = Array.isArray(response.characters) ? response.characters : [];
    const settings = Array.isArray(response.settings) ? response.settings : [];

    if (passages.length > 0) {
        parts.push('Passages:');
        for (const passage of passages.slice(0, 5)) {
            const title = coerceString(passage.title) || coerceString(passage.articleId) || 'Document';
            const content = coerceString(passage.content);
            if (!content) continue;
            parts.push(`- ${title} (#${passage.idx}): ${content}`);
        }
    }

    if (characters.length > 0) {
        parts.push('Characters:');
        for (const card of characters.slice(0, 5)) {
            const name = coerceString(card.name);
            const content = coerceString(card.content);
            if (!name || !content) continue;
            parts.push(`- ${name}: ${content}`);
        }
    }

    if (settings.length > 0) {
        parts.push('Settings:');
        for (const card of settings.slice(0, 5)) {
            const name = coerceString(card.name);
            const content = coerceString(card.content);
            if (!name || !content) continue;
            parts.push(`- ${name}: ${content}`);
        }
    }

    return parts.join('\n').trim();
}

function formatKnowledgeGraphContext(entities: readonly KnowledgeGraphEntity[], relations: readonly KnowledgeGraphRelation[], targetText: string): string {
    const haystack = typeof targetText === 'string' ? targetText : '';
    if (!haystack.trim()) return '';

    const matches: KnowledgeGraphEntity[] = [];
    for (const entity of entities) {
        const name = coerceString(entity.name);
        if (!name) continue;
        if (name.length < 2) continue;
        if (haystack.includes(name)) matches.push(entity);
    }

    if (matches.length === 0) return '';

    const limited = matches.slice(0, 8);
    const includedIds = new Set(limited.map((e) => e.id));
    const idToName = new Map(limited.map((e) => [e.id, coerceString(e.name)] as const));

    const edgeLines: string[] = [];
    for (const rel of relations) {
        if (!includedIds.has(rel.fromEntityId) || !includedIds.has(rel.toEntityId)) continue;
        const from = idToName.get(rel.fromEntityId) ?? rel.fromEntityId;
        const to = idToName.get(rel.toEntityId) ?? rel.toEntityId;
        const type = coerceString(rel.type) || 'related_to';
        edgeLines.push(`- ${from} -[${type}]-> ${to}`);
    }

    const parts: string[] = [];
    parts.push('Knowledge Graph:');
    parts.push('Entities:');
    for (const entity of limited) {
        const type = coerceString(entity.type) || 'Entity';
        const name = coerceString(entity.name) || '(unnamed)';
        const desc = coerceString(entity.description);
        parts.push(`- [${type}] ${name}${desc ? `: ${desc}` : ''}`);
    }

    if (edgeLines.length > 0) {
        parts.push('Relations:');
        parts.push(...edgeLines.slice(0, 12));
    }

    return parts.join('\n').trim();
}

function renderTemplate(template: string, data: Record<string, string>): string {
    const normalized = (typeof template === 'string' ? template : '').replace(/\r\n/g, '\n');

    // Why: Support the minimal Mustache subset used by SKILL.md templates:
    // - {{var}} interpolation
    // - {{#var}} ... {{/var}} conditional sections (truthy if `data[var]` is non-empty)
    let rendered = normalized;

    const sectionRe = /{{#([a-zA-Z0-9_]+)}}([\s\S]*?){{\/\1}}/g;
    rendered = rendered.replace(sectionRe, (_match: string, key: string, inner: string) => {
        const value = data[key] ?? '';
        if (!value.trim()) return '';
        return inner;
    });

    const varRe = /{{([a-zA-Z0-9_]+)}}/g;
    rendered = rendered.replace(varRe, (_match: string, key: string) => data[key] ?? '');

    return rendered;
}

/**
 * SlashCommandMenu component for quick command selection.
 *
 * Why: Provides Cursor-like slash command experience with keyboard navigation.
 */
type SlashCommandMenuProps = Readonly<{
    filter: string;
    selectedIndex: number;
    onSelect: (cmd: SlashCommand) => void;
    onClose: () => void;
}>;

function SlashCommandMenu(props: SlashCommandMenuProps): React.ReactElement | null {
    const { filter, selectedIndex, onSelect, onClose } = props;

    const filtered = React.useMemo(() => {
        if (!filter) return SLASH_COMMANDS;
        const lower = filter.toLowerCase();
        return SLASH_COMMANDS.filter((cmd) =>
            cmd.id.includes(lower) || cmd.name.includes(lower) || cmd.description.includes(lower)
        );
    }, [filter]);

    if (filtered.length === 0) return null;

    return (
        <div className="wn-ai-slash-menu" data-testid="writenow-ai-slash-menu">
            <div className="wn-ai-slash-menu-header">快捷命令</div>
            <div className="wn-ai-slash-menu-list">
                {filtered.map((cmd, idx) => (
                    <div
                        key={cmd.id}
                        className={`wn-ai-slash-menu-item${idx === selectedIndex ? ' wn-ai-slash-menu-item--selected' : ''}`}
                        onClick={() => onSelect(cmd)}
                        data-testid={`writenow-ai-slash-cmd-${cmd.id}`}
                    >
                        <div className="wn-ai-slash-menu-item-icon">{cmd.icon}</div>
                        <div className="wn-ai-slash-menu-item-content">
                            <div className="wn-ai-slash-menu-item-name">{cmd.name}</div>
                            <div className="wn-ai-slash-menu-item-desc">{cmd.description}</div>
                        </div>
                    </div>
                ))}
            </div>
        </div>
    );
}

/**
 * MessageBubble component with hover actions.
 *
 * Why: Like Cursor/ChatGPT, users should be able to copy or regenerate messages
 * without leaving the chat flow.
 */
type MessageBubbleProps = Readonly<{
    message: ChatMessage;
    onCopy: (content: string) => void;
    onRegenerate?: () => void;
}>;

function MessageBubble(props: MessageBubbleProps): React.ReactElement {
    const { message, onCopy, onRegenerate } = props;
    const isUser = message.role === 'user';
    const isStreaming = message.status === 'streaming';

    const wrapperClass = `wn-ai-message-wrapper wn-ai-message-wrapper--${message.role}`;
    const messageClass = `wn-ai-message wn-ai-message--${message.role}${isStreaming ? ' wn-ai-message--streaming' : ''}`;

    return (
        <div className={wrapperClass} data-testid={`writenow-ai-message-${message.role}`}>
            <div className="wn-ai-message-actions">
                <button
                    type="button"
                    className="wn-ai-message-action-btn"
                    onClick={() => onCopy(message.content)}
                    title="复制"
                    data-testid="writenow-ai-copy-btn"
                >
                    📋
                </button>
                {!isUser && onRegenerate && (
                    <button
                        type="button"
                        className="wn-ai-message-action-btn"
                        onClick={onRegenerate}
                        title="重新生成"
                        data-testid="writenow-ai-regenerate-btn"
                    >
                        🔄
                    </button>
                )}
            </div>
            <div className={messageClass}>
                {message.content || (isStreaming ? '…' : '')}
            </div>
        </div>
    );
}

type AiPanelViewProps = Readonly<{
    aiPanel: AiPanelService;
    writenow: WritenowFrontendService;
    activeEditor: ActiveEditorService;
    notificationService: NotificationService;
    onInputRef: (el: HTMLTextAreaElement | null) => void;
    onClosePanel: () => void;
}>;

function AiPanelView(props: AiPanelViewProps): React.ReactElement {
    const { aiPanel, writenow, activeEditor, notificationService, onInputRef, onClosePanel } = props;

    const [skills, setSkills] = React.useState<SkillListItem[]>([]);
    const [skillsLoading, setSkillsLoading] = React.useState(false);
    const [skillsError, setSkillsError] = React.useState<string | null>(null);
    const [skillId, setSkillId] = React.useState<string>('');

    const [input, setInput] = React.useState('');
    const [messages, setMessages] = React.useState<ChatMessage[]>([]);

    const [runStatus, setRunStatus] = React.useState<RunStatus>('idle');
    const [runId, setRunId] = React.useState<string | null>(null);
    const [runError, setRunError] = React.useState<string | null>(null);

    const [selection, setSelection] = React.useState<SelectionSnapshot | null>(null);
    const [suggestedText, setSuggestedText] = React.useState('');

    // Slash command menu state
    const [showSlashMenu, setShowSlashMenu] = React.useState(false);
    const [slashFilter, setSlashFilter] = React.useState('');
    const [slashSelectedIndex, setSlashSelectedIndex] = React.useState(0);

    const historyRef = React.useRef<HTMLDivElement | null>(null);
    const inputRef = React.useRef<HTMLTextAreaElement | null>(null);

    const scrollToBottom = React.useCallback(() => {
        const el = historyRef.current;
        if (!el) return;
        el.scrollTop = el.scrollHeight;
    }, []);

    React.useEffect(() => {
        scrollToBottom();
    }, [messages, scrollToBottom]);

    React.useEffect(() => {
        setSkillsLoading(true);
        setSkillsError(null);

        void aiPanel
            .listSkills({})
            .then((res) => {
                if (!res.ok) {
                    setSkillsError(formatIpcError(res.error));
                    setSkills([]);
                    return;
                }
                const list = res.data.skills;
                setSkills(list);
                if (!skillId && list.length > 0) {
                    setSkillId(list[0].id);
                }
            })
            .catch((error: unknown) => {
                setSkillsError(error instanceof Error ? error.message : String(error));
                setSkills([]);
            })
            .finally(() => setSkillsLoading(false));
        // Why: load once on mount; list refresh can be wired to future skills change notifications.
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    React.useEffect(() => {
        const disposable = aiPanel.onDidReceiveStreamEvent((event) => {
            if (runId && event.runId !== runId) return;

            if (event.type === 'delta') {
                setSuggestedText((prev) => prev + event.text);
                setMessages((prev) => {
                    const last = prev.length > 0 ? prev[prev.length - 1] : null;
                    if (last && last.role === 'assistant' && last.status === 'streaming') {
                        return [...prev.slice(0, -1), { ...last, content: last.content + event.text }];
                    }
                    return [...prev, { id: generateLocalId('assistant'), role: 'assistant', status: 'streaming', content: event.text }];
                });
                return;
            }

            if (event.type === 'done') {
                setRunStatus('done');
                setRunError(null);
                setSuggestedText(event.result.text);
                setMessages((prev) => {
                    const last = prev.length > 0 ? prev[prev.length - 1] : null;
                    if (last && last.role === 'assistant') {
                        return [...prev.slice(0, -1), { ...last, status: 'done', content: event.result.text }];
                    }
                    return [...prev, { id: generateLocalId('assistant'), role: 'assistant', status: 'done', content: event.result.text }];
                });

                // Notify user that AI task completed (like Cursor)
                notificationService.add('success', 'AI 任务完成', 'AI 已完成文本处理，点击查看结果');
                sendDesktopNotification('WriteNow', 'AI 任务已完成');
                return;
            }

            if (event.type === 'error') {
                const isCanceled = event.error.code === 'CANCELED';
                setRunStatus(isCanceled ? 'canceled' : 'error');
                setRunError(isCanceled ? null : formatIpcError(event.error));
                setRunId(null);
                setMessages((prev) => {
                    const last = prev.length > 0 ? prev[prev.length - 1] : null;
                    if (last && last.role === 'assistant') {
                        return [...prev.slice(0, -1), { ...last, status: isCanceled ? 'canceled' : 'error' }];
                    }
                    return prev;
                });
            }
        });
        return () => disposable.dispose();
    }, [aiPanel, runId]);

    const resolveSelectionSnapshot = React.useCallback((): SelectionSnapshot | null => {
        const editor = activeEditor.getActive();
        const snapshot = editor?.getSelectionSnapshot() ?? null;
        if (!snapshot) return null;
        if (!snapshot.text.trim()) return null;
        return snapshot;
    }, [activeEditor]);

    const onSend = React.useCallback(async (): Promise<void> => {
        if (runStatus === 'streaming') return;
        setRunError(null);
        setSuggestedText('');
        setSelection(null);
        setRunId(null);

        const chosen = skills.find((s) => s.id === skillId) ?? null;
        if (!chosen) {
            setRunStatus('error');
            setRunError('No skill selected.');
            return;
        }

        const snapshot = resolveSelectionSnapshot();
        const hasSelection = Boolean(snapshot);
        const inputTrimmed = input.trim();
        const targetText = hasSelection ? snapshot!.text : inputTrimmed;
        const instruction = hasSelection ? inputTrimmed : '';

        if (!targetText.trim()) {
            setRunStatus('error');
            setRunError(hasSelection ? 'Selection is empty.' : 'Input is empty.');
            return;
        }

        setRunStatus('streaming');
        setSelection(snapshot);

        setMessages((prev) => [
            ...prev,
            { id: generateLocalId('user'), role: 'user', content: `${chosen.name}${instruction ? `\n\n${instruction}` : ''}` },
            { id: generateLocalId('assistant'), role: 'assistant', status: 'streaming', content: '' },
        ]);

        const skillResp = await aiPanel.getSkill({ id: chosen.id });
        if (!skillResp.ok) {
            setRunStatus('error');
            setRunError(formatIpcError(skillResp.error));
            return;
        }

        const definition = skillResp.data.skill.definition;
        if (!definition) {
            setRunStatus('error');
            setRunError('Skill definition is unavailable.');
            return;
        }

        const fm = definition.frontmatter;
        const prompt = isRecord(fm.prompt) ? fm.prompt : null;
        const systemTemplate = typeof prompt?.system === 'string' ? prompt.system : '';
        const userTemplate = typeof prompt?.user === 'string' ? prompt.user : '';
        if (!systemTemplate.trim() || !userTemplate.trim()) {
            setRunStatus('error');
            setRunError('Skill prompt is invalid (missing prompt.system or prompt.user).');
            return;
        }

        let ragContext = '';
        const ragReq: RagRetrieveRequest = {
            queryText: targetText.slice(0, 2000),
            budget: { maxChunks: 2, maxChars: 1200, maxCharacters: 3, maxSettings: 3, cursor: '0' },
        };
        try {
            const ragRes = await writenow.invokeResponse('rag:retrieve', ragReq);
            if (ragRes.ok) {
                ragContext = formatRagContext(ragRes.data);
            }
        } catch {
            // ignore: RAG is optional for initial panel usage.
        }

        let kgContext = '';
        try {
            const bootstrap = await writenow.invokeResponse('project:bootstrap', {});
            if (bootstrap.ok) {
                const kgRes = await writenow.invokeResponse('kg:graph:get', { projectId: bootstrap.data.currentProjectId });
                if (kgRes.ok) {
                    kgContext = formatKnowledgeGraphContext(kgRes.data.entities, kgRes.data.relations, targetText);
                }
            }
        } catch {
            // ignore: KG is optional for initial panel usage.
        }

        const contextCombined = [instruction, ragContext, kgContext].map((s) => s.trim()).filter(Boolean).join('\n\n');
        const userContent = renderTemplate(userTemplate, {
            text: targetText,
            context: contextCombined,
            styleGuide: '',
        });

        const request: AiSkillRunRequest = {
            skillId: chosen.id,
            input: { text: targetText, language: 'zh-CN' },
            prompt: { systemPrompt: systemTemplate, userContent },
            stream: true,
            injected: { memory: [] },
        };

        const start = await aiPanel.streamResponse(request);
        if (!start.ok) {
            setRunStatus('error');
            setRunError(formatIpcError(start.error));
            return;
        }
        setRunId(start.data.runId);
    }, [aiPanel, input, resolveSelectionSnapshot, runStatus, skillId, skills, writenow]);

    const onStop = React.useCallback(async (): Promise<void> => {
        if (runStatus !== 'streaming') return;
        if (!runId) return;
        try {
            await aiPanel.cancel({ runId });
        } catch {
            // ignore: backend will emit terminal error anyway.
        }
    }, [aiPanel, runId, runStatus]);

    const onDiscard = React.useCallback(() => {
        setRunStatus('idle');
        setRunId(null);
        setRunError(null);
        setSelection(null);
        setSuggestedText('');
    }, []);

    const onApply = React.useCallback(async () => {
        if (runStatus !== 'done') return;
        if (!selection) return;
        const editor = activeEditor.getActive();
        const articleId = editor?.getArticleId();
        if (!editor || !articleId) {
            window.alert('No active editor.');
            return;
        }
        if (!suggestedText.trim()) return;

        // Why: Version history is WriteNow's safety net for AI-assisted edits.
        // We snapshot both the pre-apply and post-apply document so users can diff/rollback.
        const reason = skillId ? `ai:${skillId}` : 'ai';
        const before = editor.getMarkdown();
        const pre = await writenow.invokeResponse('version:create', {
            articleId,
            content: before,
            name: 'Before AI',
            reason,
            actor: 'auto',
        });
        if (!pre.ok) {
            window.alert(`Failed to save pre-AI snapshot: ${formatIpcError(pre.error)}`);
        }

        editor.replaceRange(selection.from, selection.to, suggestedText);

        const after = editor.getMarkdown();
        const post = await writenow.invokeResponse('version:create', {
            articleId,
            content: after,
            name: 'AI Apply',
            reason,
            actor: 'ai',
        });
        if (!post.ok) {
            window.alert(`Failed to save AI snapshot: ${formatIpcError(post.error)}`);
        }

        onDiscard();
    }, [activeEditor, onDiscard, runStatus, selection, skillId, suggestedText, writenow]);

    const showDiff = runStatus === 'done' && Boolean(selection) && Boolean(selection?.text.trim()) && Boolean(suggestedText.trim());

    /**
     * Why: Build CSS class names dynamically for messages based on role and status.
     * This approach moves styling logic out of inline styles into the CSS file.
     */
    const getStatusClassName = (): string => {
        const classes = ['wn-ai-status'];
        if (runStatus === 'streaming') classes.push('wn-ai-status--streaming');
        if (runStatus === 'error') classes.push('wn-ai-status--error');
        return classes.join(' ');
    };

    /**
     * Handle slash command selection.
     *
     * Why: When user selects a slash command, we map it to the corresponding skill
     * and trigger the send action automatically.
     */
    const handleSlashCommandSelect = React.useCallback((cmd: SlashCommand) => {
        setShowSlashMenu(false);
        setSlashFilter('');
        setSlashSelectedIndex(0);
        setInput('');

        if (cmd.skillId) {
            // Find matching skill in loaded skills
            const matchingSkill = skills.find((s) => s.id === cmd.skillId);
            if (matchingSkill) {
                setSkillId(matchingSkill.id);
                // Auto-trigger send after skill selection
                setTimeout(() => {
                    void onSend();
                }, 50);
            } else {
                setRunError(`技能 ${cmd.skillId} 不可用`);
            }
        } else {
            setRunError(`命令 ${cmd.name} 尚未实现`);
        }
    }, [skills, onSend]);

    /**
     * Handle input changes for slash command detection.
     *
     * Why: We need to detect when user types "/" at the start of input
     * to show the slash command menu.
     */
    const handleInputChange = React.useCallback((e: React.ChangeEvent<HTMLTextAreaElement>) => {
        const value = e.target.value;
        setInput(value);

        // Detect slash command
        if (value.startsWith('/')) {
            setShowSlashMenu(true);
            setSlashFilter(value.slice(1));
            setSlashSelectedIndex(0);
        } else {
            setShowSlashMenu(false);
            setSlashFilter('');
        }
    }, []);

    /**
     * Handle keyboard navigation in slash menu.
     */
    const handleInputKeyDown = React.useCallback((e: React.KeyboardEvent<HTMLTextAreaElement>) => {
        if (e.key === 'Escape') {
            if (showSlashMenu) {
                e.preventDefault();
                setShowSlashMenu(false);
                setSlashFilter('');
                setInput('');
            } else {
                e.preventDefault();
                onClosePanel();
            }
            return;
        }

        if (showSlashMenu) {
            const filtered = slashFilter
                ? SLASH_COMMANDS.filter((cmd) =>
                    cmd.id.includes(slashFilter.toLowerCase()) ||
                    cmd.name.includes(slashFilter.toLowerCase())
                )
                : SLASH_COMMANDS;

            if (e.key === 'ArrowDown') {
                e.preventDefault();
                setSlashSelectedIndex((prev) => Math.min(prev + 1, filtered.length - 1));
                return;
            }

            if (e.key === 'ArrowUp') {
                e.preventDefault();
                setSlashSelectedIndex((prev) => Math.max(prev - 1, 0));
                return;
            }

            if (e.key === 'Enter' && filtered.length > 0) {
                e.preventDefault();
                handleSlashCommandSelect(filtered[slashSelectedIndex]);
                return;
            }

            if (e.key === 'Tab' && filtered.length > 0) {
                e.preventDefault();
                handleSlashCommandSelect(filtered[slashSelectedIndex]);
                return;
            }
        }
    }, [showSlashMenu, slashFilter, slashSelectedIndex, handleSlashCommandSelect, onClosePanel]);

    /**
     * Handle copy message to clipboard.
     */
    const handleCopyMessage = React.useCallback((content: string) => {
        void navigator.clipboard.writeText(content).then(() => {
            notificationService.add('success', '已复制', '消息内容已复制到剪贴板');
        }).catch(() => {
            notificationService.add('error', '复制失败', '无法访问剪贴板');
        });
    }, [notificationService]);

    /**
     * Handle regenerate last assistant message.
     */
    const handleRegenerate = React.useCallback(() => {
        if (runStatus === 'streaming') return;
        // Remove last assistant message and resend
        setMessages((prev) => {
            const lastUserIdx = prev.findLastIndex((m) => m.role === 'user');
            if (lastUserIdx >= 0) {
                return prev.slice(0, lastUserIdx + 1);
            }
            return prev;
        });
        void onSend();
    }, [runStatus, onSend]);

    return (
        <div className="wn-ai-panel-container" data-testid="writenow-ai-panel">
            {/* Skill selector bar */}
            <div className="wn-ai-skill-bar">
                <select
                    value={skillId}
                    onChange={(e) => setSkillId(e.target.value)}
                    className="wn-ai-skill-select"
                    disabled={skillsLoading}
                    data-testid="writenow-ai-skill-select"
                >
                    {skills.map((skill) => (
                        <option key={skill.id} value={skill.id}>
                            {skill.name}
                        </option>
                    ))}
                </select>
                <button
                    type="button"
                    className="wn-ai-button wn-ai-button--primary"
                    onClick={() => void onSend()}
                    disabled={skillsLoading || runStatus === 'streaming'}
                    data-testid="writenow-ai-send"
                >
                    Send
                </button>
                <button
                    type="button"
                    className="wn-ai-button wn-ai-button--secondary"
                    onClick={() => void onStop()}
                    disabled={runStatus !== 'streaming'}
                    data-testid="writenow-ai-stop"
                >
                    Stop
                </button>
            </div>

            {/* Error displays */}
            {skillsError && (
                <div className="wn-ai-error" data-testid="writenow-ai-skills-error">
                    {skillsError}
                </div>
            )}

            {runError && (
                <div className="wn-ai-error" data-testid="writenow-ai-run-error">
                    {runError}
                </div>
            )}

            {/* Status indicator */}
            <div className={getStatusClassName()} data-testid="writenow-ai-status">
                Status: {runStatus}
                {runId ? ` (${runId})` : ''}
            </div>

            {/* Chat history */}
            <div
                ref={historyRef}
                className="wn-ai-history"
                data-testid="writenow-ai-history"
            >
                {messages.length === 0 && (
                    <div className="wn-ai-history--empty">
                        输入 / 使用快捷命令，或选择技能后发送。支持在编辑器中选择文本后发送。
                    </div>
                )}
                {messages.map((m, idx) => (
                    <MessageBubble
                        key={m.id}
                        message={m}
                        onCopy={handleCopyMessage}
                        onRegenerate={m.role === 'assistant' && idx === messages.length - 1 ? handleRegenerate : undefined}
                    />
                ))}
            </div>

            {/* Quick action bar */}
            <div className="wn-ai-quick-bar">
                <button
                    type="button"
                    className={`wn-ai-quick-btn${showSlashMenu ? ' wn-ai-quick-btn--active' : ''}`}
                    onClick={() => {
                        setShowSlashMenu(!showSlashMenu);
                        setInput(showSlashMenu ? '' : '/');
                        inputRef.current?.focus();
                    }}
                    title="斜杠命令"
                    data-testid="writenow-ai-slash-trigger"
                >
                    / 命令
                </button>
                <select
                    className="wn-ai-model-select"
                    title="模型选择（即将推出）"
                    data-testid="writenow-ai-model-select"
                >
                    <option value="default">默认模型</option>
                </select>
            </div>

            {/* Input area with slash menu */}
            <div className="wn-ai-input-container">
                {showSlashMenu && (
                    <SlashCommandMenu
                        filter={slashFilter}
                        selectedIndex={slashSelectedIndex}
                        onSelect={handleSlashCommandSelect}
                        onClose={() => {
                            setShowSlashMenu(false);
                            setSlashFilter('');
                        }}
                    />
                )}
                <textarea
                    ref={(el) => {
                        inputRef.current = el;
                        onInputRef(el);
                    }}
                    value={input}
                    onChange={handleInputChange}
                    placeholder="输入 / 使用快捷命令，或输入指令..."
                    className="wn-ai-input"
                    data-testid="writenow-ai-input"
                    onKeyDown={handleInputKeyDown}
                />
            </div>

            {/* Diff view for apply/discard */}
            {showDiff && (
                <div className="wn-ai-diff" data-testid="writenow-ai-diff">
                    <div className="wn-ai-diff-actions">
                        <button
                            type="button"
                            className="wn-ai-button wn-ai-button--secondary"
                            onClick={onDiscard}
                            data-testid="writenow-ai-discard"
                        >
                            Discard
                        </button>
                        <button
                            type="button"
                            className="wn-ai-button wn-ai-button--primary"
                            onClick={onApply}
                            data-testid="writenow-ai-apply"
                        >
                            Apply
                        </button>
                    </div>

                    <div className="wn-ai-diff-grid">
                        <div className="wn-ai-diff-pane">
                            <div className="wn-ai-diff-label">Original</div>
                            <pre className="wn-ai-diff-content">
                                {diffChars(selection!.text, suggestedText).map((seg, idx) => {
                                    if (seg.op === 'insert') return null;
                                    return (
                                        <span
                                            key={idx}
                                            className={seg.op === 'delete' ? 'wn-ai-diff-delete' : ''}
                                        >
                                            {seg.text}
                                        </span>
                                    );
                                })}
                            </pre>
                        </div>

                        <div className="wn-ai-diff-pane">
                            <div className="wn-ai-diff-label">Suggested</div>
                            <pre className="wn-ai-diff-content">
                                {diffChars(selection!.text, suggestedText).map((seg, idx) => {
                                    if (seg.op === 'delete') return null;
                                    return (
                                        <span
                                            key={idx}
                                            className={seg.op === 'insert' ? 'wn-ai-diff-insert' : ''}
                                        >
                                            {seg.text}
                                        </span>
                                    );
                                })}
                            </pre>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}

@injectable()
export class AiPanelWidget extends ReactWidget {
    static readonly ID = WRITENOW_AI_PANEL_WIDGET_ID;

    private inputEl: HTMLTextAreaElement | null = null;

    constructor(
        @inject(AiPanelService) private readonly aiPanel: AiPanelService,
        @inject(WritenowFrontendService) private readonly writenow: WritenowFrontendService,
        @inject(ActiveEditorService) private readonly activeEditor: ActiveEditorService,
        @inject(NotificationService) private readonly notificationService: NotificationService,
    ) {
        super();
        this.id = AiPanelWidget.ID;
        this.title.label = 'AI Panel';
        this.title.caption = 'WriteNow AI Panel';
        this.title.iconClass = codicon('sparkle');
        this.title.closable = true;
        this.addClass('writenow-ai-panel');

        this.update();
    }

    /**
     * Focus the input field inside the panel.
     *
     * Why: Ctrl/Cmd+K should open the panel and place the caret immediately for fast iteration.
     */
    focusInput(): void {
        this.inputEl?.focus();
    }

    protected override render(): React.ReactNode {
        return (
            <AiPanelView
                aiPanel={this.aiPanel}
                writenow={this.writenow}
                activeEditor={this.activeEditor}
                notificationService={this.notificationService}
                onInputRef={(el) => {
                    this.inputEl = el;
                }}
                onClosePanel={() => this.close()}
            />
        );
    }
}
