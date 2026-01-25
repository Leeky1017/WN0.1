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
 */
function sendDesktopNotification(title: string, body: string): void {
    if (document.visibilityState === 'visible') return;
    if (!('Notification' in window)) return;
    if (Notification.permission === 'denied') return;

    if (Notification.permission === 'granted') {
        new Notification(title, { body, icon: '/icon.png' });
        return;
    }

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
 */
type SlashCommand = {
    id: string;
    name: string;
    description: string;
    skillId: string | null;
};

const SLASH_COMMANDS: readonly SlashCommand[] = [
    { id: 'polish', name: '/polish', description: '润色文本，优化表达', skillId: 'pkg.writenow.builtin/1.0.0/polish' },
    { id: 'expand', name: '/expand', description: '扩写内容，丰富细节', skillId: 'pkg.writenow.builtin/1.0.0/expand' },
    { id: 'condense', name: '/condense', description: '精简内容，保留核心', skillId: 'pkg.writenow.builtin/1.0.0/condense' },
    { id: 'outline', name: '/outline', description: '生成大纲结构', skillId: null },
    { id: 'style', name: '/style', description: '改写风格', skillId: null },
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

function formatKnowledgeGraphContext(
    entities: readonly KnowledgeGraphEntity[],
    relations: readonly KnowledgeGraphRelation[],
    targetText: string
): string {
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
 * Slash command menu component.
 */
type SlashCommandMenuProps = Readonly<{
    filter: string;
    selectedIndex: number;
    onSelect: (cmd: SlashCommand) => void;
}>;

function SlashCommandMenu(props: SlashCommandMenuProps): React.ReactElement | null {
    const { filter, selectedIndex, onSelect } = props;

    const filtered = React.useMemo(() => {
        if (!filter) return SLASH_COMMANDS;
        const lower = filter.toLowerCase();
        return SLASH_COMMANDS.filter(
            (cmd) => cmd.id.includes(lower) || cmd.name.includes(lower) || cmd.description.includes(lower)
        );
    }, [filter]);

    if (filtered.length === 0) return null;

    return (
        <div className="wn-ai-slash-menu" data-testid="writenow-ai-slash-menu">
            <div className="wn-ai-slash-menu-header">Commands</div>
            <div className="wn-ai-slash-menu-list">
                {filtered.map((cmd, idx) => (
                    <div
                        key={cmd.id}
                        className={`wn-ai-slash-menu-item${idx === selectedIndex ? ' wn-ai-slash-menu-item--selected' : ''}`}
                        onClick={() => onSelect(cmd)}
                        data-testid={`writenow-ai-slash-cmd-${cmd.id}`}
                    >
                        <div className="wn-ai-slash-menu-item-icon">/</div>
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
 * Message block component - Cursor style with YOU/AI labels.
 */
type MessageBlockProps = Readonly<{
    message: ChatMessage;
    onCopy: (content: string) => void;
}>;

function MessageBlock(props: MessageBlockProps): React.ReactElement {
    const { message, onCopy } = props;
    const isUser = message.role === 'user';
    const isStreaming = message.status === 'streaming';

    const blockClass = `wn-ai-message-block wn-ai-message-block--${message.role}${isStreaming ? ' wn-ai-message-block--streaming' : ''}`;
    const label = isUser ? 'YOU' : 'AI';

    return (
        <div className={blockClass} data-testid={`writenow-ai-message-${message.role}`}>
            <div className="wn-ai-message-label">{label}</div>
            <div className="wn-ai-message-text">{message.content || (isStreaming ? '' : '')}</div>
            {!isStreaming && message.content && (
                <div className="wn-ai-code-block" style={{ marginTop: '12px' }}>
                    <div className="wn-ai-code-header">
                        <span className="wn-ai-code-lang">Output</span>
                        <div className="wn-ai-code-actions">
                            <button
                                type="button"
                                className="wn-ai-code-action"
                                onClick={() => onCopy(message.content)}
                                data-testid="writenow-ai-copy-btn"
                            >
                                Copy
                            </button>
                        </div>
                    </div>
                </div>
            )}
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
    const [skillId, setSkillId] = React.useState<string>('');

    const [input, setInput] = React.useState('');
    const [messages, setMessages] = React.useState<ChatMessage[]>([]);

    const [runStatus, setRunStatus] = React.useState<RunStatus>('idle');
    const [runId, setRunId] = React.useState<string | null>(null);
    const [runError, setRunError] = React.useState<string | null>(null);

    const [selection, setSelection] = React.useState<SelectionSnapshot | null>(null);
    const [suggestedText, setSuggestedText] = React.useState('');

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

        void aiPanel
            .listSkills({})
            .then((res) => {
                if (!res.ok) {
                    setSkills([]);
                    return;
                }
                const list = res.data.skills;
                setSkills(list);
                if (!skillId && list.length > 0) {
                    setSkillId(list[0].id);
                }
            })
            .catch(() => {
                setSkills([]);
            })
            .finally(() => setSkillsLoading(false));
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
                    return [
                        ...prev,
                        { id: generateLocalId('assistant'), role: 'assistant', status: 'streaming', content: event.text },
                    ];
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
                    return [
                        ...prev,
                        { id: generateLocalId('assistant'), role: 'assistant', status: 'done', content: event.result.text },
                    ];
                });

                notificationService.add('success', 'AI 任务完成', 'AI 已完成文本处理');
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
    }, [aiPanel, runId, notificationService]);

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
            setRunError('Skill prompt is invalid.');
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
            // RAG is optional
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
            // KG is optional
        }

        const contextCombined = [instruction, ragContext, kgContext]
            .map((s) => s.trim())
            .filter(Boolean)
            .join('\n\n');
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
            // ignore
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

    const showDiff =
        runStatus === 'done' && Boolean(selection) && Boolean(selection?.text.trim()) && Boolean(suggestedText.trim());

    const handleSlashCommandSelect = React.useCallback(
        (cmd: SlashCommand) => {
            setShowSlashMenu(false);
            setSlashFilter('');
            setSlashSelectedIndex(0);
            setInput('');

            if (cmd.skillId) {
                const matchingSkill = skills.find((s) => s.id === cmd.skillId);
                if (matchingSkill) {
                    setSkillId(matchingSkill.id);
                    setTimeout(() => {
                        void onSend();
                    }, 50);
                } else {
                    setRunError(`Skill ${cmd.skillId} not available`);
                }
            } else {
                setRunError(`Command ${cmd.name} not implemented`);
            }
        },
        [skills, onSend]
    );

    const handleInputChange = React.useCallback((e: React.ChangeEvent<HTMLTextAreaElement>) => {
        const value = e.target.value;
        setInput(value);

        if (value.startsWith('/')) {
            setShowSlashMenu(true);
            setSlashFilter(value.slice(1));
            setSlashSelectedIndex(0);
        } else {
            setShowSlashMenu(false);
            setSlashFilter('');
        }
    }, []);

    const handleInputKeyDown = React.useCallback(
        (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
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
                    ? SLASH_COMMANDS.filter(
                          (cmd) =>
                              cmd.id.includes(slashFilter.toLowerCase()) || cmd.name.includes(slashFilter.toLowerCase())
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

                if ((e.key === 'Enter' || e.key === 'Tab') && filtered.length > 0) {
                    e.preventDefault();
                    handleSlashCommandSelect(filtered[slashSelectedIndex]);
                    return;
                }
            }

            if (e.key === 'Enter' && !e.shiftKey && !showSlashMenu) {
                e.preventDefault();
                void onSend();
            }
        },
        [showSlashMenu, slashFilter, slashSelectedIndex, handleSlashCommandSelect, onClosePanel, onSend]
    );

    const handleCopyMessage = React.useCallback(
        (content: string) => {
            void navigator.clipboard
                .writeText(content)
                .then(() => {
                    notificationService.add('success', 'Copied', 'Content copied to clipboard');
                })
                .catch(() => {
                    notificationService.add('error', 'Copy failed', 'Cannot access clipboard');
                });
        },
        [notificationService]
    );

    return (
        <div className="wn-ai-panel-container" data-testid="writenow-ai-panel">
            {/* Header with collapse button */}
            <div className="wn-ai-header">
                <span className="wn-ai-header-title">AI</span>
                <button
                    type="button"
                    className="wn-ai-header-collapse"
                    onClick={onClosePanel}
                    title="Collapse AI Panel (Esc)"
                    data-testid="writenow-ai-collapse-btn"
                >
                    <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2">
                        <polyline points="9 18 15 12 9 6" />
                    </svg>
                </button>
            </div>

            {/* Error display */}
            {runError && (
                <div className="wn-ai-error" data-testid="writenow-ai-run-error">
                    {runError}
                </div>
            )}

            {/* Chat history */}
            <div ref={historyRef} className="wn-ai-history" data-testid="writenow-ai-history">
                {messages.length === 0 && (
                    <div className="wn-ai-history--empty">Type / for commands, or ask anything...</div>
                )}
                {messages.map((m) => (
                    <MessageBlock key={m.id} message={m} onCopy={handleCopyMessage} />
                ))}
            </div>

            {/* Diff view */}
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
                                        <span key={idx} className={seg.op === 'delete' ? 'wn-ai-diff-delete' : ''}>
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
                                        <span key={idx} className={seg.op === 'insert' ? 'wn-ai-diff-insert' : ''}>
                                            {seg.text}
                                        </span>
                                    );
                                })}
                            </pre>
                        </div>
                    </div>
                </div>
            )}

            {/* Input section - Input first design */}
            <div className="wn-ai-input-section">
                <div className="wn-ai-input-container">
                    {/* Slash menu */}
                    {showSlashMenu && (
                        <SlashCommandMenu
                            filter={slashFilter}
                            selectedIndex={slashSelectedIndex}
                            onSelect={handleSlashCommandSelect}
                        />
                    )}

                    {/* Textarea wrapper - input first */}
                    <div className="wn-ai-textarea-wrapper">
                        <textarea
                            ref={(el) => {
                                inputRef.current = el;
                                onInputRef(el);
                            }}
                            value={input}
                            onChange={handleInputChange}
                            placeholder="Ask anything..."
                            className="wn-ai-input"
                            data-testid="writenow-ai-input"
                            onKeyDown={handleInputKeyDown}
                        />
                    </div>

                    {/* Toolbar - controls at bottom */}
                    <div className="wn-ai-toolbar">
                        <div className="wn-ai-toolbar-left">
                            {/* Mode button */}
                            <button type="button" className="wn-ai-mode-btn" data-testid="writenow-ai-mode-btn">
                                <span>Agent</span>
                                <i className="arrow" />
                            </button>

                            <div className="wn-ai-separator" />

                            {/* Model selector */}
                            <button type="button" className="wn-ai-opt-btn" data-testid="writenow-ai-model-btn">
                                <span>Opus 4.5</span>
                                <i className="arrow" />
                            </button>

                            {/* Skills selector */}
                            <button
                                type="button"
                                className="wn-ai-opt-btn"
                                onClick={() => {
                                    const next = skills[(skills.findIndex((s) => s.id === skillId) + 1) % skills.length];
                                    if (next) setSkillId(next.id);
                                }}
                                disabled={skillsLoading}
                                data-testid="writenow-ai-skills-btn"
                            >
                                <span>Skills</span>
                                <i className="arrow" />
                            </button>
                        </div>

                        <div className="wn-ai-toolbar-right">
                            {/* Attachment button */}
                            <button type="button" className="wn-ai-icon-btn" title="Attach file">
                                <svg viewBox="0 0 24 24">
                                    <path d="M21.44 11.05l-9.19 9.19a6 6 0 0 1-8.49-8.49l9.19-9.19a4 4 0 0 1 5.66 5.66l-9.2 9.19a2 2 0 0 1-2.83-2.83l8.49-8.48" />
                                </svg>
                            </button>

                            {/* Stop button (when streaming) */}
                            {runStatus === 'streaming' && (
                                <button
                                    type="button"
                                    className="wn-ai-icon-btn"
                                    onClick={() => void onStop()}
                                    title="Stop"
                                    data-testid="writenow-ai-stop"
                                >
                                    <svg viewBox="0 0 24 24">
                                        <rect x="6" y="6" width="12" height="12" rx="2" fill="currentColor" />
                                    </svg>
                                </button>
                            )}

                            {/* Send button */}
                            <button
                                type="button"
                                className="wn-ai-send-btn"
                                onClick={() => void onSend()}
                                disabled={runStatus === 'streaming'}
                                data-testid="writenow-ai-send"
                            >
                                <svg viewBox="0 0 24 24">
                                    <line x1="5" y1="12" x2="19" y2="12" />
                                    <polyline points="12 5 19 12 12 19" />
                                </svg>
                            </button>
                        </div>
                    </div>
                </div>
            </div>
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
        @inject(NotificationService) private readonly notificationService: NotificationService
    ) {
        super();
        this.id = AiPanelWidget.ID;
        this.title.label = 'AI';
        this.title.caption = 'WriteNow AI';
        this.title.iconClass = codicon('sparkle');
        this.title.closable = true;
        this.addClass('writenow-ai-panel');

        this.update();
    }

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
