import React, { useState, useRef, useEffect } from 'react';
import { Send, Plus, MoreHorizontal, ChevronDown, Check, Sparkles, Wand2, BookOpen, Languages, Play, Zap, Infinity } from 'lucide-react';

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

type ChatMode = 'agent' | 'plan' | 'debug' | 'ask';

export function AIPanel() {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [chatMode, setChatMode] = useState<ChatMode>('agent');
  const [selectedModel, setSelectedModel] = useState('Opus 4.5');
  const [showModeMenu, setShowModeMenu] = useState(false);
  const [showModelMenu, setShowModelMenu] = useState(false);
  const [showSkillMenu, setShowSkillMenu] = useState(false);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const modeMenuRef = useRef<HTMLDivElement>(null);
  const modelMenuRef = useRef<HTMLDivElement>(null);
  const skillMenuRef = useRef<HTMLDivElement>(null);

  const models = [
    { id: 'opus-4.5', name: 'Opus 4.5' },
    { id: 'gpt-4', name: 'GPT-4' },
    { id: 'gpt-4-turbo', name: 'GPT-4 Turbo' },
    { id: 'claude-sonnet-3.5', name: 'Claude Sonnet 3.5' },
  ];

  const skills: Skill[] = [
    { 
      id: '1', 
      name: '生成大纲', 
      description: '根据主题生成文章大纲',
      icon: <Sparkles className="w-3.5 h-3.5" />
    },
    { 
      id: '2', 
      name: '润色文本', 
      description: '优化文本表达和用词',
      icon: <Wand2 className="w-3.5 h-3.5" />
    },
    { 
      id: '3', 
      name: '扩写内容', 
      description: '扩展和丰富现有内容',
      icon: <BookOpen className="w-3.5 h-3.5" />
    },
    { 
      id: '4', 
      name: '改写风格', 
      description: '转换文本风格和语气',
      icon: <Languages className="w-3.5 h-3.5" />
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
      if (skillMenuRef.current && !skillMenuRef.current.contains(e.target as Node)) {
        setShowSkillMenu(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const currentModel = models.find(m => m.id === selectedModel) || models[0];

  return (
    <div className="w-[340px] bg-[var(--bg-primary)] border-l border-[var(--border-default)] flex flex-col h-full">
      {/* Header */}
      <div className="h-11 flex items-center justify-between px-3 border-b border-[var(--border-default)] flex-shrink-0">
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
            <div className="text-[13px] text-[var(--text-primary)] font-medium mb-1">开始对话</div>
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

      {/* Input Area */}
      <div className="border-t border-[var(--border-default)] p-3 flex-shrink-0">
        {/* Input Box with Controls Inside */}
        <div className="bg-[var(--bg-secondary)] rounded-lg border border-[var(--border-default)] focus-within:border-[var(--border-focus)] transition-colors">
          {/* Textarea */}
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
            className="w-full bg-transparent text-[13px] text-[var(--text-primary)] placeholder-[var(--text-tertiary)] outline-none resize-none px-3 pt-3 pb-2 min-h-[60px] max-h-[200px]"
            rows={1}
          />
          
          {/* Bottom Controls - Inside Input Box, No Divider */}
          <div className="flex items-center justify-between gap-2 px-3 pb-2.5">
            {/* Left: Mode + SKILL + Model */}
            <div className="flex items-center gap-1.5">
              {/* Mode Selector */}
              <div className="relative" ref={modeMenuRef}>
                <button
                  onClick={() => setShowModeMenu(!showModeMenu)}
                  className="flex items-center gap-1 px-2.5 h-7 rounded hover:bg-[var(--bg-hover)] transition-colors text-[11px] text-[var(--text-secondary)] font-medium"
                >
                  <Infinity className="w-3 h-3" />
                  <span>{chatMode.charAt(0).toUpperCase() + chatMode.slice(1)}</span>
                  <ChevronDown className="w-3 h-3" />
                </button>
                {showModeMenu && (
                  <div className="absolute bottom-full left-0 mb-2 w-32 bg-[var(--bg-tertiary)] border border-[var(--border-default)] rounded-lg shadow-lg py-1 z-50">
                    <div className="px-2 py-1.5 text-[10px] text-[var(--text-tertiary)] uppercase tracking-wide font-medium">
                      模式
                    </div>
                    {(['agent', 'plan', 'debug', 'ask'] as ChatMode[]).map((mode) => (
                      <button
                        key={mode}
                        onClick={() => {
                          setChatMode(mode);
                          setShowModeMenu(false);
                        }}
                        className="w-full flex items-center justify-between px-3 py-2 text-[12px] text-[var(--text-secondary)] hover:bg-[var(--bg-hover)] transition-colors"
                      >
                        <span>{mode.charAt(0).toUpperCase() + mode.slice(1)}</span>
                        {chatMode === mode && <Check className="w-3.5 h-3.5 text-[var(--accent-primary)]" />}
                      </button>
                    ))}
                  </div>
                )}
              </div>

              {/* SKILL Dropdown */}
              <div className="relative" ref={skillMenuRef}>
                <button
                  onClick={() => setShowSkillMenu(!showSkillMenu)}
                  className="flex items-center gap-1 px-2.5 h-7 rounded hover:bg-[var(--bg-hover)] transition-colors text-[11px] text-[var(--text-secondary)] font-medium"
                >
                  <span>SKILL</span>
                  <ChevronDown className="w-3 h-3" />
                </button>
                {showSkillMenu && (
                  <div className="absolute bottom-full left-0 mb-2 w-56 bg-[var(--bg-tertiary)] border border-[var(--border-default)] rounded-lg shadow-lg py-1 z-50">
                    <div className="px-2 py-1.5 text-[10px] text-[var(--text-tertiary)] uppercase tracking-wide font-medium">
                      快捷技能
                    </div>
                    {skills.map((skill) => (
                      <button
                        key={skill.id}
                        onClick={() => {
                          handleSkillClick(skill);
                          setShowSkillMenu(false);
                        }}
                        className="w-full flex items-center gap-2.5 px-3 py-2 text-[var(--text-secondary)] hover:bg-[var(--bg-hover)] transition-colors"
                      >
                        <div className="w-6 h-6 rounded flex items-center justify-center bg-[var(--bg-primary)] text-[var(--accent-primary)]">
                          {skill.icon}
                        </div>
                        <div className="flex-1 text-left">
                          <div className="text-[12px] font-medium">{skill.name}</div>
                          <div className="text-[10px] text-[var(--text-tertiary)]">{skill.description}</div>
                        </div>
                      </button>
                    ))}
                    <div className="border-t border-[var(--border-default)] mt-1 pt-1 px-2 pb-1">
                      <button className="w-full h-7 px-2 rounded hover:bg-[var(--bg-hover)] text-[11px] text-[var(--text-secondary)] transition-colors flex items-center justify-center gap-1.5">
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
                  className="flex items-center gap-1 px-2.5 h-7 rounded hover:bg-[var(--bg-hover)] transition-colors text-[11px] text-[var(--text-secondary)] font-medium"
                >
                  <span className="truncate max-w-[80px]">{currentModel.name}</span>
                  <ChevronDown className="w-3 h-3 flex-shrink-0" />
                </button>
                {showModelMenu && (
                  <div className="absolute bottom-full left-0 mb-2 w-48 bg-[var(--bg-tertiary)] border border-[var(--border-default)] rounded-lg shadow-lg py-1 z-50">
                    <div className="px-2 py-1.5 text-[10px] text-[var(--text-tertiary)] uppercase tracking-wide font-medium">
                      选择模型
                    </div>
                    {models.map((model) => (
                      <button
                        key={model.id}
                        onClick={() => {
                          setSelectedModel(model.id);
                          setShowModelMenu(false);
                        }}
                        className="w-full flex items-center justify-between px-3 py-2 text-[12px] text-[var(--text-secondary)] hover:bg-[var(--bg-hover)] transition-colors"
                      >
                        <span>{model.name}</span>
                        {selectedModel === model.id && <Check className="w-3.5 h-3.5 text-[var(--accent-primary)]" />}
                      </button>
                    ))}
                  </div>
                )}
              </div>
            </div>

            {/* Right: Send Button */}
            <button
              onClick={handleSend}
              disabled={!input.trim()}
              className="h-7 w-7 rounded-full hover:bg-[var(--bg-hover)] disabled:opacity-40 disabled:pointer-events-none text-[var(--text-secondary)] transition-colors flex items-center justify-center flex-shrink-0"
            >
              <Send className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}