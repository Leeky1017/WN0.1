/**
 * AIPanel
 * Why: Deliver Cursor-style AI chat, streaming, diff preview, and slash commands inside the right panel.
 * Figma 样式改造：简化 Header + 输入框内嵌 Mode/SKILL/Model 选择器
 */

import { useCallback, useEffect, useRef, useState } from 'react';
import {
  Plus,
  MoreHorizontal,
  ChevronDown,
  Check,
  Send,
  AlertTriangle,
  Infinity as InfinityIcon,
  Sparkles,
  Wand2,
  BookOpen,
  Languages,
  RefreshCw,
  Wifi,
  WifiOff,
} from 'lucide-react';

import { ScrollArea } from '@/components/ui/scroll-area';
import { mergeDiff } from '@/lib/diff/diffUtils';
import { useAIStore } from '@/stores/aiStore';
import { useEditorRuntimeStore } from '@/stores/editorRuntimeStore';
import { useAISkill } from './useAISkill';
import { MessageList } from './components/MessageList';
import { ThinkingIndicator } from './components/ThinkingIndicator';
import { DiffView } from './components/DiffView';

type ChatMode = 'agent' | 'plan' | 'debug' | 'ask';

interface BuiltInSkill {
  id: string;
  name: string;
  description: string;
  icon: React.ReactNode;
}

const builtInSkills: BuiltInSkill[] = [
  {
    id: 'generate-outline',
    name: '生成大纲',
    description: '根据主题生成文章大纲',
    icon: <Sparkles className="w-3.5 h-3.5" />,
  },
  {
    id: 'polish-text',
    name: '润色文本',
    description: '优化文本表达和用词',
    icon: <Wand2 className="w-3.5 h-3.5" />,
  },
  {
    id: 'expand-content',
    name: '扩写内容',
    description: '扩展和丰富现有内容',
    icon: <BookOpen className="w-3.5 h-3.5" />,
  },
  {
    id: 'rewrite-style',
    name: '改写风格',
    description: '转换文本风格和语气',
    icon: <Languages className="w-3.5 h-3.5" />,
  },
];

const models = [
  { id: 'opus-4.5', name: 'Opus 4.5' },
  { id: 'gpt-4', name: 'GPT-4' },
  { id: 'gpt-4-turbo', name: 'GPT-4 Turbo' },
  { id: 'claude-sonnet-3.5', name: 'Claude Sonnet 3.5' },
];

import { aiClient } from '@/lib/rpc/ai-client';
import { skillsClient } from '@/lib/rpc/skills-client';

/**
 * AI panel component rendered in the right dock.
 */
