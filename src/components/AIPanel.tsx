import React, { useState, useRef, useEffect } from 'react';
import { Send, Plus, MoreHorizontal, ChevronDown, Check, Sparkles, Wand2, BookOpen, Languages, ChevronUp } from 'lucide-react';

interface Message {
  id: string;
  role: 'user' | 'assistant';
  content: string;
}

interface Skill {
  id: string;
  name: string;
  description: string;
  icon: React.ReactNode;
}

type ChatMode = 'agent' | 'auto' | 'normal';

export function AIPanel() {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [chatMode, setChatMode] = useState<ChatMode>('agent');
  const [selectedModel, setSelectedModel] = useState('claude-sonnet-3.5');
  const [showModeMenu, setShowModeMenu] = useState(false);
  const [showModelMenu, setShowModelMenu] = useState(false);
  const [showSkills, setShowSkills] = useState(true);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const modeMenuRef = useRef<HTMLDivElement>(null);
  const modelMenuRef = useRef<HTMLDivElement>(null);

  const models = [
    { id: 'claude-sonnet-3.5', name: 'claude-sonnet-3.5' },
    { id: 'gpt-4', name: 'gpt-4' },
    { id: 'gpt-4-turbo', name: 'gpt-4-turbo' },
  ];

  const skills: Skill[] = [
    { 
      id: '1', 
      name: '生成大纲', 
      description: '根据主题生成文章大纲',
      icon: <Sparkles className="w-4 h-4" />
    },
    { 
      id: '2', 
      name: '润色文本', 
      description: '优化文本表达和用词',
      icon: <Wand2 className="w-4 h-4" />
    },
    { 
      id: '3', 
      name: '扩写内容', 
      description: '扩展和丰富现有内容',
      icon: <BookOpen className="w-4 h-4" />
    },
    { 
      id: '4', 
      name: '改写风格', 
      description: '转换文本风格和语气',
      icon: <Languages className="w-4 h-4" />
    },
  ];

  const handleSend = () => {
    if (!input.trim()) return;
    const userMessage: Message = {
      id: Date.now().toString(),
      role: 'user',
      content: input,
    };
    setMessages([...messages, userMessage]);
    setInput('');

    setTimeout(() => {
      const aiMessage: Message = {
        id: (Date.now() + 1).toString(),
        role: 'assistant',
        content: '我理解了您的需求，让我来帮助您完成这个任务。',
      };
      setMessages((prev) => [...prev, aiMessage]);
    }, 500);
  };

  const handleSkillClick = (skill: Skill) => {
    setInput(`使用 ${skill.name}: `);
    textareaRef.current?.focus();
  };

  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = '60px';
      const scrollHeight = textareaRef.current.scrollHeight;
      textareaRef.current.style.height = Math.min(scrollHeight, 180) + 'px';
    }
  }, [input]);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (modeMenuRef.current && !modeMenuRef.current.contains(e.target as Node)) {
        setShowModeMenu(false);
      }
      if (modelMenuRef.current && !modelMenuRef.current.contains(e.target as Node)) {
        setShowModelMenu(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const currentModel = models.find(m => m.id === selectedModel) || models[0];

  return (
    <div className="w-[340px] bg-[var(--bg-secondary)] border-l border-[var(--border-subtle)] flex flex-col h-full">
      {/* Header */}
      <div className="h-11 flex items-center justify-between px-3 border-b border-[var(--border-subtle)] flex-shrink-0">
        <span className="text-[13px] text-[var(--text-primary)] font-medium">Chat</span>
        <div className="flex items-center gap-1">
          <button className="w-7 h-7 flex items-center justify-center rounded hover:bg-[var(--bg-hover)] text-[var(--text-tertiary)] hover:text-[var(--text-secondary)] transition-colors">
            <Plus className="w-4 h-4" />
          </button>
          <button className="w-7 h-7 flex items-center justify-center rounded hover:bg-[var(--bg-hover)] text-[var(--text-tertiary)] hover:text-[var(--text-secondary)] transition-colors">
            <MoreHorizontal className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto px-3 py-4">
        {messages.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full text-center">
            <div className="text-[13px] text-[var(--text-tertiary)] mb-1">开始对话</div>
            <div className="text-[11px] text-[var(--text-tertiary)]">使用下方 SKILL 或直接输入</div>
          </div>
        ) : (
          <div className="space-y-4">
            {messages.map((message) => (
              <div key={message.id} className="group">
                <div className="text-[11px] text-[var(--text-tertiary)] mb-1 font-medium">
                  {message.role === 'user' ? 'You' : 'AI'}
                </div>
                <div className="text-[13px] text-[var(--text-secondary)] leading-relaxed">
                  {message.content}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* SKILL Section */}
      <div className="border-t border-[var(--border-subtle)] bg-[var(--bg-secondary)]">
        <button
          onClick={() => setShowSkills(!showSkills)}
          className="w-full px-3 py-2.5 flex items-center justify-between hover:bg-[var(--bg-hover)] transition-colors"
        >
          <div className="flex items-center gap-2">
            <Sparkles className="w-4 h-4 text-[var(--accent-primary)]" />
            <span className="text-xs font-medium uppercase tracking-wide text-[var(--text-secondary)]">
              SKILL
            </span>
          </div>
          {showSkills ? (
            <ChevronDown className="w-4 h-4 text-[var(--text-tertiary)]" />
          ) : (
            <ChevronUp className="w-4 h-4 text-[var(--text-tertiary)]" />
          )}
        </button>

        {showSkills && (
          <div className="px-3 pb-3">
            <div className="flex flex-col gap-1">
              {skills.map((skill) => (
                <button
                  key={skill.id}
                  onClick={() => handleSkillClick(skill)}
                  className="flex items-center gap-2 p-2 rounded-md hover:bg-[var(--bg-hover)] transition-colors text-left group"
                  title={skill.description}
                >
                  <div className="w-7 h-7 rounded-md bg-[var(--bg-tertiary)] border border-[var(--border-subtle)] flex items-center justify-center text-[var(--text-tertiary)] group-hover:text-[var(--accent-primary)] transition-colors">
                    {skill.icon}
                  </div>
                  <div className="min-w-0">
                    <div className="text-[13px] text-[var(--text-secondary)] leading-tight">{skill.name}</div>
                    <div className="text-xs text-[var(--text-tertiary)] truncate">{skill.description}</div>
                  </div>
                </button>
              ))}
            </div>
            
            <div className="mt-2 pt-2 border-t border-[var(--border-subtle)]">
              <button className="w-full h-8 px-3 bg-[var(--bg-tertiary)] hover:bg-[var(--bg-hover)] rounded-md text-xs text-[var(--text-secondary)] transition-colors flex items-center justify-center gap-2">
                <Plus className="w-3.5 h-3.5" />
                创建新 SKILL
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Input */}
      <div className="border-t border-[var(--border-subtle)] p-3 flex-shrink-0">
        <div className="wn-input-shell">
          <textarea
            ref={textareaRef}
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) {
                e.preventDefault();
                handleSend();
              }
            }}
            placeholder="Ask anything..."
            className="w-full bg-transparent text-[13px] text-[var(--text-primary)] placeholder-[var(--text-tertiary)] outline-none resize-none px-3 py-2.5 min-h-[60px]"
            rows={1}
          />
          
          {/* Controls */}
          <div className="flex items-center justify-between px-2 pb-2 gap-2">
            <div className="flex items-center gap-1">
              {/* Mode Selector */}
              <div className="relative" ref={modeMenuRef}>
                <button
                  onClick={() => setShowModeMenu(!showModeMenu)}
                  className="flex items-center gap-1 px-2 h-6 rounded hover:bg-[var(--bg-hover)] transition-colors text-[11px] text-[var(--text-secondary)]"
                >
                  <span>{chatMode}</span>
                  <ChevronDown className="w-3 h-3" />
                </button>
                {showModeMenu && (
                  <div className="absolute bottom-full left-0 mb-1 w-32 wn-elevated py-1 z-50">
                    {(['agent', 'auto', 'normal'] as ChatMode[]).map((mode) => (
                      <button
                        key={mode}
                        onClick={() => {
                          setChatMode(mode);
                          setShowModeMenu(false);
                        }}
                        className="w-full flex items-center justify-between px-3 py-1.5 text-[11px] text-[var(--text-secondary)] hover:bg-[var(--bg-hover)] transition-colors"
                      >
                        <span>{mode}</span>
                        {chatMode === mode && <Check className="w-3 h-3 text-[var(--accent-primary)]" />}
                      </button>
                    ))}
                  </div>
                )}
              </div>

              {/* Model Selector */}
              <div className="relative" ref={modelMenuRef}>
                <button
                  onClick={() => setShowModelMenu(!showModelMenu)}
                  className="flex items-center gap-1 px-2 h-6 rounded hover:bg-[var(--bg-hover)] transition-colors text-[11px] text-[var(--text-secondary)] max-w-[120px]"
                >
                  <span className="truncate">{currentModel.name}</span>
                  <ChevronDown className="w-3 h-3 flex-shrink-0" />
                </button>
                {showModelMenu && (
                  <div className="absolute bottom-full left-0 mb-1 w-44 wn-elevated py-1 z-50">
                    {models.map((model) => (
                      <button
                        key={model.id}
                        onClick={() => {
                          setSelectedModel(model.id);
                          setShowModelMenu(false);
                        }}
                        className="w-full flex items-center justify-between px-3 py-1.5 text-[11px] text-[var(--text-secondary)] hover:bg-[var(--bg-hover)] transition-colors"
                      >
                        <span>{model.name}</span>
                        {selectedModel === model.id && <Check className="w-3 h-3 text-[var(--accent-primary)]" />}
                      </button>
                    ))}
                  </div>
                )}
              </div>
            </div>

            {/* Send */}
            <button
              onClick={handleSend}
              disabled={!input.trim()}
              className="h-7 px-2.5 rounded-md bg-[var(--accent-primary)] hover:bg-[var(--accent-hover)] disabled:opacity-40 disabled:pointer-events-none text-white text-xs font-medium transition-colors flex items-center gap-1"
            >
              <Send className="w-3 h-3" />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
