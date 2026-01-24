import * as React from '@theia/core/shared/react';

import { codicon, ReactWidget } from '@theia/core/lib/browser/widgets';
import { inject, injectable } from '@theia/core/shared/inversify';

import type { AiSkillRunRequest, IpcError, RagRetrieveRequest, RagRetrieveResponse, SkillListItem } from '../../common/ipc-generated';
import { ActiveEditorService } from '../active-editor-service';
import { WritenowFrontendService } from '../writenow-frontend-service';
import { WRITENOW_AI_PANEL_WIDGET_ID } from '../writenow-layout-ids';
import { AiPanelService } from './ai-panel-service';
import { diffChars } from './text-diff';

type RunStatus = 'idle' | 'streaming' | 'done' | 'error' | 'canceled';

type ChatMessage = {
    id: string;
    role: 'user' | 'assistant';
    content: string;
    status?: RunStatus;
};

type SelectionSnapshot = { from: number; to: number; text: string };

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

type AiPanelViewProps = Readonly<{
    aiPanel: AiPanelService;
    writenow: WritenowFrontendService;
    activeEditor: ActiveEditorService;
    onInputRef: (el: HTMLTextAreaElement | null) => void;
    onClosePanel: () => void;
}>;

function AiPanelView(props: AiPanelViewProps): React.ReactElement {
    const { aiPanel, writenow, activeEditor, onInputRef, onClosePanel } = props;

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

    const historyRef = React.useRef<HTMLDivElement | null>(null);

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

        const contextCombined = [instruction, ragContext].map((s) => s.trim()).filter(Boolean).join('\n\n');
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

    return (
        <div
            style={{
                height: '100%',
                width: '100%',
                display: 'flex',
                flexDirection: 'column',
                boxSizing: 'border-box',
                gap: 10,
                padding: 10,
                color: 'var(--theia-ui-font-color1)',
            }}
            data-testid="writenow-ai-panel"
        >
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <select
                    value={skillId}
                    onChange={(e) => setSkillId(e.target.value)}
                    style={{ flex: 1, height: 30 }}
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
                    onClick={() => void onSend()}
                    disabled={skillsLoading || runStatus === 'streaming'}
                    data-testid="writenow-ai-send"
                    style={{ height: 30 }}
                >
                    Send
                </button>
                <button
                    type="button"
                    onClick={() => void onStop()}
                    disabled={runStatus !== 'streaming'}
                    data-testid="writenow-ai-stop"
                    style={{ height: 30 }}
                >
                    Stop
                </button>
            </div>

            {skillsError && (
                <div style={{ color: 'var(--theia-errorForeground)', fontSize: 12 }} data-testid="writenow-ai-skills-error">
                    {skillsError}
                </div>
            )}

            {runError && (
                <div style={{ color: 'var(--theia-errorForeground)', fontSize: 12 }} data-testid="writenow-ai-run-error">
                    {runError}
                </div>
            )}

            <div style={{ fontSize: 11, opacity: 0.8 }} data-testid="writenow-ai-status">
                Status: {runStatus}
                {runId ? ` (${runId})` : ''}
            </div>

            <div
                ref={historyRef}
                style={{
                    flex: 1,
                    overflow: 'auto',
                    border: '1px solid var(--theia-border-color1)',
                    borderRadius: 6,
                    padding: 8,
                    background: 'var(--theia-editor-background)',
                    display: 'flex',
                    flexDirection: 'column',
                    gap: 8,
                }}
                data-testid="writenow-ai-history"
            >
                {messages.length === 0 && (
                    <div style={{ opacity: 0.8, fontSize: 12 }}>
                        Select a SKILL, type an optional instruction, then Send (or select text in the editor and Send).
                    </div>
                )}
                {messages.map((m) => (
                    <div
                        key={m.id}
                        style={{
                            alignSelf: m.role === 'user' ? 'flex-end' : 'flex-start',
                            maxWidth: '100%',
                            whiteSpace: 'pre-wrap',
                            wordBreak: 'break-word',
                            padding: '6px 8px',
                            borderRadius: 6,
                            border: '1px solid var(--theia-border-color1)',
                            background: m.role === 'user' ? 'var(--theia-sideBar-background)' : 'var(--theia-editorWidget-background)',
                            fontSize: 12,
                        }}
                        data-testid={`writenow-ai-message-${m.role}`}
                    >
                        {m.content || (m.role === 'assistant' && m.status === 'streaming' ? '…' : '')}
                    </div>
                ))}
            </div>

            <textarea
                ref={onInputRef}
                value={input}
                onChange={(e) => setInput(e.target.value)}
                placeholder="Instruction (optional). If no editor selection, this will be treated as the input text."
                style={{
                    minHeight: 64,
                    resize: 'vertical',
                    padding: 8,
                    borderRadius: 6,
                    border: '1px solid var(--theia-border-color1)',
                    background: 'var(--theia-editor-background)',
                    color: 'var(--theia-ui-font-color1)',
                    fontSize: 12,
                    fontFamily: 'var(--theia-ui-font-family)',
                }}
                data-testid="writenow-ai-input"
                onKeyDown={(e) => {
                    if (e.key === 'Escape') {
                        e.preventDefault();
                        onClosePanel();
                    }
                }}
            />

            {showDiff && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }} data-testid="writenow-ai-diff">
                    <div style={{ display: 'flex', gap: 8 }}>
                        <button type="button" onClick={onDiscard} style={{ height: 28 }} data-testid="writenow-ai-discard">
                            Discard
                        </button>
                        <button type="button" onClick={onApply} style={{ height: 28 }} data-testid="writenow-ai-apply">
                            Apply
                        </button>
                    </div>

                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
                        <div
                            style={{
                                border: '1px solid var(--theia-border-color1)',
                                borderRadius: 6,
                                padding: 8,
                                overflow: 'auto',
                                background: 'var(--theia-editor-background)',
                            }}
                        >
                            <div style={{ fontSize: 11, opacity: 0.8, marginBottom: 6 }}>Original</div>
                            <pre style={{ margin: 0, whiteSpace: 'pre-wrap', wordBreak: 'break-word', fontSize: 12 }}>
                                {diffChars(selection!.text, suggestedText).map((seg, idx) => {
                                    if (seg.op === 'insert') return null;
                                    const background = seg.op === 'delete' ? 'rgba(255, 0, 0, 0.15)' : 'transparent';
                                    const textDecoration = seg.op === 'delete' ? 'line-through' : 'none';
                                    return (
                                        <span key={idx} style={{ background, textDecoration }}>
                                            {seg.text}
                                        </span>
                                    );
                                })}
                            </pre>
                        </div>

                        <div
                            style={{
                                border: '1px solid var(--theia-border-color1)',
                                borderRadius: 6,
                                padding: 8,
                                overflow: 'auto',
                                background: 'var(--theia-editor-background)',
                            }}
                        >
                            <div style={{ fontSize: 11, opacity: 0.8, marginBottom: 6 }}>Suggested</div>
                            <pre style={{ margin: 0, whiteSpace: 'pre-wrap', wordBreak: 'break-word', fontSize: 12 }}>
                                {diffChars(selection!.text, suggestedText).map((seg, idx) => {
                                    if (seg.op === 'delete') return null;
                                    const background = seg.op === 'insert' ? 'rgba(0, 255, 0, 0.12)' : 'transparent';
                                    return (
                                        <span key={idx} style={{ background }}>
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
                onInputRef={(el) => {
                    this.inputEl = el;
                }}
                onClosePanel={() => this.close()}
            />
        );
    }
}