export function AIPanel() {
  const { aiStatus, skillsStatus, skillsLoading, skillsError, sendMessage, cancelRun } = useAISkill();
  const [reconnecting, setReconnecting] = useState(false);

  const messages = useAIStore((state) => state.messages);
  const input = useAIStore((state) => state.input);
  const status = useAIStore((state) => state.status);
  const diff = useAIStore((state) => state.diff);
  const lastError = useAIStore((state) => state.lastError);
  const skills = useAIStore((state) => state.skills);
  const selectedSkillId = useAIStore((state) => state.selectedSkillId);

  const setInput = useAIStore((state) => state.setInput);
  const setSelectedSkillId = useAIStore((state) => state.setSelectedSkillId);
  const setDiff = useAIStore((state) => state.setDiff);
  const resetError = useAIStore((state) => state.resetError);

  const [panelError, setPanelError] = useState<string | null>(null);
  const [chatMode, setChatMode] = useState<ChatMode>('agent');
  const [selectedModel, setSelectedModel] = useState('opus-4.5');
  const [showModeMenu, setShowModeMenu] = useState(false);
  const [showModelMenu, setShowModelMenu] = useState(false);
  const [showSkillMenu, setShowSkillMenu] = useState(false);

  const endRef = useRef<HTMLDivElement | null>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const modeMenuRef = useRef<HTMLDivElement>(null);
  const modelMenuRef = useRef<HTMLDivElement>(null);
  const skillMenuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: 'smooth', block: 'end' });
  }, [messages, diff, status]);

  useEffect(() => {
    if (status !== 'thinking' && status !== 'streaming') return;
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key !== 'Escape') return;
      event.preventDefault();
      void cancelRun();
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [cancelRun, status]);

  // Auto-resize textarea
  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = '60px';
      const scrollHeight = textareaRef.current.scrollHeight;
      textareaRef.current.style.height = Math.min(scrollHeight, 180) + 'px';
    }
  }, [input]);

  // Close menus on click outside
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (
        modeMenuRef.current &&
        !modeMenuRef.current.contains(e.target as Node)
      ) {
        setShowModeMenu(false);
      }
      if (
        modelMenuRef.current &&
        !modelMenuRef.current.contains(e.target as Node)
      ) {
        setShowModelMenu(false);
      }
      if (
        skillMenuRef.current &&
        !skillMenuRef.current.contains(e.target as Node)
      ) {
        setShowSkillMenu(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleSend = useCallback(async () => {
    if (!input.trim()) return;
    setPanelError(null);
    resetError();
    await sendMessage(input, { skillId: selectedSkillId ?? undefined });
  }, [input, resetError, sendMessage, selectedSkillId]);

  const handleSkillClick = useCallback(
    (skill: BuiltInSkill) => {
      setInput(`使用 ${skill.name}: `);
      textareaRef.current?.focus();
      setShowSkillMenu(false);
    },
    [setInput],
  );

  // 手动重连
  const handleReconnect = useCallback(async () => {
    setReconnecting(true);
    try {
      await Promise.all([
        aiClient.connect(),
        skillsClient.connect(),
      ]);
    } catch (error) {
      console.error('[AIPanel] Reconnect failed:', error);
    } finally {
      setReconnecting(false);
    }
  }, []);

  // 判断是否已连接
  const isConnected = aiStatus === 'connected' && skillsStatus === 'connected';
  const isConnecting = aiStatus === 'connecting' || skillsStatus === 'connecting' || reconnecting;
  const hasConnectionError = aiStatus === 'error' || skillsStatus === 'error' || aiStatus === 'disconnected' || skillsStatus === 'disconnected';

  const handleAcceptDiff = useCallback(() => {
    if (!diff) return;
    setPanelError(null);

    try {
      const merged = mergeDiff(
        diff.originalText,
        diff.suggestedText,
        diff.accepted,
      );
      const {
        activeEditor,
        activeFilePath,
        selection: runtimeSelection,
      } = useEditorRuntimeStore.getState();
      const targetSelection = diff.selection ?? runtimeSelection;
      if (!activeEditor) {
        setPanelError('当前没有可应用的编辑器');
        return;
      }

      if (!targetSelection) {
        activeEditor.commands.setContent(merged, { contentType: 'markdown' });
      } else {
        if (activeFilePath && targetSelection.filePath !== activeFilePath) {
          setPanelError('AI 修改来源与当前编辑器不一致');
          return;
        }
        activeEditor
          .chain()
          .focus()
          .insertContentAt(
            { from: targetSelection.from, to: targetSelection.to },
            merged,
          )
          .run();
      }
      setDiff(null);
    } catch (error) {
      const message = error instanceof Error ? error.message : '应用失败';
      setPanelError(message);
    }
  }, [diff, setDiff]);

  const handleRejectDiff = useCallback(() => {
    setDiff(null);
  }, [setDiff]);

  useEffect(() => {
    if (!diff) return;

    const handleDiffHotkeys = (event: KeyboardEvent) => {
      if (!(event.metaKey || event.ctrlKey)) return;
      if (event.key === 'Enter') {
        event.preventDefault();
        handleAcceptDiff();
      }
      if (event.key === 'Backspace') {
        event.preventDefault();
        handleRejectDiff();
      }
    };

    window.addEventListener('keydown', handleDiffHotkeys);
    return () => window.removeEventListener('keydown', handleDiffHotkeys);
  }, [diff, handleAcceptDiff, handleRejectDiff]);

  const handleToggleHunk = useCallback(
    (index: number) => {
      if (!diff) return;
      const next = diff.accepted.slice();
      next[index] = !next[index];
      setDiff({ ...diff, accepted: next });
    },
    [diff, setDiff],
  );

  const handleAcceptAll = useCallback(() => {
    if (!diff) return;
    setDiff({ ...diff, accepted: diff.accepted.map(() => true) });
  }, [diff, setDiff]);

  const handleRejectAll = useCallback(() => {
    if (!diff) return;
    setDiff({ ...diff, accepted: diff.accepted.map(() => false) });
  }, [diff, setDiff]);

  const currentModel = models.find((m) => m.id === selectedModel) || models[0];

  return (
    <div
      className="h-full flex flex-col bg-[var(--bg-base)]"
      data-testid="layout-ai-panel"
    >
      {/* Header - 精致样式 */}
      <div className="h-10 shrink-0 flex items-center justify-between px-3 border-b border-[var(--border-subtle)]">
        <div className="flex items-center gap-2.5">
          <span className="text-[10px] font-semibold uppercase tracking-wider text-[var(--fg-muted)]">
            Chat
          </span>
          {/* 连接状态指示器 */}
          <div
            data-testid="ai-connection-status"
            className={`flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] transition-all duration-200 ${
              isConnected
                ? 'text-[var(--success)] bg-[var(--success-muted)]'
                : isConnecting
                ? 'text-[var(--warning)] bg-[var(--warning-muted)]'
                : 'text-[var(--error)] bg-[var(--error-muted)]'
            }`}
            title={isConnected ? '已连接' : isConnecting ? '连接中...' : '未连接'}
          >
            {isConnected ? (
              <Wifi className="w-3 h-3" />
            ) : isConnecting ? (
              <RefreshCw className="w-3 h-3 animate-spin" />
            ) : (
              <WifiOff className="w-3 h-3" />
            )}
          </div>
        </div>
        <div className="flex items-center gap-0.5">
          <button className="w-7 h-7 flex items-center justify-center rounded-md hover:bg-[var(--bg-hover)] text-[var(--fg-subtle)] hover:text-[var(--fg-muted)] transition-all duration-[100ms]">
            <Plus className="w-4 h-4" />
          </button>
          <button className="w-7 h-7 flex items-center justify-center rounded-md hover:bg-[var(--bg-hover)] text-[var(--fg-subtle)] hover:text-[var(--fg-muted)] transition-all duration-[100ms]">
            <MoreHorizontal className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* 连接断开提示 + 重连按钮 */}
      {hasConnectionError && !isConnecting && (
        <div
          data-testid="ai-connection-error"
          className="px-3 py-2 bg-[var(--warning-muted)] border-b border-[var(--border-subtle)] flex items-center justify-between"
        >
          <div className="flex items-center gap-2 text-[11px] text-[var(--warning)]">
            <WifiOff className="w-3.5 h-3.5" />
            <span>后端未连接</span>
          </div>
          <button
            data-testid="ai-reconnect-button"
            onClick={() => void handleReconnect()}
            disabled={reconnecting}
            className="px-2 py-1 text-[10px] bg-[var(--warning-muted)] hover:bg-[var(--warning)]/20 text-[var(--warning)] rounded-md transition-colors duration-[100ms] disabled:opacity-50"
          >
            {reconnecting ? '重连中...' : '重连'}
          </button>
        </div>
      )}

      {/* Error Messages */}
      {skillsError && (
        <div className="px-4 py-2 text-xs text-[var(--error)] border-b border-[var(--border-subtle)]">
          {skillsError}
        </div>
      )}

      {status === 'canceled' && (
        <div className="px-4 py-2 text-xs text-[var(--fg-subtle)] border-b border-[var(--border-subtle)]">
          已取消
        </div>
      )}

      {panelError && (
        <div className="px-4 py-2 text-xs text-[var(--error)] border-b border-[var(--border-subtle)] flex items-center gap-2">
          <AlertTriangle className="h-3.5 w-3.5" />
          {panelError}
        </div>
      )}

      {lastError && (
        <div className="px-4 py-2 text-xs text-[var(--error)] border-b border-[var(--border-subtle)]">
          {lastError.code}: {lastError.message}
        </div>
      )}

      {/* Messages */}
      <ScrollArea className="flex-1">
        <div className="px-3 py-4">
          {messages.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-full text-center py-16">
              <div className="text-[13px] text-[var(--fg-default)] font-medium mb-1">
                开始对话
              </div>
              <div className="text-[11px] text-[var(--fg-subtle)]">
                使用下方 SKILL 或直接输入
              </div>
            </div>
          ) : (
            <>
              <MessageList messages={messages} />
              {status === 'thinking' && <ThinkingIndicator />}
              {diff && (
                <div className="mt-4">
                  <DiffView
                    diff={diff}
                    onToggleHunk={handleToggleHunk}
                    onAccept={handleAcceptDiff}
                    onReject={handleRejectDiff}
                    onAcceptAll={handleAcceptAll}
                    onRejectAll={handleRejectAll}
                  />
                </div>
              )}
            </>
          )}
          <div ref={endRef} />
        </div>
      </ScrollArea>

      {/* Input Area - Figma 样式 */}
      <div className="border-t border-[var(--border-subtle)] p-3 shrink-0">
        <div className="bg-[var(--bg-surface)] rounded-lg border border-[var(--border-subtle)] focus-within:border-[var(--border-focus)] transition-colors duration-[100ms]">
          {/* Textarea */}
          <textarea
            ref={textareaRef}
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) {
                e.preventDefault();
                void handleSend();
              }
            }}
            placeholder="Ask anything..."
            disabled={skillsLoading || status === 'thinking' || status === 'streaming'}
            className="w-full bg-transparent text-[13px] text-[var(--fg-default)] placeholder-[var(--fg-placeholder)] outline-none resize-none px-3 pt-3 pb-2 min-h-[60px] max-h-[200px]"
            rows={1}
          />

          {/* Bottom Controls - Inside Input Box */}
          <div className="flex items-center justify-between gap-2 px-3 pb-2.5">
            {/* Left: Mode + SKILL + Model */}
            <div className="flex items-center gap-1.5">
              {/* Mode Selector */}
              <div className="relative" ref={modeMenuRef}>
                <button
                  onClick={() => setShowModeMenu(!showModeMenu)}
                  className="flex items-center gap-1 px-2.5 h-7 rounded-md hover:bg-[var(--bg-hover)] transition-colors duration-[100ms] text-[11px] text-[var(--fg-muted)] font-medium"
                >
                  <InfinityIcon className="w-3 h-3" />
                  <span>
                    {chatMode.charAt(0).toUpperCase() + chatMode.slice(1)}
                  </span>
                  <ChevronDown className="w-3 h-3" />
                </button>
                {showModeMenu && (
                  <div className="absolute bottom-full left-0 mb-2 w-32 bg-[var(--bg-elevated)] border border-[var(--border-subtle)] rounded-lg shadow-lg py-1 z-50">
                    <div className="px-2 py-1.5 text-[10px] text-[var(--fg-subtle)] uppercase tracking-wide font-medium">
                      模式
                    </div>
                    {(['agent', 'plan', 'debug', 'ask'] as ChatMode[]).map(
                      (mode) => (
                        <button
                          key={mode}
                          onClick={() => {
                            setChatMode(mode);
                            setShowModeMenu(false);
                          }}
                          className="w-full flex items-center justify-between px-3 py-2 text-[12px] text-[var(--fg-muted)] hover:bg-[var(--bg-hover)] transition-colors duration-[100ms]"
                        >
                          <span>
                            {mode.charAt(0).toUpperCase() + mode.slice(1)}
                          </span>
                          {chatMode === mode && (
                            <Check className="w-3.5 h-3.5 text-[var(--accent-default)]" />
                          )}
                        </button>
                      ),
                    )}
                  </div>
                )}
              </div>

              {/* SKILL Dropdown */}
              <div className="relative" ref={skillMenuRef}>
                <button
                  onClick={() => setShowSkillMenu(!showSkillMenu)}
                  className="flex items-center gap-1 px-2.5 h-7 rounded-md hover:bg-[var(--bg-hover)] transition-colors duration-[100ms] text-[11px] text-[var(--fg-muted)] font-medium"
                >
                  <span>SKILL</span>
                  <ChevronDown className="w-3 h-3" />
                </button>
                {showSkillMenu && (
                  <div className="absolute bottom-full left-0 mb-2 w-72 bg-[var(--bg-elevated)] border border-[var(--border-subtle)] rounded-lg shadow-lg py-2 z-50">
                    <div className="px-3 py-1 text-[10px] text-[var(--fg-subtle)] uppercase tracking-wide font-medium">
                      快捷技能
                    </div>
                    <div className="px-3 pb-2">
                      <div className="grid grid-cols-2 gap-2">
                        {builtInSkills.map((skill) => (
                          <button
                            key={skill.id}
                            onClick={() => handleSkillClick(skill)}
                            className="flex flex-col items-start p-2 bg-[var(--bg-surface)] hover:bg-[var(--bg-hover)] rounded-md border border-[var(--border-subtle)] transition-colors duration-[100ms] text-left"
                          >
                            <div className="w-full h-10 bg-[var(--bg-elevated)] rounded-md mb-2 flex items-center justify-center text-[var(--accent-default)]">
                              {skill.icon}
                            </div>
                            <div className="w-full">
                              <div className="text-[11px] text-[var(--fg-default)] truncate mb-0.5">
                                {skill.name}
                              </div>
                              <div className="text-[10px] text-[var(--fg-subtle)]">
                                {skill.description}
                              </div>
                            </div>
                          </button>
                        ))}
                      </div>
                    </div>

                    {/* Backend skills */}
                    {skills.filter((s) => s.valid).length > 0 && (
                      <>
                        <div className="px-3 py-1 text-[10px] text-[var(--fg-subtle)] uppercase tracking-wide font-medium border-t border-[var(--border-subtle)] mt-1 pt-2">
                          已加载技能
                        </div>
                        <div className="px-3 pb-2">
                          <div className="grid grid-cols-2 gap-2">
                            {skills
                              .filter((s) => s.valid)
                              .map((skill) => (
                                <button
                                  key={skill.id}
                                  onClick={() => {
                                    setSelectedSkillId(skill.id);
                                    setInput(`使用 ${skill.name}: `);
                                    textareaRef.current?.focus();
                                    setShowSkillMenu(false);
                                  }}
                                  className="flex flex-col items-start p-2 bg-[var(--bg-surface)] hover:bg-[var(--bg-hover)] rounded-md border border-[var(--border-subtle)] transition-colors duration-[100ms] text-left"
                                >
                                  <div className="w-full h-10 bg-[var(--bg-elevated)] rounded-md mb-2 flex items-center justify-center text-[var(--accent-default)]">
                                    <Sparkles className="w-3.5 h-3.5" />
                                  </div>
                                  <div className="w-full">
                                    <div className="text-[11px] text-[var(--fg-default)] truncate mb-0.5">
                                      {skill.name}
                                    </div>
                                    <div className="text-[10px] text-[var(--fg-subtle)] truncate">
                                      {skill.description || skill.id}
                                    </div>
                                  </div>
                                </button>
                              ))}
                          </div>
                        </div>
                      </>
                    )}
                    <div className="border-t border-[var(--border-subtle)] mt-1 pt-1 px-2 pb-1">
                      <button className="w-full h-7 px-2 rounded-md hover:bg-[var(--bg-hover)] text-[11px] text-[var(--fg-muted)] transition-colors duration-[100ms] flex items-center justify-center gap-1.5">
                        <Plus className="w-3.5 h-3.5" />
                        创建新 SKILL
                      </button>
                    </div>
                  </div>
                )}
              </div>

              {/* Model Selector */}
              <div className="relative" ref={modelMenuRef}>
                <button
                  onClick={() => setShowModelMenu(!showModelMenu)}
                  className="flex items-center gap-1 px-2.5 h-7 rounded-md hover:bg-[var(--bg-hover)] transition-colors duration-[100ms] text-[11px] text-[var(--fg-muted)] font-medium"
                >
                  <span className="truncate max-w-[80px]">
                    {currentModel.name}
                  </span>
                  <ChevronDown className="w-3 h-3 flex-shrink-0" />
                </button>
                {showModelMenu && (
                  <div className="absolute bottom-full left-0 mb-2 w-48 bg-[var(--bg-elevated)] border border-[var(--border-subtle)] rounded-lg shadow-lg py-1 z-50">
                    <div className="px-2 py-1.5 text-[10px] text-[var(--fg-subtle)] uppercase tracking-wide font-medium">
                      选择模型
                    </div>
                    {models.map((model) => (
                      <button
                        key={model.id}
                        onClick={() => {
                          setSelectedModel(model.id);
                          setShowModelMenu(false);
                        }}
                        className="w-full flex items-center justify-between px-3 py-2 text-[12px] text-[var(--fg-muted)] hover:bg-[var(--bg-hover)] transition-colors duration-[100ms]"
                      >
                        <span>{model.name}</span>
                        {selectedModel === model.id && (
                          <Check className="w-3.5 h-3.5 text-[var(--accent-default)]" />
                        )}
                      </button>
                    ))}
                  </div>
                )}
              </div>
            </div>

            {/* Right: Send Button */}
            <button
              onClick={() => void handleSend()}
              disabled={
                !input.trim() ||
                skillsLoading ||
                status === 'thinking' ||
                status === 'streaming'
              }
              className="h-7 w-7 rounded-full hover:bg-[var(--bg-hover)] disabled:opacity-40 disabled:pointer-events-none text-[var(--fg-muted)] transition-colors duration-[100ms] flex items-center justify-center flex-shrink-0"
            >
              <Send className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

export default AIPanel;
